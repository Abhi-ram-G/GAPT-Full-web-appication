from rest_framework import viewsets, permissions, filters, status
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.dateparse import parse_datetime
import uuid
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum, RolePermission, StudentTaskProgress,
    Email, ChatMessage, InstitutionalSheet, ExaminationTest, TestAttendance, StudentSubmission,
    MembershipRequest, AccessMenu, RoleDefinition, RoleMenuPermission, UserMenuPermission, AccessGrantType,
    AssessmentTest, TestQuestion, InvigilatorAssignment, StudentTestSession, QuestionResponse,
    TestSessionLock, ProctoringEvent, EvaluationHistory
)
from .serializers import (
    UserSerializer, CourseSerializer, SubjectSerializer, AcademicTaskSerializer,
    AttendanceRecordSerializer, AttendanceEditRequestSerializer, MarkBatchSerializer,
    MarkRecordSerializer, LeaveRequestSerializer, TimetableSerializer,
    PortalConnectionSerializer, NotificationSerializer, CurriculumEditRequestSerializer,
    SiteSettingsSerializer, AcademicBatchSerializer, BatchCourseCurriculumSerializer,
    RolePermissionSerializer, StudentTaskProgressSerializer,
    EmailSerializer, ChatMessageSerializer, InstitutionalSheetSerializer,
    ExaminationTestSerializer, TestAttendanceSerializer, StudentSubmissionSerializer, CustomTokenSerializer,
    MembershipRequestSerializer, AccessMenuSerializer, RoleDefinitionSerializer,
    RoleMenuPermissionSerializer, UserMenuPermissionSerializer,
    AssessmentTestSerializer, TestQuestionSerializer, InvigilatorAssignmentSerializer,
    QuestionResponseSerializer, StudentTestSessionSerializer,
    TestSessionLockSerializer, ProctoringEventSerializer, EvaluationHistorySerializer
)
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from oauth2_provider.views import TokenView
from oauth2_provider.models import AccessToken, Application, RefreshToken
from oauthlib.common import generate_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
BITSATHY_DOMAIN = "@bitsathy.ac.in"
DEPARTMENT_CODE_MAP = {
    'ad': 'Artificial Intelligence and Data Science',
    'al': 'Artificial Intelligence and Machine Learning',
    'cs': 'Computer Science Engineering',
    'it': 'Information Technology',
    'ag': 'Agricultural Engineering',
    'bm': 'Biomedical Engineering',
    'ec': 'Electronics and Communication Engineering',
    'me': 'Mechanical Engineering',
}
BATCH_DURATION_YEARS = 4

def exchange_google_code(code: str, redirect_uri: str, code_verifier: str | None = None) -> dict:
    body = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    if code_verifier:
        body['code_verifier'] = code_verifier
    if not body['client_id'] or not body['client_secret']:
        raise ValueError('Google OAuth client ID/secret are not configured')
    data = urllib.parse.urlencode(body).encode()
    req = urllib.request.Request(GOOGLE_TOKEN_URL, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        payload = exc.read()
        try:
            detail = json.loads(payload)
            raise ValueError(detail.get('error_description') or detail.get('error') or 'Google token exchange failed')
        except json.JSONDecodeError:
            raise ValueError('Google token exchange failed')

def validate_google_id_token(id_token: str) -> dict:
    if not id_token:
        raise ValueError('Missing Google ID token')
    url = f"{GOOGLE_TOKENINFO_URL}?id_token={urllib.parse.quote(id_token)}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            info = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise ValueError('Invalid Google ID token')
    if info.get('aud') != settings.GOOGLE_CLIENT_ID:
        raise ValueError('Google client mismatch')
    if not info.get('email_verified'):
        raise ValueError('Google email not verified')
    return info

def parse_bitsathy_email(email: str) -> tuple[str, str, str]:
    local = email.split('@')[0]
    fragments = local.split('.', 1)
    name = fragments[0].replace('_', ' ').title()
    tail = fragments[1] if len(fragments) > 1 else ''
    dept_code = tail[:2].lower() if len(tail) >= 2 else ''
    batch_code = tail[2:4] if len(tail) >= 4 else ''
    return name, dept_code, batch_code

def resolve_department(dept_code: str) -> tuple[str, Course | None]:
    dept_name = DEPARTMENT_CODE_MAP.get(dept_code, 'General Engineering')
    course = Course.objects.filter(name__icontains=dept_name.split()[0]).first()
    return dept_name, course

def resolve_batch(batch_code: str) -> AcademicBatch:
    year = timezone.now().year
    if batch_code and batch_code.isdigit():
        year = 2000 + int(batch_code)
    end_year = year + BATCH_DURATION_YEARS
    name = f"{year}-{end_year}"
    batch, _ = AcademicBatch.objects.get_or_create(
        start_year=year,
        end_year=end_year,
        defaults={'name': name, 'batch_type': 'UG'}
    )
    return batch

def provision_bitsathy_user(email: str, profile: dict) -> User:
    parsed_name, dept_code, batch_code = parse_bitsathy_email(email)
    profile_name = profile.get('name') or parsed_name
    dept_name, course = resolve_department(dept_code)
    batch = resolve_batch(batch_code)
    user_defaults = {
        'username': email.lower(),
        'name': profile_name,
        'status': User.Status.APPROVED,
        'role': User.Role.STUDENT,
        'department': dept_name,
        'reg_no': email,
    }
    user, created = User.objects.get_or_create(email=email, defaults=user_defaults)
    if created:
        user.set_unusable_password()
    changed = False
    if user.batch != batch:
        user.batch = batch
        changed = True
    if course and user.course != course:
        user.course = course
        changed = True
    study_year = str(batch.start_year)
    if user.study_year != study_year:
        user.study_year = study_year
        changed = True
    if changed or created:
        user.save()
    return user

def issue_application_tokens(user: User) -> dict:
    client_id = settings.OAUTH2_APPLICATION_CLIENT_ID or settings.GOOGLE_CLIENT_ID
    app = Application.objects.filter(client_id=client_id).first()
    if not app:
        app = Application.objects.first()
        if not app:
            raise ValueError('OAuth2 application is not configured')
    AccessToken.objects.filter(user=user, application=app).delete()
    RefreshToken.objects.filter(user=user, application=app).delete()
    expires = timezone.now() + timedelta(days=7)
    scope = 'read write'
    access_token = AccessToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        expires=expires,
        scope=scope
    )
    refresh_token = RefreshToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        access_token=access_token
    )
    return {
        'access_token': access_token.token,
        'refresh_token': refresh_token.token,
        'expires_in': int((expires - timezone.now()).total_seconds()),
        'scope': scope,
    }

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri') or settings.GOOGLE_OAUTH_REDIRECT_URI
        code_verifier = request.data.get('code_verifier')
        if not code or not redirect_uri:
            return Response({'error': 'code and redirect_uri are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token_resp = exchange_google_code(code, redirect_uri, code_verifier)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        id_token = token_resp.get('id_token')
        if not id_token:
            return Response({'error': 'Google did not return an ID token'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            profile = validate_google_id_token(id_token)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        email = profile.get('email', '').lower()
        if not email.endswith(BITSATHY_DOMAIN):
            return Response({'error': 'Please sign in with your @bitsathy.ac.in address'}, status=status.HTTP_400_BAD_REQUEST)
        user = provision_bitsathy_user(email, profile)
        payload = issue_application_tokens(user)
        user_data = UserSerializer(user).data
        return Response({
            **payload,
            'token_type': 'Bearer',
            'user': user_data,
        }, status=status.HTTP_200_OK)

class FileUploadView(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        return self.upload(request)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        # In a real app, save the file to storage
        # Here we just return a mock URL
        return Response({
            'url': f'http://localhost:8000/media/{file_obj.name}',
            'name': file_obj.name
        })

@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenView(TokenView):
    """
    Thin wrapper so core.urls can import a locally named token view.
    Uses the default OAuth2 provider token handling.
    """
    pass

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['role', 'department']
    search_fields = ['username', 'email', 'name', 'reg_no']

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def perform_create(self, serializer):
        data = serializer.validated_data
        email = data.get('email')
        if not data.get('username') and email:
            data['username'] = email
        user = serializer.save()
        password = self.request.data.get('password')
        if password:
            user.set_password(password)
            user.save()

    @action(detail=False, methods=['post'])
    def assign_students(self, request):
        staff1_id = request.data.get('staff1Id')
        student_ids = request.data.get('studentIds', [])

        if not staff1_id:
            return Response({'error': 'No staff member specified'}, status=status.HTTP_400_BAD_REQUEST)
        if not student_ids:
            return Response({'error': 'No students selected'}, status=status.HTTP_400_BAD_REQUEST)

        staff1 = User.objects.filter(id=staff1_id).first()
        if not staff1:
            return Response({'error': f'Staff with id {staff1_id} not found'}, status=status.HTTP_400_BAD_REQUEST)

        updated = User.objects.filter(id__in=student_ids).update(mentor=staff1)
        return Response({'status': 'assigned', 'updated': updated, 'mentor': staff1.first_name or staff1.username})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        User.objects.filter(id__in=ids).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def academic_data(self, request, pk=None):
        user = self.get_object()

        records = user.attendance_records.all()
        total_records = records.count()
        present_records = records.filter(is_present=True).count()
        attendance_pct = round((present_records / total_records * 100) if total_records > 0 else 85.0, 2)

        if user.role == 'STUDENT':
            marks = MarkRecord.objects.filter(student=user)
            avg_pct = marks.aggregate(Avg('marks'))['marks__avg'] or 0
            cgpa = round(avg_pct / 10, 2)
            return Response({
                'attendance': attendance_pct,
                'cgpa': cgpa,
                'sgpa': cgpa,
                'credits': marks.count() * 3,
                'greenPoints': round(attendance_pct + (cgpa * 10), 0)
            })
        else:
            # For staff/admin — return attendance-based stats
            return Response({
                'attendance': attendance_pct,
                'cgpa': 0,
                'sgpa': 0,
                'credits': 0,
                'greenPoints': round(attendance_pct, 0)
            })

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def persist_structure(self, request):
        from django.core.management import call_command
        try:
            call_command('makemigrations', 'registry', interactive=False)
            call_command('migrate', interactive=False)
        except Exception as e:
            print(f"Auto-migration failed: {e}")
            
        courses_data = request.data.get('courses', [])
        batches_data = request.data.get('batches', [])
        
        for cdata in courses_data:
            c_id = cdata.get('id')
            defaults = {
                'name': cdata.get('name'),
                'degree': cdata.get('degree'),
                'domain': cdata.get('domain', ''),
                'batch_type': cdata.get('batchType', 'UG')
            }
            if isinstance(c_id, str) and not c_id.isdigit():
                course, _ = Course.objects.update_or_create(name=defaults['name'], degree=defaults['degree'], defaults=defaults)
            else:
                course, _ = Course.objects.update_or_create(id=c_id, defaults=defaults)
            
            subjects_data = cdata.get('subjects', [])
            saved_subj_ids = []
            for sdata in subjects_data:
                s_id = sdata.get('id')
                s_code = sdata.get('code', '')
                s_defaults = {
                    'name': sdata.get('name'),
                    'credits': sdata.get('credits', 3),
                    'semester': sdata.get('semester', 1),
                    'lessons_count': sdata.get('lessonsCount', 5),
                    'materials': sdata.get('materials', []),
                    'lesson_names': sdata.get('lessonNames', []),
                    'question_papers': sdata.get('questionPapers', [])
                }
                
                if isinstance(s_id, str) and not s_id.isdigit():
                    subj, _ = Subject.objects.update_or_create(code=s_code, course=course, defaults=s_defaults)
                else:
                    s_defaults['code'] = s_code
                    subj, _ = Subject.objects.update_or_create(id=s_id, course=course, defaults=s_defaults)
                saved_subj_ids.append(subj.id)
                
            Subject.objects.filter(course=course).exclude(id__in=saved_subj_ids).delete()
            
        for bdata in batches_data:
            b_id = bdata.get('id')
            defaults = {
                'name': bdata.get('name'),
                'start_year': bdata.get('startYear'),
                'end_year': bdata.get('endYear'),
                'batch_type': bdata.get('batchType', 'UG')
            }
            if isinstance(b_id, str) and not b_id.isdigit():
                batch, _ = AcademicBatch.objects.update_or_create(name=defaults['name'], start_year=defaults['start_year'], defaults=defaults)
            else:
                batch, _ = AcademicBatch.objects.update_or_create(id=b_id, defaults=defaults)
            
            dept_ids = [d for d in bdata.get('departmentIds', []) if (isinstance(d, int) or (isinstance(d, str) and d.isdigit()))]
            if dept_ids:
                batch.departments.set(dept_ids)

        return Response({'status': 'structure persisted'})

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['course', 'semester']

    @action(detail=True, methods=['post'])
    def update_materials(self, request, pk=None):
        subject = self.get_object()
        materials = request.data.get('materials', [])
        subject.materials = materials
        subject.save()
        return Response({'status': 'materials updated'})

class AcademicTaskViewSet(viewsets.ModelViewSet):
    queryset = AcademicTask.objects.all()
    serializer_class = AcademicTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return AcademicTask.objects.filter(department=user.department, study_year=user.study_year)
        elif user.role == 'STAFF':
            return AcademicTask.objects.filter(staff=user)
        return AcademicTask.objects.all()

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        task = self.get_object()
        student_id = request.data.get('student_id') or request.data.get('studentId')
        progress = request.data.get('progress')
        details = request.data.get('details', '')
        
        obj, created = StudentTaskProgress.objects.update_or_create(
            task=task,
            student_id=student_id,
            defaults={'progress': progress, 'details': details}
        )
        return Response(StudentTaskProgressSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def assign_staff(self, request, pk=None):
        task = self.get_object()
        staff_id = request.data.get('staff_id') or request.data.get('staffId')
        staff = User.objects.get(id=staff_id)
        task.staff = staff
        task.save()
        return Response({'status': 'staff assigned'})

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user', 'date']

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        records_data = request.data # List of records
        responses = []
        for data in records_data:
            user_id = data.get('userId') or data.get('user')
            date = data.get('date')
            defaults = {
                'is_present': data.get('isPresent', data.get('is_present', False)),
                'marked_by_id': data.get('markedBy') or data.get('marked_by')
            }
            record, created = AttendanceRecord.objects.update_or_create(
                user_id=user_id,
                date=date,
                defaults=defaults
            )
            responses.append(AttendanceRecordSerializer(record).data)
        return Response(responses)

class AttendanceEditRequestViewSet(viewsets.ModelViewSet):
    queryset = AttendanceEditRequest.objects.all()
    serializer_class = AttendanceEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def find_request(self, request):
        user_id = request.query_params.get('user_id')
        date = request.query_params.get('date')
        if not user_id or not date:
            return Response(None)
        req = self.get_queryset().filter(requester_id=user_id, date=date).first()
        if req:
            return Response(self.get_serializer(req).data)
        return Response(None)

    @action(detail=False, methods=['post'])
    def upsert(self, request):
        uid = request.data.get('requesterId') or request.data.get('requester_id') or request.data.get('userId') or request.data.get('requester')
        date = request.data.get('date')
        if not uid or not date:
            return Response({'error': 'Missing user or date'}, status=status.HTTP_400_BAD_REQUEST)

        defaults = {
            'admin_approved': request.data.get('adminApproved', request.data.get('admin_approved', False)),
            'dean_approved': request.data.get('deanApproved', request.data.get('dean_approved', False)),
            'hod_approved': request.data.get('hodApproved', request.data.get('hod_approved', False)),
        }
        obj, created = AttendanceEditRequest.objects.update_or_create(
            requester_id=uid,
            date=date,
            defaults=defaults
        )
        return Response(self.get_serializer(obj).data)

class MarkBatchViewSet(viewsets.ModelViewSet):
    queryset = MarkBatch.objects.all()
    serializer_class = MarkBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class MarkRecordViewSet(viewsets.ModelViewSet):
    queryset = MarkRecord.objects.all()
    serializer_class = MarkRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['batch', 'student', 'subject']

    @action(detail=False, methods=['post'])
    def upsert(self, request):
        batch_id = request.data.get('batchId') or request.data.get('batch')
        student_id = request.data.get('studentId') or request.data.get('student')
        subject_id = request.data.get('subject')
        marks = request.data.get('marks')
        max_marks = request.data.get('maxMarks') or request.data.get('max_marks', 100)
        updated_by_id = request.data.get('updatedBy') or request.data.get('updated_by')

        # Try to find subject by ID or Name
        subject = None
        if subject_id:
            subject = Subject.objects.filter(id=subject_id).first()
            if not subject:
                subject = Subject.objects.filter(name=subject_id).first()
        
        if not subject:
            return Response({'error': 'Subject not found'}, status=status.HTTP_400_BAD_REQUEST)

        record, created = MarkRecord.objects.update_or_create(
            batch_id=batch_id,
            student_id=student_id,
            subject=subject,
            defaults={
                'marks': marks,
                'max_marks': max_marks,
                'updated_by_id': updated_by_id
            }
        )
        return Response(self.get_serializer(record).data)

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return LeaveRequest.objects.filter(student=user)
        elif user.role in ['STAFF', 'HOD', 'DEAN']:
            # Staff can see leaves they are mentoring
            return LeaveRequest.objects.filter(mentor=user) | LeaveRequest.objects.all() # Simplification
        return LeaveRequest.objects.all()

class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department', 'study_year']

    @action(detail=False, methods=['post'])
    def upsert(self, request):
        dept = request.data.get('department')
        year = request.data.get('studyYear') or request.data.get('study_year')
        assignments = request.data.get('assignments', [])
        
        # update_or_create logic based on department and year
        obj, created = Timetable.objects.update_or_create(
            department=dept,
            study_year=year,
            defaults={'assignments': assignments}
        )
        return Response(self.get_serializer(obj).data)

class PortalConnectionViewSet(viewsets.ModelViewSet):
    queryset = PortalConnection.objects.all()
    serializer_class = PortalConnectionSerializer
    permission_classes = [permissions.IsAdminUser]

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user) | Notification.objects.filter(user__isnull=True)

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        Notification.objects.filter(user=request.user).delete()
        Notification.objects.filter(user__isnull=True).delete()
        return Response({'status': 'notifications cleared'})

class CurriculumEditRequestViewSet(viewsets.ModelViewSet):
    queryset = CurriculumEditRequest.objects.all()
    serializer_class = CurriculumEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

class SiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({})
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def purge(self, request):
        # Destructive action: clear all data
        MarkRecord.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        AcademicTask.objects.all().delete()
        LeaveRequest.objects.all().delete()
        # Keep Users/Courses/Batches maybe?
        return Response({'status': 'system purged'})

class AcademicBatchViewSet(viewsets.ModelViewSet):
    queryset = AcademicBatch.objects.all()
    serializer_class = AcademicBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class BatchCourseCurriculumViewSet(viewsets.ModelViewSet):
    queryset = BatchCourseCurriculum.objects.all()
    serializer_class = BatchCourseCurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['batch', 'course']

    @action(detail=False, methods=['post'])
    def update_status(self, request):
        batch_id = request.data.get('batch_id')
        course_id = request.data.get('course_id')
        status = request.data.get('status')
        
        obj, created = BatchCourseCurriculum.objects.update_or_create(
            batch_id=batch_id,
            course_id=course_id,
            defaults={'status': status}
        )
        return Response(self.get_serializer(obj).data)

class RolePermissionViewSet(viewsets.ModelViewSet):
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        perms = RolePermission.objects.all()
        result = {}
        for p in perms:
            if p.role not in result:
                result[p.role] = {}
            result[p.role][p.feature] = p.level
        return Response(result)

    @action(detail=False, methods=['post'])
    def update_permission(self, request):
        role = request.data.get('role')
        feature = request.data.get('feature')
        level = request.data.get('level')
        
        perm, created = RolePermission.objects.update_or_create(
            role=role,
            feature=feature,
            defaults={'level': level}
        )
        return Response(self.get_serializer(perm).data)

DEFAULT_ROLES = [
    {'id': 'ADMIN', 'label': 'Administrator', 'priority': 0},
    {'id': 'DEAN', 'label': 'Dean', 'priority': 1},
    {'id': 'HOD', 'label': 'Head of Department', 'priority': 2},
    {'id': 'STAFF', 'label': 'Staff', 'priority': 3},
    {'id': 'STUDENT', 'label': 'Student', 'priority': 4}
]

MENU_CATALOG = [
    {'slug': 'member-directory', 'name': 'Member Directory', 'category': 'Governance', 'description': 'Institutional registry', 'path': '/admin/users', 'order': 10},
    {'slug': 'staff-directory', 'name': 'Staff Directory', 'category': 'Governance', 'description': 'Institutional registry', 'path': '/admin/staff-directory', 'order': 20},
    {'slug': 'student-directory', 'name': 'Student Directory', 'category': 'Governance', 'description': 'Institutional registry', 'path': '/admin/student-directory', 'order': 30},
    {'slug': 'cohort-registry', 'name': 'Cohort Registry', 'category': 'Governance', 'description': 'Academic division control', 'path': '/admin/departments', 'order': 40},
    {'slug': 'access-requests', 'name': 'Access Requests', 'category': 'Governance', 'description': 'Pending approvals', 'path': '/admin/requests', 'order': 50},
    {'slug': 'identity-creator', 'name': 'Identity Creator', 'category': 'Governance', 'description': 'Create mail identities', 'path': '/admin/create-mail', 'order': 60},
    {'slug': 'interlink-control', 'name': 'Interlink Control', 'category': 'Governance', 'description': 'Manage portal connections', 'path': '/admin/portal-connection', 'order': 70},
    {'slug': 'branding-hub', 'name': 'Branding Hub', 'category': 'Governance', 'description': 'Edit brand assets', 'path': '/admin/edit-website', 'order': 80},
    {'slug': 'access-matrix', 'name': 'Access Matrix', 'category': 'Governance', 'description': 'Permission matrix', 'path': '/admin/access', 'order': 90},
    {'slug': 'grand-access', 'name': 'Grand Access', 'category': 'Governance', 'description': 'Governance control', 'path': '/admin/grand-access', 'order': 100},
    {'slug': 'update-marks', 'name': 'Update Marks', 'category': 'Academic Ops', 'description': 'Mark entry', 'path': '/staff/mark-entry', 'order': 110},
    {'slug': 'daily-attendance', 'name': 'Daily Attendance', 'category': 'Academic Ops', 'description': 'Track attendance', 'path': '/staff/attendance', 'order': 120},
    {'slug': 'study-materials', 'name': 'Study Materials', 'category': 'Academic Ops', 'description': 'Resource hub', 'path': '/student/materials', 'order': 130},
    {'slug': 'staff-assignment', 'name': 'Staff Assignment', 'category': 'Academic Ops', 'description': 'Mentor assignment', 'path': '/staff/assignments', 'order': 140},
    {'slug': 'leave-management', 'name': 'Leave Management', 'category': 'Academic Ops', 'description': 'Approve leaves', 'path': '/staff/leave-approval', 'order': 150},
    {'slug': 'assignments', 'name': 'Tasks', 'category': 'Academic Ops', 'description': 'Academic tasks', 'path': '/staff/task-registry', 'order': 160},
    {'slug': 'academic-analytics', 'name': 'Analytics', 'category': 'Academic Ops', 'description': 'Performance insights', 'path': '/analytics/student-tracker', 'order': 170},
    {'slug': 'green-insights', 'name': 'Green Insights', 'category': 'Academic Ops', 'description': 'Sustainability metrics', 'path': '/analytics/student-tracker', 'order': 180},
    {'slug': 'mentor-assignment', 'name': 'Mentor Assignment', 'category': 'Academic Ops', 'description': 'Mentor routing', 'path': '/hod/assign-students', 'order': 190},
    {'slug': 'chat-hub', 'name': 'Chat Hub', 'category': 'Academic Ops', 'description': 'Real-time chat', 'path': '/chat', 'order': 200},
    {'slug': 'bitmail', 'name': 'BITmail', 'category': 'Academic Ops', 'description': 'Institutional mail', 'path': '/email', 'order': 210},
    {'slug': 'institutional-sheets', 'name': 'Institutional Sheets', 'category': 'Support', 'description': 'Spreadsheet data', 'path': '/spreadsheet', 'order': 220},
    {'slug': 'profile-editor', 'name': 'Profile Editor', 'category': 'Support', 'description': 'Edit profile', 'path': '/edit-profile', 'order': 230},
    {'slug': 'examination-portal', 'name': 'Examination Portal', 'category': 'Support', 'description': 'Exams dashboard', 'path': '/examination-portal', 'order': 240}
]

ROLE_DEFAULT_ACCESS = {
    'ADMIN': AccessGrantType.FULL,
    'DEAN': AccessGrantType.FULL,
    'HOD': AccessGrantType.FULL,
    'STAFF': AccessGrantType.VIEW_ALL,
    'STUDENT': AccessGrantType.VIEW_ALL
}

def _ensure_roles():
    for entry in DEFAULT_ROLES:
        RoleDefinition.objects.update_or_create(
            id=entry['id'],
            defaults={'label': entry['label'], 'priority': entry['priority']}
        )

def _ensure_menus():
    for entry in MENU_CATALOG:
        data = entry.copy()
        slug = data.pop('slug')
        AccessMenu.objects.update_or_create(
            slug=slug,
            defaults=data
        )

def _ensure_role_permissions():
    for role in RoleDefinition.objects.all():
        fallback = ROLE_DEFAULT_ACCESS.get(role.id, AccessGrantType.VIEW_ALL)
        for menu in AccessMenu.objects.all():
            RoleMenuPermission.objects.get_or_create(
                role=role,
                menu=menu,
                defaults={'access_type': fallback}
            )

class AccessControlViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def _ensure_catalog(self):
        _ensure_roles()
        _ensure_menus()
        _ensure_role_permissions()

    @action(detail=False, methods=['get'])
    def menus(self, request):
        self._ensure_catalog()
        menus = AccessMenu.objects.all()
        serializer = AccessMenuSerializer(menus, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def roles(self, request):
        self._ensure_catalog()
        serializer = RoleDefinitionSerializer(RoleDefinition.objects.all(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'permissions/role/(?P<role_id>[^/.]+)')
    def role_permissions(self, request, role_id=None):
        self._ensure_catalog()
        perms = RoleMenuPermission.objects.filter(role__id=role_id)
        serializer = RoleMenuPermissionSerializer(perms, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'permissions/user/(?P<user_id>[^/.]+)')
    def user_permissions(self, request, user_id=None):
        perms = UserMenuPermission.objects.filter(user__id=user_id)
        serializer = UserMenuPermissionSerializer(perms, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='permissions/update_user')
    def update_user_permissions(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        permissions = request.data.get('permissions', [])
        saved = []
        for entry in permissions:
            menu_id = entry.get('menuId')
            access_type = entry.get('accessType')
            if access_type not in AccessGrantType.values:
                continue
            menu = AccessMenu.objects.filter(id=menu_id).first()
            if not menu:
                continue
            perm, _ = UserMenuPermission.objects.update_or_create(
                user=user,
                menu=menu,
                defaults={'access_type': access_type}
            )
            saved.append(perm)
        serializer = UserMenuPermissionSerializer(saved, many=True)
        return Response(serializer.data)


class AssessmentTestViewSet(viewsets.ModelViewSet):
    queryset = AssessmentTest.objects.all()
    serializer_class = AssessmentTestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        role_def = RoleDefinition.objects.filter(id=self.request.user.role).first()
        if role_def:
            qs = qs.filter(allowed_roles=role_def)
        return qs.distinct()

    @action(detail=True, methods=['post'])
    def mark_attendance(self, request, pk=None):
        test = self.get_object()
        student_id = request.data.get('student_id')
        invig = request.user
        assignment = InvigilatorAssignment.objects.filter(test=test, invigilator=invig).first()
        if not assignment:
            return Response({'detail': 'Invigilator not assigned'}, status=status.HTTP_403_FORBIDDEN)
        if assignment.status != InvigilatorAssignment.AssignmentStatus.ACCEPTED:
            return Response({'detail': 'Assignment pending acceptance'}, status=status.HTTP_403_FORBIDDEN)
        att_defaults = {
            'is_present': True,
            'assigned_invigilator': invig,
            'marked_by': invig,
            'attendance_timestamp': timezone.now(),
            'attendance_metadata': request.data.get('metadata', {}),
            'proof_url': request.data.get('proofUrl') or request.data.get('proof_url'),
            'location': request.data.get('location'),
            'invigilator_notes': request.data.get('notes') or request.data.get('invigilatorNotes', '')
        }
        TestAttendance.objects.update_or_create(
            test=test,
            student_id=student_id,
            defaults=att_defaults
        )
        session, _ = StudentTestSession.objects.get_or_create(
            test=test,
            student_id=student_id,
            defaults={'invigilator': invig}
        )
        session.invigilator_assigned = True
        session.status = StudentTestSession.Status.PRESENT
        session.invigilator = invig
        session.save()
        return Response(StudentTestSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        test = self.get_object()
        session = StudentTestSession.objects.filter(test=test, student=request.user).first()
        attendance = TestAttendance.objects.filter(test=test, student=request.user, is_present=True).first()
        if not attendance:
            return Response({'detail': 'Attendance pending'}, status=status.HTTP_400_BAD_REQUEST)
        lock = getattr(session, 'lock_record', None)
        if lock and lock.is_active:
            return Response({'detail': 'Session locked by invigilator'}, status=status.HTTP_403_FORBIDDEN)
        if not session or session.status not in (StudentTestSession.Status.PRESENT,):
            return Response({'detail': 'Attendance pending'}, status=status.HTTP_400_BAD_REQUEST)
        if session.started_at:
            return Response({'detail': 'Already started'}, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        expires = now + timezone.timedelta(minutes=test.duration_minutes)
        session.started_at = now
        session.expires_at = expires
        session.status = StudentTestSession.Status.ONGOING
        session.save()
        return Response({'session_id': session.id, 'expires_at': expires})

    @action(detail=True, methods=['post'])
    def submit_responses(self, request, pk=None):
        test = self.get_object()
        session = StudentTestSession.objects.filter(test=test, student=request.user).first()
        if not session or session.status != StudentTestSession.Status.ONGOING:
            return Response({'detail': 'Session not active'}, status=status.HTTP_400_BAD_REQUEST)
        lock = getattr(session, 'lock_record', None)
        if lock and lock.is_active and not lock.auto_submit_triggered:
            return Response({'detail': 'Session locked by invigilator'}, status=status.HTTP_403_FORBIDDEN)
        if session.expires_at and timezone.now() > session.expires_at:
            session.auto_submitted = True
            if lock:
                lock.auto_submit_triggered = True
                lock.is_active = False
                lock.unlocked_at = timezone.now()
                lock.save()
        responses = request.data.get('responses', [])
        total = 0.0
        for payload in responses:
            question = TestQuestion.objects.filter(test=test, id=payload.get('question_id')).first()
            if not question:
                continue
            resp, _ = QuestionResponse.objects.update_or_create(session=session, question=question)
            resp.answer_text = payload.get('answer_text', '')
            resp.mcq_selection = payload.get('mcq_selection', [])
            resp.feedback = payload.get('feedback', '')
            if question.question_type == TestQuestion.QuestionType.MCQ:
                correct = set(question.mcq_answer or [])
                selected = set(resp.mcq_selection or [])
                if correct == selected:
                    resp.marks_awarded = question.max_marks
                else:
                    resp.marks_awarded = 0.0
            resp.save()
            if resp.marks_awarded:
                total += resp.marks_awarded
        session.total_marks = total
        session.status = StudentTestSession.Status.SUBMITTED
        session.submitted_at = timezone.now()
        session.save()
        if lock:
            lock.is_active = False
            lock.unlocked_at = timezone.now()
            lock.save()
        return Response(StudentTestSessionSerializer(session).data)


class QuestionResponseViewSet(viewsets.ModelViewSet):
    queryset = QuestionResponse.objects.all()
    serializer_class = QuestionResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        resp = self.get_object()
        prev_marks = resp.marks_awarded
        resp.marks_awarded = float(request.data.get('marks_awarded', 0))
        resp.feedback = request.data.get('feedback', '')
        resp.evaluator = request.user
        resp.evaluated_at = timezone.now()
        resp.save()
        EvaluationHistory.objects.create(
            response=resp,
            previous_marks=prev_marks,
            new_marks=resp.marks_awarded,
            notes=request.data.get('notes', ''),
            changed_by=request.user
        )
        session = resp.session
        agg = session.responses.aggregate(total=Sum('marks_awarded'))
        session.total_marks = agg['total'] or 0.0
        session.save()
        return Response(self.get_serializer(resp).data)


class StudentTestSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StudentTestSession.objects.all()
    serializer_class = StudentTestSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role in [User.Role.STAFF, User.Role.HOD, User.Role.DEAN]:
            return qs.filter(Q(invigilator=user) | Q(test__invigilators=user)).distinct()
        return qs.none()

    @action(detail=True, methods=['post'])
    def lock_session(self, request, pk=None):
        session = self.get_object()
        if request.user.role not in [User.Role.STAFF, User.Role.HOD, User.Role.DEAN]:
            return Response({'detail': 'Only invigilators may lock sessions'}, status=status.HTTP_403_FORBIDDEN)
        lock, created = TestSessionLock.objects.get_or_create(session=session)
        lock.is_active = True
        lock.locked_at = timezone.now()
        lock.last_violation_reason = request.data.get('reason', 'Invigilator locked the session')
        metadata = request.data.get('metadata', {})
        if metadata:
            lock.metadata = {**lock.metadata, **metadata}
        lock.save()
        session.status = StudentTestSession.Status.LOCKED
        session.save(update_fields=['status'])
        return Response(TestSessionLockSerializer(lock).data)

    @action(detail=True, methods=['post'])
    def release_lock(self, request, pk=None):
        session = self.get_object()
        lock = getattr(session, 'lock_record', None)
        if not lock:
            return Response({'detail': 'No lock record exists'}, status=status.HTTP_400_BAD_REQUEST)
        lock.is_active = False
        lock.unlocked_at = timezone.now()
        lock.save()
        if session.status == StudentTestSession.Status.LOCKED:
            session.status = StudentTestSession.Status.PRESENT
            session.save(update_fields=['status'])
        return Response(TestSessionLockSerializer(lock).data)

    @action(detail=True, methods=['post'])
    def report_violation(self, request, pk=None):
        session = self.get_object()
        if request.user.role not in [User.Role.STAFF, User.Role.HOD, User.Role.DEAN]:
            return Response({'detail': 'Only invigilators may report violations'}, status=status.HTTP_403_FORBIDDEN)
        event_type = request.data.get('event_type', ProctoringEvent.EventType.BLUR)
        description = request.data.get('description', '')
        metadata = request.data.get('metadata', {})
        event = ProctoringEvent.objects.create(
            session=session,
            event_type=event_type,
            description=description,
            metadata=metadata
        )
        lock, _ = TestSessionLock.objects.get_or_create(session=session)
        lock.mark_violation(reason=description or event_type, meta=metadata)
        if lock.violation_count >= 3:
            session.auto_submitted = True
            session.status = StudentTestSession.Status.COMPLETED
            session.save(update_fields=['auto_submitted', 'status'])
        return Response({
            'lock': TestSessionLockSerializer(lock).data,
            'event': ProctoringEventSerializer(event).data
        })


class InvigilatorAssignmentViewSet(viewsets.ModelViewSet):
    queryset = InvigilatorAssignment.objects.all()
    serializer_class = InvigilatorAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.STAFF:
            return super().get_queryset().filter(invigilator=user)
        return super().get_queryset()

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        assignment = self.get_object()
        if assignment.invigilator != request.user:
            return Response({'detail': 'Not your assignment'}, status=status.HTTP_403_FORBIDDEN)
        assignment.status = assignment.AssignmentStatus.ACCEPTED
        assignment.accepted_at = timezone.now()
        assignment.save()
        return Response(self.get_serializer(assignment).data)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        assignment = self.get_object()
        if assignment.invigilator != request.user:
            return Response({'detail': 'Not your assignment'}, status=status.HTTP_403_FORBIDDEN)
        assignment.status = assignment.AssignmentStatus.DECLINED
        assignment.declined_reason = request.data.get('reason', '')
        assignment.declined_at = timezone.now()
        assignment.save()
        return Response(self.get_serializer(assignment).data)

    @action(detail=True, methods=['post'])
    def refresh_invitation(self, request, pk=None):
        assignment = self.get_object()
        assignment.handshake_token = str(uuid.uuid4())
        assignment.invitation_sent_at = timezone.now()
        assignment.status = assignment.AssignmentStatus.PENDING
        assignment.save()
        return Response(self.get_serializer(assignment).data)


class TestSessionLockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TestSessionLock.objects.select_related('session', 'session__student').all()
    serializer_class = TestSessionLockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == User.Role.STUDENT:
            return qs.filter(session__student=user)
        if user.role in [User.Role.STAFF, User.Role.HOD, User.Role.DEAN]:
            return qs.filter(Q(session__invigilator=user) | Q(session__test__invigilators=user)).distinct()
        return qs.none()


class ProctoringEventViewSet(viewsets.ModelViewSet):
    queryset = ProctoringEvent.objects.select_related('session', 'session__student').all()
    serializer_class = ProctoringEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == User.Role.STUDENT:
            return qs.filter(session__student=user)
        return qs.filter(Q(session__invigilator=user) | Q(session__test__invigilators=user)).distinct()

    def perform_create(self, serializer):
        serializer.save()


class EvaluationHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EvaluationHistory.objects.select_related('response', 'changed_by').all()
    serializer_class = EvaluationHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

class EmailViewSet(viewsets.ModelViewSet):
    queryset = Email.objects.all()
    serializer_class = EmailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Email.objects.filter(recipient_email=self.request.user.email) | Email.objects.filter(sender=self.request.user)

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

class InstitutionalSheetViewSet(viewsets.ModelViewSet):
    queryset = InstitutionalSheet.objects.all()
    serializer_class = InstitutionalSheetSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def update_data(self, request):
        data = request.data.get('data', [])
        # Simplified: we just update the first sheet or create one
        sheet, created = InstitutionalSheet.objects.update_or_create(
            name='Institutional Master Sheet',
            defaults={'data': data, 'updated_by': request.user}
        )
        return Response(self.get_serializer(sheet).data)

class ExaminationTestViewSet(viewsets.ModelViewSet):
    """
    Endpoints powering the Assessment / Examination portal.
    Provides CRUD for tests along with scheduling, student roster,
    invigilator bulk assignment and attendance hooks.
    """
    queryset = ExaminationTest.objects.all().order_by('-created_at')
    serializer_class = ExaminationTestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Scope results to the current user when appropriate:
        - Staff see tests they own or invigilate
        - Students see tests mapped to their batch / department / target year
        - Admin/HOD/Dean see everything
        """
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return qs.none()

        if user.role == User.Role.STAFF:
            return qs.filter(Q(staff=user) | Q(invigilators=user)).distinct()

        if user.role == User.Role.STUDENT:
            batch_id = getattr(user, "batch_id", None)
            dept_val = getattr(user, "course_id", None) or getattr(user, "department", None)
            study_year = getattr(user, "study_year", None)
            filters = Q()
            if batch_id:
                # Allow tests scoped to the same batch or unscoped
                if str(batch_id).isdigit():
                    filters &= (Q(batch_id=batch_id) | Q(batch__isnull=True))
                else:
                    filters &= (Q(batch__name__iexact=str(batch_id)) | Q(batch__isnull=True))
            if dept_val:
                if str(dept_val).isdigit():
                    filters &= (Q(department_id=dept_val) | Q(department__isnull=True))
                else:
                    dept_str = str(dept_val).strip()
                    filters &= (
                        Q(department__name__iexact=dept_str) |
                        Q(department__domain__iexact=dept_str) |
                        Q(department__name__icontains=dept_str) |
                        Q(department__domain__icontains=dept_str) |
                        Q(department__isnull=True)
                    )

            def _numeric_year(val):
                if val is None:
                    return None
                digits = "".join(c for c in str(val) if c.isdigit())
                return digits or None

            study_num = _numeric_year(study_year)
            if study_num:
                filters &= (Q(target_year__iexact=study_num) | Q(target_year__isnull=True) | Q(target_year=""))
            # Primary filter
            primary = qs.filter(filters) if filters else qs.filter(Q(batch__isnull=True) | Q(department__isnull=True))

            # Also include tests where this student has been explicitly mapped in TestAttendance
            mapped_test_ids = TestAttendance.objects.filter(student_id=user.id).values_list('test_id', flat=True)
            mapped_qs = qs.filter(id__in=mapped_test_ids)

            combined = (primary | mapped_qs).distinct()
            if combined.exists():
                return combined

            # Fallback 1: match department only
            dept_only = qs.none()
            if dept_val:
                if str(dept_val).isdigit():
                    dept_only = qs.filter(Q(department_id=dept_val) | Q(department__isnull=True))
                else:
                    dept_str = str(dept_val).strip()
                    dept_only = qs.filter(
                        Q(department__name__iexact=dept_str) |
                        Q(department__domain__iexact=dept_str) |
                        Q(department__name__icontains=dept_str) |
                        Q(department__domain__icontains=dept_str) |
                        Q(department__isnull=True)
                    )
            if dept_only.exists():
                return dept_only

            # Fallback 2: match batch only
            batch_only = qs.none()
            if batch_id:
                if str(batch_id).isdigit():
                    batch_only = qs.filter(Q(batch_id=batch_id) | Q(batch__isnull=True))
                else:
                    batch_only = qs.filter(Q(batch__name__iexact=str(batch_id)) | Q(batch__isnull=True))
            if batch_only.exists():
                return batch_only

            # Final fallback: unscoped tests
            return qs.filter(Q(batch__isnull=True) | Q(department__isnull=True))

        return qs

    def perform_create(self, serializer):
        """
        Auto-fill a few convenience fields so the portal gets
        complete data even when the frontend omits optional bits.
        """
        subject = serializer.validated_data.get("subject_model")
        defaults = {
            "created_by": self.request.user if self.request.user.is_authenticated else None,
            "subject": serializer.validated_data.get("subject") or (subject.name if subject else ""),
            "department": serializer.validated_data.get("department") or (subject.course if subject else None),
        }
        serializer.save(**{k: v for k, v in defaults.items() if v is not None})

    def perform_update(self, serializer):
        subject = serializer.validated_data.get("subject_model")
        extra = {}
        if subject and not serializer.validated_data.get("subject"):
            extra["subject"] = subject.name
        serializer.save(**extra)

    @staticmethod
    def _parse_dt(raw):
        """
        Convert ISO/string datetime to aware datetime; return None on failure.
        """
        if not raw:
            return None
        dt = parse_datetime(raw)
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        test = self.get_object()
        start = request.data.get('startTime') or request.data.get('start_time')
        end = request.data.get('endTime') or request.data.get('end_time')
        invigilators = request.data.get('invigilators', [])

        start_dt = self._parse_dt(start)
        end_dt = self._parse_dt(end)
        if start and not start_dt:
            return Response({"error": "Invalid startTime"}, status=status.HTTP_400_BAD_REQUEST)
        if end and not end_dt:
            return Response({"error": "Invalid endTime"}, status=status.HTTP_400_BAD_REQUEST)

        if start_dt:
            test.start_time = start_dt
        if end_dt:
            test.end_time = end_dt
        if isinstance(invigilators, list):
            valid_invigilators = []
            for inv_id in invigilators:
                inv = User.objects.filter(id=inv_id).first()
                if not inv:
                    continue
                valid_invigilators.append(inv)
                defaults = {
                    'window_start': start_dt or test.start_time or timezone.now(),
                    'window_end': end_dt or test.end_time or timezone.now(),
                    'status': InvigilatorAssignment.AssignmentStatus.PENDING,
                    'invitation_sent_at': timezone.now()
                }
                assignment, created = InvigilatorAssignment.objects.update_or_create(
                    test=test,
                    invigilator=inv,
                    defaults=defaults
                )
                if created or not assignment.handshake_token:
                    assignment.handshake_token = str(uuid.uuid4())
                if assignment.status != InvigilatorAssignment.AssignmentStatus.ACCEPTED:
                    assignment.status = InvigilatorAssignment.AssignmentStatus.PENDING
                assignment.save()
            test.invigilators.set(valid_invigilators)
        test.save()
        return Response(self.get_serializer(test).data)

    @action(detail=True, methods=['post'])
    def bulk_assign_invigilators(self, request, pk=None):
        test = self.get_object()
        invigilator_id = request.data.get('invigilatorId') or request.data.get('invigilator_id')
        student_ids = request.data.get('studentIds', [])
        if not student_ids:
            return Response({"error": "studentIds is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Unassign path
        if not invigilator_id:
            TestAttendance.objects.filter(test=test, student_id__in=student_ids).update(assigned_invigilator=None)
            return Response({"status": "Unassigned"})

        inv = User.objects.filter(id=invigilator_id).first()
        if not inv:
            return Response({"error": "Invigilator not found"}, status=status.HTTP_404_NOT_FOUND)
        assignment, created = InvigilatorAssignment.objects.get_or_create(
            test=test,
            invigilator=inv,
            defaults={
                'window_start': test.start_time or timezone.now(),
                'window_end': test.end_time or (test.start_time or timezone.now()),
                'status': InvigilatorAssignment.AssignmentStatus.PENDING,
                'invitation_sent_at': timezone.now()
            }
        )
        if created or not assignment.handshake_token:
            assignment.handshake_token = str(uuid.uuid4())
        if assignment.status != InvigilatorAssignment.AssignmentStatus.ACCEPTED:
            assignment.status = InvigilatorAssignment.AssignmentStatus.PENDING
        assignment.save()
        # store mapping via TestAttendance.assigned_invigilator
        for sid in student_ids:
            TestAttendance.objects.update_or_create(
                test=test,
                student_id=sid,
                defaults={'assigned_invigilator': inv}
            )
        return Response({"status": "Assigned"})

    @action(detail=True, methods=['get'])
    def student_list(self, request, pk=None):
        """
        Returns the roster of students for this test with current attendance
        and invigilator assignment state.
        """
        test = self.get_object()

        # Start with all students, but allow widening to ensure explicitly assigned
        qs = User.objects.filter(role=User.Role.STUDENT)

        # Allow overriding via query params (used by UI filters / manual mapping)
        batch_param = request.query_params.get('batch')
        dept_param = request.query_params.get('department')
        target_year = request.query_params.get('year') or test.target_year

        # Batch filtering
        batch_filter = batch_param or test.batch_id
        if batch_filter:
            if str(batch_filter).isdigit():
                qs = qs.filter(Q(batch_id=batch_filter) | Q(batch__isnull=True))
            else:
                qs = qs.filter(Q(batch__name__iexact=str(batch_filter)) | Q(batch__isnull=True))

        # Department / course filtering
        dept_filter = dept_param or test.department_id or (test.department.name if test.department else None)
        if dept_filter:
            if str(dept_filter).isdigit():
                qs = qs.filter(Q(course_id=dept_filter))
            else:
                qs = qs.filter(
                    Q(course__name__iexact=str(dept_filter)) |
                    Q(department__iexact=str(dept_filter))
                )

        # Year filtering
        if target_year:
            qs = qs.filter(Q(study_year__iexact=str(target_year)))

        attendance_qs = TestAttendance.objects.filter(test=test).select_related("student", "assigned_invigilator")
        attendance_map = {a.student_id: a for a in attendance_qs}

        # Always include students that already have an attendance row (explicit assignment),
        # even if they don't match the current batch/department/year filters.
        assigned_ids = list(attendance_map.keys())
        if assigned_ids:
            qs = qs | User.objects.filter(id__in=assigned_ids)
        qs = qs.distinct()

        invigilator_filter = request.query_params.get('invigilator')
        roster = []

        # If an invigilator filter is present, only show students explicitly assigned to that invigilator.
        if invigilator_filter:
            for stu_id, att in attendance_map.items():
                if att.assigned_invigilator_id and str(att.assigned_invigilator_id) == str(invigilator_filter):
                    stu = qs.filter(id=stu_id).first()
                    if not stu:
                        continue
                    roster.append({
                        "id": str(stu.id),
                        "name": stu.get_full_name() or stu.first_name or stu.username or stu.email,
                        "email": stu.email,
                        "regNo": stu.reg_no,
                        "isPresent": bool(att.is_present),
                        "assignedInvigilatorId": str(att.assigned_invigilator_id),
                        "assignedInvigilatorName": att.assigned_invigilator.get_full_name() if att.assigned_invigilator else None,
                    })
            return Response(roster)

        # Default path: full cohort + any assigned
        for stu in qs:
            att = attendance_map.get(stu.id)
            roster.append({
                "id": str(stu.id),
                "name": stu.get_full_name() or stu.first_name or stu.username or stu.email,
                "email": stu.email,
                "regNo": stu.reg_no,
                "isPresent": bool(att.is_present) if att else False,
                "assignedInvigilatorId": str(att.assigned_invigilator_id) if att and att.assigned_invigilator_id else None,
                "assignedInvigilatorName": (att.assigned_invigilator.get_full_name() if att and att.assigned_invigilator else None) or (att.assigned_invigilator.username if att and att.assigned_invigilator else None)
            })
        return Response(roster)

class TestAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TestAttendance.objects.all()
    serializer_class = TestAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['test', 'student']

    @action(detail=False, methods=['post'])
    def mark(self, request):
        """
        Upsert attendance for a given student & test.
        Body: { testId, studentId, isPresent }
        """
        test_id = request.data.get('testId') or request.data.get('test_id')
        student_id = request.data.get('studentId') or request.data.get('student_id')
        is_present = request.data.get('isPresent') if 'isPresent' in request.data else request.data.get('is_present')

        if test_id is None or student_id is None or is_present is None:
            return Response({"error": "testId, studentId and isPresent are required"}, status=status.HTTP_400_BAD_REQUEST)

        present_bool = is_present
        if isinstance(is_present, str):
            present_bool = is_present.strip().lower() in ['1', 'true', 'yes', 'y', 'on']

        att_defaults = {
            "is_present": bool(present_bool),
            "marked_by": request.user,
            "attendance_timestamp": timezone.now(),
            "attendance_metadata": request.data.get('metadata', {}),
            "proof_url": request.data.get('proofUrl') or request.data.get('proof_url'),
            "location": request.data.get('location'),
            "invigilator_notes": request.data.get('notes') or request.data.get('invigilatorNotes', '')
        }
        att, _ = TestAttendance.objects.update_or_create(
            test_id=test_id,
            student_id=student_id,
            defaults=att_defaults
        )
        return Response(TestAttendanceSerializer(att).data)

class StudentSubmissionViewSet(viewsets.ModelViewSet):
    queryset = StudentSubmission.objects.all()
    serializer_class = StudentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Upsert a student's answers for a given test.
        Expected body: { testId, studentId?, answers, marksAssigned? }
        If studentId is omitted, the current user is assumed.
        """
        test_id = request.data.get('testId') or request.data.get('test')
        student_id = request.data.get('studentId') or request.data.get('student') or getattr(request.user, 'id', None)
        answers = request.data.get('answers', {})
        marks_assigned = request.data.get('marksAssigned') or {}

        if not test_id or not student_id:
            return Response({"error": "testId and studentId are required"}, status=status.HTTP_400_BAD_REQUEST)

        total_obtained = 0
        if isinstance(marks_assigned, dict):
            try:
                total_obtained = sum(float(v or 0) for v in marks_assigned.values())
            except (TypeError, ValueError):
                total_obtained = 0

        submission, _ = StudentSubmission.objects.update_or_create(
            test_id=test_id,
            student_id=student_id,
            defaults={
                "answers": answers,
                "marks_assigned": marks_assigned,
                "total_marks_obtained": total_obtained,
                "is_evaluated": False,
            }
        )
        return Response(self.get_serializer(submission).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """
        Mark a submission as evaluated and persist per-question marks.
        Body: { marksAssigned, totalMarks, cheatingAttempts?, evaluatorId? }
        """
        submission = self.get_object()
        marks_assigned = request.data.get('marksAssigned') or request.data.get('marks_assigned') or {}
        total = request.data.get('totalMarks') or request.data.get('total_marks')
        cheating = request.data.get('cheatingAttempts') or submission.cheating_attempts

        try:
            total_val = float(total) if total is not None else submission.total_marks_obtained
        except (TypeError, ValueError):
            total_val = submission.total_marks_obtained

        submission.marks_assigned = marks_assigned
        submission.total_marks_obtained = total_val
        submission.cheating_attempts = cheating or 0
        submission.is_evaluated = True
        if request.user and request.user.is_authenticated:
            submission.evaluated_by = request.user
        submission.save()
        return Response(self.get_serializer(submission).data)

class MembershipRequestViewSet(viewsets.ModelViewSet):
    queryset = MembershipRequest.objects.all()
    serializer_class = MembershipRequestSerializer
    permission_classes = [permissions.AllowAny]

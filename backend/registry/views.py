from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Sum
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum, RolePermission, StudentTaskProgress,
    Email, ChatMessage, InstitutionalSheet
)
from .serializers import (
    UserSerializer, CourseSerializer, SubjectSerializer, AcademicTaskSerializer,
    AttendanceRecordSerializer, AttendanceEditRequestSerializer, MarkBatchSerializer,
    MarkRecordSerializer, LeaveRequestSerializer, TimetableSerializer,
    PortalConnectionSerializer, NotificationSerializer, CurriculumEditRequestSerializer,
    SiteSettingsSerializer, AcademicBatchSerializer, BatchCourseCurriculumSerializer,
    RolePermissionSerializer, StudentTaskProgressSerializer,
    EmailSerializer, ChatMessageSerializer, InstitutionalSheetSerializer
)
from rest_framework.parsers import MultiPartParser, FormParser

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

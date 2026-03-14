from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum, RolePermission, StudentTaskProgress,
    Email, ChatMessage, InstitutionalSheet, ExaminationTest, TestAttendance, StudentSubmission,
    MembershipRequest
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
    MembershipRequestSerializer
)
from rest_framework.parsers import MultiPartParser, FormParser
from oauth2_provider.views import TokenView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

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
            test.invigilators.set(invigilators)
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

        att, _ = TestAttendance.objects.update_or_create(
            test_id=test_id,
            student_id=student_id,
            defaults={
                "is_present": bool(present_bool),
                "marked_by": request.user
            }
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

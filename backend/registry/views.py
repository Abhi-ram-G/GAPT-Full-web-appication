from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Sum
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum
)
from .serializers import (
    UserSerializer, CourseSerializer, SubjectSerializer, AcademicTaskSerializer,
    AttendanceRecordSerializer, AttendanceEditRequestSerializer, MarkBatchSerializer,
    MarkRecordSerializer, LeaveRequestSerializer, TimetableSerializer,
    PortalConnectionSerializer, NotificationSerializer, CurriculumEditRequestSerializer,
    SiteSettingsSerializer, AcademicBatchSerializer, BatchCourseCurriculumSerializer
)

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

    @action(detail=False, methods=['post'])
    def assign_students(self, request):
        staff1_id = request.data.get('staff1Id')
        student_ids = request.data.get('studentIds', [])
        
        staff1 = User.objects.filter(id=staff1_id).first()
        if not staff1:
            return Response({'error': 'Staff not found'}, status=status.HTTP_400_BAD_REQUEST)
            
        User.objects.filter(id__in=student_ids).update(mentor=staff1)
        return Response({'status': 'assigned'})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        User.objects.filter(id__in=ids).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def academic_data(self, request, pk=None):
        user = self.get_object()
        if user.role != 'STUDENT':
            return Response({'error': 'Not a student'}, status=status.HTTP_400_BAD_REQUEST)
        
        records = user.attendance_records.all()
        total_records = records.count()
        present_records = records.filter(is_present=True).count()
        attendance_pct = (present_records / total_records * 100) if total_records > 0 else 0
        
        marks = MarkRecord.objects.filter(student=user)
        avg_pct = marks.aggregate(Avg('marks'))['marks__avg'] or 0
        cgpa = (avg_pct / 10) 
        
        return Response({
            'attendance': round(attendance_pct, 2),
            'cgpa': round(cgpa, 2),
            'sgpa': round(cgpa, 2),
            'credits': marks.count() * 3,
            'greenPoints': round(attendance_pct + (cgpa * 10), 0)
        })

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

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
            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                serializer.save()
                responses.append(serializer.data)
            else:
                responses.append(serializer.errors)
        return Response(responses)

class AttendanceEditRequestViewSet(viewsets.ModelViewSet):
    queryset = AttendanceEditRequest.objects.all()
    serializer_class = AttendanceEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

class MarkBatchViewSet(viewsets.ModelViewSet):
    queryset = MarkBatch.objects.all()
    serializer_class = MarkBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class MarkRecordViewSet(viewsets.ModelViewSet):
    queryset = MarkRecord.objects.all()
    serializer_class = MarkRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['batch', 'student', 'subject']

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
        return Response({'status': 'cleared'})

class CurriculumEditRequestViewSet(viewsets.ModelViewSet):
    queryset = CurriculumEditRequest.objects.all()
    serializer_class = CurriculumEditRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

class SiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        # Always return the first/main settings object
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({})
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

class AcademicBatchViewSet(viewsets.ModelViewSet):
    queryset = AcademicBatch.objects.all()
    serializer_class = AcademicBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class BatchCourseCurriculumViewSet(viewsets.ModelViewSet):
    queryset = BatchCourseCurriculum.objects.all()
    serializer_class = BatchCourseCurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['batch', 'course']

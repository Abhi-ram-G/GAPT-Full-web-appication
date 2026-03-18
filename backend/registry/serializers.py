from rest_framework import serializers
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord, HourAttendance,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    HourAssignment, PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum, RolePermission, StudentTaskProgress,
    Email, ChatMessage, InstitutionalSheet, ExaminationTest, TestAttendance, StudentSubmission,
    MembershipRequest, AccessMenu, RoleDefinition, RoleMenuPermission, UserMenuPermission,
    AssessmentTest, TestQuestion, InvigilatorAssignment, StudentTestSession, QuestionResponse,
    TestSessionLock, ProctoringEvent, EvaluationHistory
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    studyYear = serializers.CharField(source='study_year', required=False, allow_null=True, allow_blank=True)
    regNo = serializers.CharField(source='reg_no', required=False, allow_null=True, allow_blank=True)
    staffId = serializers.CharField(source='staff_id', required=False, allow_null=True, allow_blank=True)
    name = serializers.CharField(source='first_name', required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    mentorId = serializers.SerializerMethodField()
    mentorName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)

    def get_mentorId(self, obj):
        return str(obj.mentor_id) if obj.mentor_id else None

    def get_mentorName(self, obj):
        return obj.mentor.get_full_name() or obj.mentor.first_name or obj.mentor.username if obj.mentor else None

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'role', 'status', 'department', 'studyYear', 'regNo', 'staffId', 'designation', 'experience', 'phone', 'country', 'state', 'district', 'city', 'avatar', 'mentorId', 'mentorName', 'createdAt']

class HourAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HourAttendance
        fields = ['hour', 'status', 'detail']

class AttendanceRecordSerializer(serializers.ModelSerializer):
    hours = HourAttendanceSerializer(many=True, required=False)
    
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'user', 'date', 'is_present', 'marked_by', 'hours']

    def create(self, validated_data):
        hours_data = validated_data.pop('hours', [])
        record = AttendanceRecord.objects.create(**validated_data)
        for hour_data in hours_data:
            HourAttendance.objects.create(record=record, **hour_data)
        return record

class AttendanceEditRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceEditRequest
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    lessonsCount = serializers.IntegerField(source='lessons_count', required=False)
    lessonNames = serializers.JSONField(source='lesson_names', required=False)
    questionPapers = serializers.JSONField(source='question_papers', required=False)
    assignedStaffIds = serializers.PrimaryKeyRelatedField(
        source='assigned_staff', 
        many=True, 
        read_only=True
    )

    class Meta:
        model = Subject
        fields = ['id', 'code', 'name', 'credits', 'semester', 'lessonsCount', 'materials', 'lessonNames', 'questionPapers', 'assignedStaffIds']
        
    def to_representation(self, instance):
        repr = super().to_representation(instance)
        repr['id'] = str(repr['id'])
        return repr

class CourseSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)
    batchType = serializers.CharField(source='batch_type', required=False)
    
    class Meta:
        model = Course
        fields = ['id', 'name', 'degree', 'domain', 'batchType', 'subjects']

    def to_representation(self, instance):
        repr = super().to_representation(instance)
        repr['id'] = str(repr['id'])
        return repr

class StudentTaskProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    class Meta:
        model = StudentTaskProgress
        fields = '__all__'

class AcademicTaskSerializer(serializers.ModelSerializer):
    staffName = serializers.CharField(source='staff.username', read_only=True)
    subjectName = serializers.CharField(source='subject.name', read_only=True)
    assignedStudents = StudentTaskProgressSerializer(source='student_progress', many=True, read_only=True)

    class Meta:
        model = AcademicTask
        fields = ['id', 'title', 'description', 'dueDate', 'priority', 'status', 'subjectId', 'subjectName', 'department', 'studyYear', 'staffId', 'staffName', 'createdAt', 'isFrozen', 'assignedStudents']

class MarkRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkRecord
        fields = '__all__'

class MarkBatchSerializer(serializers.ModelSerializer):
    records = MarkRecordSerializer(many=True, read_only=True)
    
    class Meta:
        model = MarkBatch
        fields = '__all__'

class LeaveRequestSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='student.username', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'studentId', 'studentName', 'studentYear', 'studentDegree', 'mentorId', 'type', 'startDate', 'startTime', 'endDate', 'endTime', 'reason', 'status', 'createdAt']

    def to_representation(self, instance):
        # Map snake_case model fields to camelCase for frontend
        ret = super().to_representation(instance)
        # Assuming the model has these fields in snake_case
        return ret

class HourAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HourAssignment
        fields = ['hour', 'staff']

class TimetableSerializer(serializers.ModelSerializer):
    assignments = HourAssignmentSerializer(many=True, required=False)
    
    class Meta:
        model = Timetable
        fields = ['id', 'department', 'study_year', 'assignments', 'last_updated']

    def create(self, validated_data):
        assignments_data = validated_data.pop('assignments', [])
        timetable = Timetable.objects.create(**validated_data)
        for assignment_data in assignments_data:
            HourAssignment.objects.create(timetable=timetable, **assignment_data)
        return timetable

class PortalConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalConnection
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class CurriculumEditRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurriculumEditRequest
        fields = '__all__'

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'

class AcademicBatchSerializer(serializers.ModelSerializer):
    startYear = serializers.IntegerField(source='start_year')
    endYear = serializers.IntegerField(source='end_year')
    batchType = serializers.CharField(source='batch_type')
    departmentIds = serializers.PrimaryKeyRelatedField(source='departments', many=True, queryset=Course.objects.all())

    class Meta:
        model = AcademicBatch
        fields = ['id', 'name', 'startYear', 'endYear', 'batchType', 'departmentIds']
        
    def to_representation(self, instance):
        repr = super().to_representation(instance)
        repr['id'] = str(repr['id'])
        repr['departmentIds'] = [str(did) for did in repr['departmentIds']]
        return repr

class BatchCourseCurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchCourseCurriculum
        fields = '__all__'
class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = '__all__'


class AccessMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessMenu
        fields = ['id', 'name', 'slug', 'category', 'description', 'path']


class RoleDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleDefinition
        fields = ['id', 'label', 'priority']


class RoleMenuPermissionSerializer(serializers.ModelSerializer):
    menuId = serializers.CharField(source='menu.id', read_only=True)
    menuSlug = serializers.CharField(source='menu.slug', read_only=True)
    roleId = serializers.CharField(source='role.id', read_only=True)
    accessType = serializers.CharField(source='access_type')

    class Meta:
        model = RoleMenuPermission
        fields = ['menuId', 'menuSlug', 'roleId', 'accessType']


class UserMenuPermissionSerializer(serializers.ModelSerializer):
    menuId = serializers.CharField(source='menu.id', read_only=True)
    menuSlug = serializers.CharField(source='menu.slug', read_only=True)
    userId = serializers.CharField(source='user.id', read_only=True)
    accessType = serializers.CharField(source='access_type')

    class Meta:
        model = UserMenuPermission
        fields = ['menuId', 'menuSlug', 'userId', 'accessType']

class EmailSerializer(serializers.ModelSerializer):
    from_email = serializers.EmailField(source='sender.email', read_only=True)
    fromName = serializers.CharField(source='sender.username', read_only=True)
    to = serializers.EmailField(source='recipient_email')
    body = serializers.CharField(source='content')
    read = serializers.BooleanField(source='is_read', required=False)
    starred = serializers.BooleanField(source='is_starred', required=False)
    archived = serializers.BooleanField(source='is_archived', required=False)
    spam = serializers.BooleanField(source='is_spam', required=False)
    snoozed = serializers.BooleanField(source='is_snoozed', required=False)
    task = serializers.BooleanField(source='is_task', required=False)
    
    class Meta:
        model = Email
        fields = ['id', 'from_email', 'fromName', 'to', 'subject', 'body', 'timestamp', 'read', 'starred', 'status', 'archived', 'spam', 'snoozed', 'task']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['from'] = ret.pop('from_email')
        ret['trash'] = (instance.status == 'TRASH')
        return ret

    def validate(self, data):
        # Handle 'trash' if sent from frontend
        trash = self.initial_data.get('trash')
        if trash is not None:
            data['status'] = 'TRASH' if trash else 'SENT'
        return data

class ChatMessageSerializer(serializers.ModelSerializer):
    senderId = serializers.CharField(source='sender.id', read_only=True)
    senderName = serializers.CharField(source='sender.username', read_only=True)
    text = serializers.CharField(source='content')
    receiverId = serializers.CharField(source='room', required=False) # Temp hijacking room for 1-to-1 receiver

    class Meta:
        model = ChatMessage
        fields = ['id', 'senderId', 'senderName', 'receiverId', 'text', 'timestamp']

class InstitutionalSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionalSheet
        fields = '__all__'

class ExaminationTestSerializer(serializers.ModelSerializer):
    batchName = serializers.SerializerMethodField(read_only=True)
    departmentName = serializers.SerializerMethodField(read_only=True)
    subjectName = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExaminationTest
        fields = '__all__'

    def get_batchName(self, obj):
        return obj.batch.name if obj.batch else None

    def get_departmentName(self, obj):
        return obj.department.name if obj.department else None

    def get_subjectName(self, obj):
        if obj.subject_model:
            return obj.subject_model.name
        return obj.subject

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Normalize id fields to strings for frontend convenience
        for key in ['id', 'batch', 'department', 'subject_model', 'staff', 'created_by']:
            if key in data and data[key] is not None:
                data[key] = str(data[key])
        if 'invigilators' in data and isinstance(data['invigilators'], list):
            data['invigilators'] = [str(v) for v in data['invigilators']]
        return data

class TestAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAttendance
        fields = '__all__'

class StudentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentSubmission
        fields = '__all__'


class AssessmentTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentTest
        fields = ['id', 'name', 'description', 'status', 'start_time', 'end_time', 'duration_minutes', 'allowed_roles']


class TestQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestQuestion
        fields = '__all__'


class InvigilatorAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvigilatorAssignment
        fields = '__all__'


class EvaluationHistorySerializer(serializers.ModelSerializer):
    changedBy = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = EvaluationHistory
        fields = ['id', 'previous_marks', 'new_marks', 'notes', 'changedBy', 'changed_at']


class QuestionResponseSerializer(serializers.ModelSerializer):
    history = EvaluationHistorySerializer(many=True, read_only=True)

    class Meta:
        model = QuestionResponse
        fields = '__all__'


class TestSessionLockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSessionLock
        fields = '__all__'


class ProctoringEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctoringEvent
        fields = '__all__'


class StudentTestSessionSerializer(serializers.ModelSerializer):
    lock = TestSessionLockSerializer(source='lock_record', read_only=True)
    proctorEventCount = serializers.IntegerField(source='proctor_events.count', read_only=True)

    class Meta:
        model = StudentTestSession
        fields = '__all__'

class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token

class MembershipRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipRequest
        fields = '__all__'


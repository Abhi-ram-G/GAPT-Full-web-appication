from rest_framework import serializers
from .models import (
    User, Course, Subject, AcademicTask, AttendanceRecord, HourAttendance,
    AttendanceEditRequest, MarkBatch, MarkRecord, LeaveRequest, Timetable,
    HourAssignment, PortalConnection, Notification, CurriculumEditRequest, SiteSettings,
    AcademicBatch, BatchCourseCurriculum
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'department', 'study_year', 'reg_no', 'staff_id', 'designation', 'experience', 'avatar']

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
    class Meta:
        model = Subject
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Course
        fields = '__all__'

class AcademicTaskSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.username', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = AcademicTask
        fields = '__all__'

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
    student_name = serializers.CharField(source='student.username', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = '__all__'

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
    class Meta:
        model = AcademicBatch
        fields = '__all__'

class BatchCourseCurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchCourseCurriculum
        fields = '__all__'

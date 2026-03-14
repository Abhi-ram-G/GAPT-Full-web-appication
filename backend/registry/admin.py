from django.contrib import admin
from .models import ExaminationTest, TestAttendance, StudentSubmission

@admin.register(ExaminationTest)
class ExaminationTestAdmin(admin.ModelAdmin):
    list_display = ('title', 'test_type', 'target_year', 'status', 'start_time', 'end_time', 'created_by')
    list_filter = ('status', 'test_type', 'target_year', 'department')
    search_fields = ('title', 'description', 'subject')

@admin.register(TestAttendance)
class TestAttendanceAdmin(admin.ModelAdmin):
    list_display = ('test', 'student', 'is_present', 'marked_by', 'marked_at')
    list_filter = ('is_present', 'test')
    search_fields = ('student__username', 'test__title')

@admin.register(StudentSubmission)
class StudentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('test', 'student', 'total_marks_obtained', 'cheating_attempts', 'is_evaluated', 'submitted_at')
    list_filter = ('is_evaluated', 'test')
    search_fields = ('student__username', 'test__title')

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GoogleLoginView,
    UserViewSet, CourseViewSet, SubjectViewSet, AcademicTaskViewSet,
    AttendanceRecordViewSet, AttendanceEditRequestViewSet, MarkBatchViewSet,
    MarkRecordViewSet, LeaveRequestViewSet, TimetableViewSet,
    PortalConnectionViewSet, NotificationViewSet, CurriculumEditRequestViewSet,
    SiteSettingsViewSet, AcademicBatchViewSet, BatchCourseCurriculumViewSet,
    RolePermissionViewSet, EmailViewSet, ChatMessageViewSet, InstitutionalSheetViewSet,
    FileUploadView, ExaminationTestViewSet, TestAttendanceViewSet, StudentSubmissionViewSet,
    MembershipRequestViewSet, AccessControlViewSet,
    AssessmentTestViewSet, StudentTestSessionViewSet, QuestionResponseViewSet,
    InvigilatorAssignmentViewSet, TestSessionLockViewSet, ProctoringEventViewSet, EvaluationHistoryViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'membership-requests', MembershipRequestViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'tasks', AcademicTaskViewSet)
router.register(r'attendance', AttendanceRecordViewSet)
router.register(r'attendance-edit-requests', AttendanceEditRequestViewSet)
router.register(r'files', FileUploadView, basename='files')
router.register(r'mark-batches', MarkBatchViewSet)
router.register(r'mark-records', MarkRecordViewSet)
router.register(r'leave-requests', LeaveRequestViewSet)
router.register(r'timetables', TimetableViewSet)
router.register(r'portals', PortalConnectionViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'curriculum-requests', CurriculumEditRequestViewSet)
router.register(r'site-settings', SiteSettingsViewSet, basename='site-settings')
router.register(r'academic-batches', AcademicBatchViewSet)
router.register(r'curriculum-status', BatchCourseCurriculumViewSet)
router.register(r'permissions', RolePermissionViewSet, basename='permissions')
router.register(r'access-control', AccessControlViewSet, basename='access-control')
router.register(r'emails', EmailViewSet)
router.register(r'chat-messages', ChatMessageViewSet)
router.register(r'spreadsheet-data', InstitutionalSheetViewSet, basename='spreadsheet-data')
router.register(r'examination-tests', ExaminationTestViewSet, basename='examination-tests')
router.register(r'test-attendance', TestAttendanceViewSet, basename='test-attendance')
router.register(r'test-submissions', StudentSubmissionViewSet, basename='test-submissions')
router.register(r'assessments', AssessmentTestViewSet, basename='assessments')
router.register(r'sessions', StudentTestSessionViewSet, basename='sessions')
router.register(r'responses', QuestionResponseViewSet, basename='responses')
router.register(r'invigilation', InvigilatorAssignmentViewSet, basename='invigilations')
router.register(r'session-locks', TestSessionLockViewSet, basename='session-locks')
router.register(r'proctor-events', ProctoringEventViewSet, basename='proctor-events')
router.register(r'evaluation-history', EvaluationHistoryViewSet, basename='evaluation-history')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
]

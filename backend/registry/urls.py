from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, CourseViewSet, SubjectViewSet, AcademicTaskViewSet,
    AttendanceRecordViewSet, AttendanceEditRequestViewSet, MarkBatchViewSet,
    MarkRecordViewSet, LeaveRequestViewSet, TimetableViewSet,
    PortalConnectionViewSet, NotificationViewSet, CurriculumEditRequestViewSet,
    SiteSettingsViewSet, AcademicBatchViewSet, BatchCourseCurriculumViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'tasks', AcademicTaskViewSet)
router.register(r'attendance', AttendanceRecordViewSet)
router.register(r'attendance-requests', AttendanceEditRequestViewSet)
router.register(r'mark-batches', MarkBatchViewSet)
router.register(r'mark-records', MarkRecordViewSet)
router.register(r'leaves', LeaveRequestViewSet)
router.register(r'timetables', TimetableViewSet)
router.register(r'portals', PortalConnectionViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'curriculum-requests', CurriculumEditRequestViewSet)
router.register(r'settings', SiteSettingsViewSet, basename='site-settings')
router.register(r'batches', AcademicBatchViewSet)
router.register(r'curriculum-status', BatchCourseCurriculumViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

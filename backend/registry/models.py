from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        STAFF = 'STAFF', _('Staff')
        STUDENT = 'STUDENT', _('Student')
        HOD = 'HOD', _('HOD')
        DEAN = 'DEAN', _('Dean')
        ASSOC_PROF_I = 'ASSOC_PROF_I', _('Associate Professor I')
        ASSOC_PROF_II = 'ASSOC_PROF_II', _('Associate Professor II')
        ASSOC_PROF_III = 'ASSOC_PROF_III', _('Associate Professor III')

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    department = models.CharField(max_length=255, blank=True, null=True)
    study_year = models.CharField(max_length=50, blank=True, null=True)
    reg_no = models.CharField(max_length=100, blank=True, null=True, unique=True)
    staff_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    experience = models.CharField(max_length=10, blank=True, null=True)
    avatar = models.URLField(blank=True, null=True)
    mentor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='mentees')
    
    def __str__(self):
        return f"{self.username} ({self.role})"

class Course(models.Model):
    name = models.CharField(max_length=255)
    degree = models.CharField(max_length=100)
    domain = models.CharField(max_length=255, blank=True)
    batch_type = models.CharField(max_length=2, choices=[('UG', 'UG'), ('PG', 'PG')], default='UG')

    def __str__(self):
        return f"{self.name} ({self.degree})"

class AcademicBatch(models.Model):
    name = models.CharField(max_length=255)
    start_year = models.IntegerField()
    end_year = models.IntegerField()
    batch_type = models.CharField(max_length=2, choices=[('UG', 'UG'), ('PG', 'PG')], default='UG')
    departments = models.ManyToManyField(Course, related_name='academic_batches')

    def __str__(self):
        return self.name

class BatchCourseCurriculum(models.Model):
    class Status(models.TextChoices):
        EDITABLE = 'EDITABLE', _('Editable')
        FROZEN = 'FROZEN', _('Frozen')

    batch = models.ForeignKey(AcademicBatch, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FROZEN)

    class Meta:
        unique_together = ('batch', 'course')

class Subject(models.Model):
    course = models.ForeignKey(Course, related_name='subjects', on_delete=models.CASCADE)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    credits = models.IntegerField(default=3)
    semester = models.IntegerField()
    lessons_count = models.IntegerField(default=5)
    materials = models.JSONField(default=list, blank=True) # List of filenames
    lesson_names = models.JSONField(default=list, blank=True)
    assigned_staff = models.ManyToManyField(User, related_name='assigned_subjects', blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class AcademicTask(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', _('Low')
        MEDIUM = 'MEDIUM', _('Medium')
        HIGH = 'HIGH', _('High')

    class Status(models.TextChoices):
        TODO = 'TO DO', _('To Do')
        IN_PROGRESS = 'IN PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')

    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateTimeField()
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    department = models.CharField(max_length=255)
    study_year = models.CharField(max_length=50)
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks_created')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# --- New Modules for Full Feature Parity ---

class AttendanceRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    is_present = models.BooleanField(default=False) # Aggregated check
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='attendance_marked')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')

class HourAttendance(models.Model):
    record = models.ForeignKey(AttendanceRecord, related_name='hours', on_delete=models.CASCADE)
    hour = models.IntegerField() # 1 to 7/8
    status = models.CharField(max_length=20, choices=[('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('OTHER', 'Other')], default='PRESENT')
    detail = models.CharField(max_length=255, blank=True)

class AttendanceEditRequest(models.Model):
    requester = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    admin_approved = models.BooleanField(default=False)
    dean_approved = models.BooleanField(default=False)
    hod_approved = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

class MarkBatch(models.Model):
    name = models.CharField(max_length=255) # e.g. SEM 1 INTERNAL 1
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=[('OPEN', 'Open'), ('FROZEN', 'Frozen'), ('BLOCKED', 'Blocked')], default='OPEN')
    subjects = models.ManyToManyField(Subject, related_name='mark_batches')
    created_at = models.DateTimeField(auto_now_add=True)

class MarkRecord(models.Model):
    batch = models.ForeignKey(MarkBatch, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marks')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    marks = models.FloatField()
    max_marks = models.FloatField(default=100)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        MEDICAL = 'MEDICAL', _('Medical')
        PERSONAL = 'PERSONAL', _('Personal')
        ACADEMIC = 'ACADEMIC', _('Academic')

    class LeaveStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leaves')
    mentor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='mentee_leaves')
    type = models.CharField(max_length=20, choices=LeaveType.choices)
    start_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_date = models.DateField()
    end_time = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class Timetable(models.Model):
    department = models.CharField(max_length=255)
    study_year = models.CharField(max_length=50)
    last_updated = models.DateTimeField(auto_now=True)

class HourAssignment(models.Model):
    timetable = models.ForeignKey(Timetable, related_name='assignments', on_delete=models.CASCADE)
    hour = models.IntegerField()
    staff = models.ForeignKey(User, on_delete=models.CASCADE)

class PortalConnection(models.Model):
    name = models.CharField(max_length=255)
    url = models.URLField()
    handshake_id = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=[('CONNECTED', 'Connected'), ('DISCONNECTED', 'Disconnected'), ('PENDING', 'Pending')], default='PENDING')
    permission = models.CharField(max_length=20, choices=[('READ_ONLY', 'Read Only'), ('READ_WRITE', 'Read Write')], default='READ_ONLY')
    last_sync = models.DateTimeField(null=True, blank=True)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    type = models.CharField(max_length=50, default='SYSTEM')

class CurriculumEditRequest(models.Model):
    hod = models.ForeignKey(User, on_delete=models.CASCADE)
    dept_name = models.CharField(max_length=255)
    batch_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING')
    timestamp = models.DateTimeField(auto_now_add=True)

class SiteSettings(models.Model):
    name = models.CharField(max_length=255, default='GAPT')
    description = models.TextField(blank=True)
    admin_email = models.EmailField()
    theme_color = models.CharField(max_length=20, default='#5d58ff')
    institution = models.CharField(max_length=255)
    
    class Meta:
        verbose_name_plural = "Site Settings"

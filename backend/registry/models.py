import uuid

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

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPROVED)
    batch = models.ForeignKey('AcademicBatch', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    course = models.ForeignKey('Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='course_students')
    department = models.CharField(max_length=255, blank=True, null=True)
    study_year = models.CharField(max_length=50, blank=True, null=True)
    reg_no = models.CharField(max_length=100, blank=True, null=True, unique=True)
    staff_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    experience = models.CharField(max_length=10, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
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
    question_papers = models.JSONField(default=list, blank=True)
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

class StudentTaskProgress(models.Model):
    class ProgressStatus(models.TextChoices):
        TODO = 'TO DO', _('To Do')
        ONGOING = 'ONGOING', _('Ongoing')
        COMPLETED = 'COMPLETED', _('Completed')
    
    task = models.ForeignKey(AcademicTask, on_delete=models.CASCADE, related_name='student_progress')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_progress')
    progress = models.CharField(max_length=20, choices=ProgressStatus.choices, default=ProgressStatus.TODO)
    details = models.TextField(blank=True, null=True)
    marks = models.FloatField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('task', 'student')

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

    class Meta:
        unique_together = ('batch', 'student', 'subject')

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

class MembershipRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    email = models.EmailField(unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    role = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    batch = models.ForeignKey(AcademicBatch, on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    reg_no = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} ({self.status})"

class SiteSettings(models.Model):
    name = models.CharField(max_length=255, default='GAPT')
    description = models.TextField(blank=True)
    admin_email = models.EmailField()
    theme_color = models.CharField(max_length=20, default='#5d58ff')
    institution = models.CharField(max_length=255)
    
    class Meta:
        verbose_name_plural = "Site Settings"

class RolePermission(models.Model):
    role = models.CharField(max_length=50)
    feature = models.CharField(max_length=100)
    level = models.CharField(max_length=100)

    class Meta:
        unique_together = ('role', 'feature')

    def __str__(self):
        return f"{self.role} - {self.feature}: {self.level}"


class AccessGrantType(models.TextChoices):
    HIDE = 'HIDE', _('Hide Menu')
    VIEW_ALL = 'VIEW_ALL', _('View Only')
    EDIT_STUDENTS = 'EDIT_STUDENTS', _('Edit Students')
    EDIT_STAFF = 'EDIT_STAFF', _('Edit Staff')
    EDIT_HOD = 'EDIT_HOD', _('Edit HOD')
    EDIT_DEAN = 'EDIT_DEAN', _('Edit Dean')
    EDIT_STAFF_STUDENTS = 'EDIT_STAFF_STUDENTS', _('Edit Staff Students')
    EDIT_HOD_STAFF = 'EDIT_HOD_STAFF', _('Edit HOD Staff')
    EDIT_HOD_STAFF_STUDENTS = 'EDIT_HOD_STAFF_STUDENTS', _('Edit HOD Staff Students')
    EDIT_ALL = 'EDIT_ALL', _('Edit All')
    FULL = 'FULL', _('Full Access')


class RoleDefinition(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    label = models.CharField(max_length=150)
    priority = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ['priority', 'label']

    def __str__(self):
        return f"{self.label} ({self.id})"


class AccessMenu(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=60, unique=True)
    category = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True)
    path = models.CharField(max_length=255, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['category', 'order', 'name']

    def __str__(self):
        return f"{self.name} ({self.category})"


class RoleMenuPermission(models.Model):
    role = models.ForeignKey(RoleDefinition, on_delete=models.CASCADE, related_name='menu_permissions')
    menu = models.ForeignKey(AccessMenu, on_delete=models.CASCADE, related_name='role_permissions')
    access_type = models.CharField(max_length=30, choices=AccessGrantType.choices, default=AccessGrantType.HIDE)

    class Meta:
        unique_together = ('role', 'menu')

    def __str__(self):
        return f"{self.role.id}:{self.menu.slug} -> {self.access_type}"


class UserMenuPermission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='menu_overrides')
    menu = models.ForeignKey(AccessMenu, on_delete=models.CASCADE, related_name='user_overrides')
    access_type = models.CharField(max_length=30, choices=AccessGrantType.choices, default=AccessGrantType.HIDE)

    class Meta:
        unique_together = ('user', 'menu')

    def __str__(self):
        return f"{self.user_id}:{self.menu.slug} -> {self.access_type}"

class Email(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_emails')
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_spam = models.BooleanField(default=False)
    is_snoozed = models.BooleanField(default=False)
    is_task = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=[('SENT', 'Sent'), ('DRAFT', 'Draft'), ('TRASH', 'Trash')], default='SENT')

class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    room = models.CharField(max_length=100, default='GENERAL') # Room name (e.g. DEPT_CSE, BATCH_2024)

class InstitutionalSheet(models.Model):
    name = models.CharField(max_length=255)
    data = models.JSONField() # The grid data
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.name

class ExaminationTest(models.Model):
    class TestType(models.TextChoices):
        UNIT_TEST = 'UNIT_TEST', 'Unit Test'
        INTERNAL_I = 'INTERNAL_I', 'Internal I'
        INTERNAL_II = 'INTERNAL_II', 'Internal II'
        SEMESTER = 'SEMESTER', 'Semester'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    test_type = models.CharField(max_length=20, choices=TestType.choices, default=TestType.UNIT_TEST)
    
    batch = models.ForeignKey(AcademicBatch, on_delete=models.CASCADE, related_name='tests', null=True)
    department = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='department_tests', null=True)
    subject_model = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='subject_tests', null=True)
    
    # Keeping old fields for back-compat or simple display
    target_year = models.CharField(max_length=50) 
    subject = models.CharField(max_length=255) # Name for backward compatibility
    
    staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='staff_tests')
    lessons = models.JSONField(default=list, blank=True)
    total_marks = models.IntegerField(default=100)
    duration = models.CharField(max_length=50)
    
    # Store questions as a structured JSON: { section1: [], section2: [], etc. }
    questions_data = models.JSONField(default=dict, blank=True)
    
    status = models.CharField(max_length=20, choices=[('Upcoming', 'Upcoming'), ('Active', 'Active'), ('Completed', 'Completed')], default='Upcoming')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tests')
    created_at = models.DateTimeField(auto_now_add=True)
    
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    invigilators = models.ManyToManyField(User, related_name='invigilated_tests', blank=True)

    def __str__(self):
        return f"{self.title} ({self.test_type})"

class TestAttendance(models.Model):
    test = models.ForeignKey(ExaminationTest, on_delete=models.CASCADE, related_name='attendances')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_attendances')
    is_present = models.BooleanField(default=False)
    assigned_invigilator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_examinees')
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='test_attendance_marks')
    marked_at = models.DateTimeField(auto_now=True)
    attendance_timestamp = models.DateTimeField(null=True, blank=True)
    attendance_metadata = models.JSONField(default=dict, blank=True)
    proof_url = models.URLField(max_length=500, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    invigilator_notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('test', 'student')

class StudentSubmission(models.Model):
    test = models.ForeignKey(ExaminationTest, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_submissions')
    answers = models.JSONField(default=dict) # { question_id: answer_text }
    marks_assigned = models.JSONField(default=dict) # { question_id: mark }
    total_marks_obtained = models.FloatField(default=0)
    cheating_attempts = models.IntegerField(default=0)
    is_evaluated = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    evaluated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='evaluations')

    class Meta:
        unique_together = ('test', 'student')


class AssessmentTest(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SCHEDULED = 'SCHEDULED', _('Scheduled')
        LIVE = 'LIVE', _('Live')
        CLOSED = 'CLOSED', _('Closed')

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assessment_tests')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    allowed_roles = models.ManyToManyField(RoleDefinition, related_name='allowed_tests', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class TestQuestion(models.Model):
    class QuestionType(models.TextChoices):
        MCQ = 'MCQ', _('Multiple Choice')
        DESCRIPTIVE = 'DESCRIPTIVE', _('Descriptive')

    test = models.ForeignKey(AssessmentTest, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices, default=QuestionType.DESCRIPTIVE)
    max_marks = models.FloatField(default=1.0)
    mcq_options = models.JSONField(default=list, blank=True)
    mcq_answer = models.JSONField(default=list, blank=True)
    rubric = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.test.name} - Q{self.order + 1}"


class InvigilatorAssignment(models.Model):
    test = models.ForeignKey(ExaminationTest, on_delete=models.CASCADE, related_name='invigilator_assignments')
    invigilator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_sessions')
    window_start = models.DateTimeField()
    window_end = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    invitation_sent_at = models.DateTimeField(default=timezone.now, editable=False)

    class AssignmentStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        ACCEPTED = 'ACCEPTED', _('Accepted')
        DECLINED = 'DECLINED', _('Declined')

    status = models.CharField(max_length=15, choices=AssignmentStatus.choices, default=AssignmentStatus.PENDING)
    accepted_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    declined_reason = models.TextField(blank=True)
    handshake_token = models.CharField(max_length=36, blank=True, default=uuid.uuid4)

    class Meta:
        unique_together = ('test', 'invigilator')

    def __str__(self):
        return f"{self.test.name} - {self.invigilator}"


class StudentTestSession(models.Model):
    class Status(models.TextChoices):
        LOCKED = 'LOCKED', _('Locked')
        PRESENT = 'PRESENT', _('Present')
        ONGOING = 'ONGOING', _('Ongoing')
        SUBMITTED = 'SUBMITTED', _('Submitted')
        COMPLETED = 'COMPLETED', _('Completed')

    test = models.ForeignKey(AssessmentTest, on_delete=models.CASCADE, related_name='sessions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_sessions')
    invigilator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invigilated_sessions')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.LOCKED)
    invigilator_assigned = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    auto_submitted = models.BooleanField(default=False)
    total_marks = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('test', 'student')

    def __str__(self):
        return f"{self.test.name} · {self.student}"


class QuestionResponse(models.Model):
    session = models.ForeignKey(StudentTestSession, related_name='responses', on_delete=models.CASCADE)
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField(blank=True)
    mcq_selection = models.JSONField(default=list, blank=True)
    marks_awarded = models.FloatField(null=True, blank=True)
    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='evaluated_responses')
    evaluated_at = models.DateTimeField(null=True, blank=True)
    feedback = models.TextField(blank=True)

    class Meta:
        unique_together = ('session', 'question')

    def __str__(self):
        return f"{self.question} [{self.session.student}]"


class TestSessionLock(models.Model):
    session = models.OneToOneField(StudentTestSession, on_delete=models.CASCADE, related_name='lock_record')
    locked_at = models.DateTimeField(auto_now_add=True)
    unlocked_at = models.DateTimeField(null=True, blank=True)
    violation_count = models.PositiveIntegerField(default=0)
    last_violation_reason = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    auto_submit_triggered = models.BooleanField(default=False)

    def mark_violation(self, reason='', meta=None):
        self.violation_count += 1
        self.last_violation_reason = reason or self.last_violation_reason
        if meta:
            self.metadata = {**self.metadata, **meta}
        self.save(update_fields=['violation_count', 'last_violation_reason', 'metadata'])

    def __str__(self):
        return f"Lock for {self.session}"


class ProctoringEvent(models.Model):
    class EventType(models.TextChoices):
        BLUR = 'BLUR', _('Window Lost Focus')
        TAB_SWITCH = 'TAB_SWITCH', _('Tab Switch')
        COPY = 'COPY', _('Copy Attempt')
        PASTE = 'PASTE', _('Paste Attempt')
        SCREENSHOT = 'SCREENSHOT', _('Screenshot Attempt')
        AI_TOOL = 'AI_TOOL', _('AI Tool Detected')
        FOCUS_RETURN = 'FOCUS_RETURN', _('Focus Restored')

    session = models.ForeignKey(StudentTestSession, related_name='proctor_events', on_delete=models.CASCADE)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.session} · {self.event_type}"


class EvaluationHistory(models.Model):
    response = models.ForeignKey(QuestionResponse, related_name='history', on_delete=models.CASCADE)
    previous_marks = models.FloatField(null=True, blank=True)
    new_marks = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='evaluation_history')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"Audit for {self.response}"

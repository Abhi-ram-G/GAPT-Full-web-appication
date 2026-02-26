import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, time
from registry.models import (
    User, Course, Subject, AcademicTask, AttendanceRecord, HourAttendance,
    MarkBatch, MarkRecord, LeaveRequest, Timetable, HourAssignment, SiteSettings,
    AcademicBatch, BatchCourseCurriculum
)
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds full institutional data for parity with frontend'

    def handle(self, *args, **options):
        self.stdout.write('Seeding full data...')

        # 1. Site Settings
        SiteSettings.objects.get_or_create(
            admin_email='admin@bitsathy.ac.in',
            defaults={
                'name': 'GAPT',
                'institution': 'Bannari Amman Institute of Technology',
                'theme_color': '#5d58ff'
            }
        )

        # 2. Users
        admin, _ = User.objects.get_or_create(
            username='admin',
            email='admin@bitsathy.ac.in',
            defaults={
                'name': 'CHIEF ADMINISTRATOR',
                'role': 'ADMIN',
                'department': 'System Governance',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin.set_password('password')
        admin.save()

        dean, _ = User.objects.get_or_create(
            username='dean_saravanan',
            email='dean.bits@bitsathy.ac.in',
            defaults={
                'name': 'DR. K. SARAVANAN',
                'role': 'DEAN',
                'designation': 'Dean / Academic Director',
                'experience': '22'
            }
        )
        dean.set_password('password')
        dean.save()

        staff, _ = User.objects.get_or_create(
            username='prakash_raj',
            email='prakash.stf.ad@bitsathy.ac.in',
            defaults={
                'name': 'MR. PRAKASH RAJ',
                'role': 'STAFF',
                'department': 'Artificial Intelligence & Data Science (B.Tech)',
                'designation': 'Assistant Professor',
                'experience': '6'
            }
        )
        staff.set_password('password')
        staff.save()

        student, _ = User.objects.get_or_create(
            username='jai_akash',
            email='jai.std.ad@bitsathy.ac.in',
            defaults={
                'name': 'JAI AKASH S R',
                'role': 'STUDENT',
                'department': 'Artificial Intelligence & Data Science (B.Tech)',
                'study_year': '1st Year',
                'reg_no': 'BIT24AD001',
                'mentor': staff
            }
        )
        student.set_password('password')
        student.save()

        # 3. Course & Subjects
        course, _ = Course.objects.get_or_create(
            name='Artificial Intelligence & Data Science',
            degree='B.Tech',
            defaults={'domain': 'Computing', 'batch_type': 'UG'}
        )

        subj_math, _ = Subject.objects.get_or_create(
            code='MA24101',
            defaults={
                'name': 'MATHEMATICS I',
                'course': course,
                'credits': 4,
                'semester': 1,
                'lesson_names': ['Calculus', 'Matrices', 'Integrals', 'Vectors', 'Fourier']
            }
        )
        subj_math.assigned_staff.add(staff)

        # 4. Academic Batches & Curriculum Status
        batch_24_28, _ = AcademicBatch.objects.get_or_create(
            name='2024-2028 B.Tech AD',
            start_year=2024,
            end_year=2028,
            defaults={'batch_type': 'UG'}
        )
        batch_24_28.departments.add(course)
        
        BatchCourseCurriculum.objects.get_or_create(
            batch=batch_24_28,
            course=course,
            defaults={'status': 'FROZEN'}
        )

        # 5. Mark Batches & Records
        batch, _ = MarkBatch.objects.get_or_create(
            name='SEM 1 INTERNAL 1',
            academic_year='2024-25',
            defaults={'status': 'OPEN'}
        )
        batch.subjects.add(subj_math)

        MarkRecord.objects.get_or_create(
            batch=batch,
            student=student,
            subject=subj_math,
            defaults={'marks': 85, 'max_marks': 100, 'updated_by': staff}
        )

        # 5. Attendance
        today = date.today()
        att_rec, _ = AttendanceRecord.objects.get_or_create(
            user=student,
            date=today,
            defaults={'is_present': True, 'marked_by': staff}
        )
        for h in range(1, 8):
            HourAttendance.objects.get_or_create(record=att_rec, hour=h, defaults={'status': 'PRESENT'})

        # 6. Leave Requests
        LeaveRequest.objects.get_or_create(
            student=student,
            type='MEDICAL',
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=3),
            defaults={
                'reason': 'Fever and flu',
                'status': 'PENDING',
                'mentor': staff
            }
        )

        # 7. Timetable
        tt, _ = Timetable.objects.get_or_create(
            department='Artificial Intelligence & Data Science (B.Tech)',
            study_year='1st Year'
        )
        for h in range(1, 4):
            HourAssignment.objects.get_or_create(timetable=tt, hour=h, staff=staff)

        self.stdout.write(self.style.SUCCESS('Full institutional data seeded successfully'))

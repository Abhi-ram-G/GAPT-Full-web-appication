
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from registry.models import User, ExaminationTest, Course, AcademicBatch
from django.db.models import Q

def debug_student_list():
    test = ExaminationTest.objects.last()
    if not test:
        print("No tests found.")
        return

    print(f"DEBUGGING TEST: {test.title} (ID: {test.id})")
    print(f"Test Details -> Batch: {test.batch}, Year: {test.target_year}, Dept Object: {test.department}, Dept Name: {test.department.name if test.department else 'N/A'}")

    all_students = User.objects.filter(role='STUDENT')
    print(f"Total students in DB: {all_students.count()}")
    
    for s in all_students[:5]:
        print(f"Student: {s.name}, Batch: {s.batch}, Year: {s.study_year}, Dept: {s.department}, Course: {s.course}")

    # Step by step filtering
    students = all_students
    
    if test.batch:
        q = Q(batch=test.batch) | Q(study_year=test.target_year)
        students = students.filter(q)
        print(f"After Batch/Year filter: {students.count()}")
    elif test.target_year:
        students = students.filter(study_year=test.target_year)
        print(f"After Year filter: {students.count()}")

    if test.department:
        dept_query = Q(course=test.department)
        dept_words = test.department.name.split() if test.department.name else []
        if dept_words:
            dept_query |= Q(department__icontains=dept_words[0])
        students = students.filter(dept_query)
        print(f"After Dept filter: {students.count()}")

if __name__ == "__main__":
    debug_student_list()

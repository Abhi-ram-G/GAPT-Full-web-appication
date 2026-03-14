from registry.models import AcademicBatch, Course, Subject, User
from django.contrib.auth import get_user_model

def run():
    print("Starting Manual Seed...")
    # Ensure a course exists
    course, _ = Course.objects.get_or_create(
        name='Artificial Intelligence & Data Science',
        degree='B.Tech',
        defaults={'domain': 'Computing', 'batch_type': 'UG'}
    )
    print(f"Course: {course.name}")

    # Ensure batch exists
    batch, created = AcademicBatch.objects.get_or_create(
        name='Class of 2024 (Manual)',
        start_year=2020,
        end_year=2024,
        defaults={'batch_type': 'UG'}
    )
    batch.departments.add(course)
    print(f"Batch: {batch.name} (Created: {created})")

    # Ensure subjects exist
    subj, _ = Subject.objects.get_or_create(
        code='AD101 (Manual)',
        defaults={
            'name': 'Introduction to AI',
            'course': course,
            'semester': 1,
            'lessons_count': 5,
            'lesson_names': ['Lesson 1', 'Lesson 2', 'Lesson 3']
        }
    )
    print(f"Subject: {subj.name}")
    
    # Verify count
    print(f"Batch Count: {AcademicBatch.objects.count()}")

if __name__ == '__main__':
    run()

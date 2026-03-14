
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
# Try to find where settings is
try:
    import backend.settings
    print("Found backend.settings")
except:
    print("Could not find backend.settings")

django.setup()

from registry.models import User
students = User.objects.filter(role='STUDENT')
print(f"Count: {students.count()}")
for s in students:
    print(f"ID: {s.id}, Name: {s.name}, Dept: {s.department}, Year: {s.study_year}")

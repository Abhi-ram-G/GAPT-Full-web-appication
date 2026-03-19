
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
# Try to find where settings is
try:
    import core.settings
    print("Found core.settings")
except ImportError:
    print("Could not find core.settings")

django.setup()

from registry.models import User

students = User.objects.filter(role='STUDENT')
print(f"Count: {students.count()}")
for s in students:
    print(f"ID: {s.id}, Name: {s.name}, Dept: {s.department}, Year: {s.study_year}")

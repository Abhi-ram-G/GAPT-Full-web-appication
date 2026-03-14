
import os
import django
import sys

sys.path.append('e:/COLLEGE PROJECTS/GAPT Full web appication/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from registry.models import TestAttendance

try:
    cols = [f.name for f in TestAttendance._meta.get_fields()]
    print(f"Columns in TestAttendance: {cols}")
    if 'assigned_invigilator' in cols:
        print("Success: assigned_invigilator exists")
    else:
        print("Error: assigned_invigilator MISSING")
except Exception as e:
    print(f"Crash: {e}")

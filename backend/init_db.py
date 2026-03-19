import os
import django
import sys

# Add the current directory to sys.path to find 'core'
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from oauth2_provider.models import Application

User = get_user_model()

# Create superuser if not exists
ADMIN_ID = 'abhiram.ad23@bitsathy.ac.in'

if not User.objects.filter(username=ADMIN_ID).exists():
    User.objects.create_superuser(ADMIN_ID, ADMIN_ID, 'password', role='ADMIN')
    print(f"Superuser created: {ADMIN_ID} / password")
else:
    admin = User.objects.get(username=ADMIN_ID)
    admin.set_password('password')
    admin.role = 'ADMIN'
    admin.save()
    print(f"Admin password reset to 'password' for {ADMIN_ID}")

admin_user = User.objects.get(username=ADMIN_ID)
# Create OAuth2 application if not exists
app, created = Application.objects.update_or_create(
    client_id='GAPT_CLIENT_ID',
    defaults={
        'name': 'GAPT_APP',
        'client_secret': 'GAPT_CLIENT_SECRET',
        'client_type': Application.CLIENT_PUBLIC,
        'authorization_grant_type': Application.GRANT_PASSWORD,
        'user': admin_user,
        'skip_authorization': True
    }
)
print(f"OAuth2 Application {'created' if created else 'updated'}: GAPT_CLIENT_ID (PUBLIC)")

# Populate default permissions for ADMIN
from registry.models import RolePermission
from registry.models import User as RegistryUser

FEATURES = [
    'USER_DIRECTORY', 'STAFF_DIRECTORY', 'STUDENT_DIRECTORY', 'COHORT_REGISTRY',
    'ACCESS_REQUESTS', 'IDENTITY_CREATOR', 'INTERLINK_CONTROL', 'BRANDING_HUB',
    'ACCESS_MATRIX', 'MARK_ENTRY', 'ATTENDANCE_TRACKING', 'STUDY_MATERIALS',
    'STAFF_ASSIGNMENT', 'LEAVE_MANAGEMENT', 'ASSIGNMENTS', 'ACADEMIC_ANALYTICS',
    'GREEN_INSIGHTS', 'MENTOR_ASSIGNMENT', 'CHAT', 'EMAIL', 'SPREADSHEET',
    'EDIT_PROFILE', 'GRAND_ACCESS'
]

for feature in FEATURES:
    RolePermission.objects.update_or_create(
        role='ADMIN',
        feature=feature,
        defaults={'level': 'EDIT_ALL'}
    )
print("Default 'EDIT_ALL' permissions granted to ADMIN role.")

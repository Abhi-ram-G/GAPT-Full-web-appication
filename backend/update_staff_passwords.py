import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from registry.models import User

# List of roles to consider as 'staff' based on common project usage
staff_roles = [User.Role.STAFF, User.Role.HOD, User.Role.DEAN]
new_password = 'stfbitsathy'

staff_members = User.objects.filter(role__in=staff_roles)
count = 0

for member in staff_members:
    member.set_password(new_password)
    member.save()
    count += 1
    print(f"Updated: {member.email} ({member.role})")

print(f"\nSuccessfully updated {count} staff members to password: {new_password}")

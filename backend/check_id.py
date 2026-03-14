import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from registry.models import User, MembershipRequest
email = 'prabanand.ad23@bitsathy.ac.in'

user = User.objects.filter(email=email).first()
if user:
    print(f"USER_FOUND: {user.username}, Role: {user.role}, Status: {user.status}")
else:
    print("USER_NOT_FOUND")

req = MembershipRequest.objects.filter(email=email).first()
if req:
    print(f"REQUEST_FOUND: Status={req.status}, Timestamp={req.timestamp}")
else:
    print("REQUEST_NOT_FOUND")

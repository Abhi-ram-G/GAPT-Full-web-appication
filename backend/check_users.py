import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from registry.models import User
for u in User.objects.all():
    print(f"Username: {u.username}, Email: {u.email}, Status: {u.status}, Role: {u.role}")

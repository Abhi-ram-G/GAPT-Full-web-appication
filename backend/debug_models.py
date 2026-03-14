
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings') # Usually core.settings or backend.settings
django.setup()

from registry.models import User
print("Successfully imported User model")
print(f"User fields: {[f.name for f in User._meta.get_fields()]}")

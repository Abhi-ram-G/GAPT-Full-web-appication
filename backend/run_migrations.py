
import os
import django
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

try:
    print("Running makemigrations...")
    call_command('makemigrations', 'registry')
    print("Running migrate...")
    call_command('migrate', 'registry')
    print("Success!")
except Exception as e:
    print(f"Error: {e}")

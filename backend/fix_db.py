
import os
import django
import sys
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
try:
    django.setup()
except Exception as e:
    print(f"Setup Error: {e}")
    sys.exit(1)

print("--- Makemigrations ---")
try:
    call_command('makemigrations', 'registry')
except Exception as e:
    print(f"Makemigrations Error: {e}")

print("--- Migrate ---")
try:
    call_command('migrate', 'registry')
except Exception as e:
    print(f"Migrate Error: {e}")

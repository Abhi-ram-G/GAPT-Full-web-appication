
import os
import django
from io import StringIO
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command

out = StringIO()
err = StringIO()

try:
    print("Running makemigrations...")
    call_command('makemigrations', 'registry', stdout=out, stderr=err)
    print("makemigrations OK!")
    
    print("Running migrate...")
    call_command('migrate', stdout=out, stderr=err)
    print("migrate OK!")
except Exception as e:
    print(f"Exception occurred:\n{traceback.format_exc()}")

print("\n--- STDOUT ---")
print(out.getvalue())
print("\n--- STDERR ---")
print(err.getvalue())

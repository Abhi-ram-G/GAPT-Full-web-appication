
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

try:
    with connection.cursor() as cursor:
        cursor.execute("DESCRIBE registry_user")
        columns = [col[0] for col in cursor.fetchall()]
        print(f"Columns in registry_user: {columns}")
        if 'batch_id' in columns:
            print("SUCCESS: batch_id column exists!")
        else:
            print("FAILURE: batch_id column missing.")
except Exception as e:
    print(f"Error checking DB: {e}")

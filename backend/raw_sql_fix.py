
import os
import django
import sys
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def fix():
    with connection.cursor() as cursor:
        print("Checking TestAttendance table...")
        cursor.execute("DESCRIBE registry_testattendance")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        if 'assigned_invigilator_id' not in columns:
            print("Adding assigned_invigilator_id column...")
            # We assume the user table is registry_user. 
            # In Django, ForeignKey fields are fieldname_id
            try:
                cursor.execute("ALTER TABLE registry_testattendance ADD COLUMN assigned_invigilator_id INT NULL")
                cursor.execute("ALTER TABLE registry_testattendance ADD CONSTRAINT fk_invigilator FOREIGN KEY (assigned_invigilator_id) REFERENCES registry_user(id)")
                print("Column added successfully!")
            except Exception as e:
                print(f"Error adding column: {e}")
                # Try without constraint if it fails
                try:
                    cursor.execute("ALTER TABLE registry_testattendance ADD COLUMN assigned_invigilator_id INT NULL")
                    print("Column added (without constraint)!")
                except:
                    pass
        else:
            print("Column already exists.")

if __name__ == "__main__":
    fix()

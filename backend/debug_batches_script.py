import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from registry.models import AcademicBatch
with open('debug_batches.txt', 'w') as f:
    f.write(f"COUNT:{AcademicBatch.objects.count()}\n")
    for b in AcademicBatch.objects.all():
        f.write(f"BATCH:{b.id}:{b.name}\n")
print("DONE_CORE")

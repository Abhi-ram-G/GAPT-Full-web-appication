import os
import django
import sys

# Add the current directory to sys.path to find 'core'
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from oauth2_provider.models import Application

User = get_user_model()

# Create superuser if not exists
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'password', role='ADMIN')
    print("Superuser created: admin / password")
else:
    admin = User.objects.get(username='admin')
    admin.set_password('password')
    admin.role = 'ADMIN'
    admin.save()
    print("Admin password reset to 'password'")

# Create OAuth2 application if not exists
if not Application.objects.filter(name='GAPT_APP').exists():
    Application.objects.create(
        name='GAPT_APP',
        client_id='GAPT_CLIENT_ID',
        client_secret='GAPT_CLIENT_SECRET',
        client_type=Application.CLIENT_CONFIDENTIAL,
        authorization_grant_type=Application.GRANT_PASSWORD,
        user=User.objects.get(username='admin')
    )
    print("OAuth2 Application created: GAPT_CLIENT_ID")
else:
    app = Application.objects.get(name='GAPT_APP')
    app.client_id = 'GAPT_CLIENT_ID'
    app.client_secret = 'GAPT_CLIENT_SECRET'
    app.save()
    print("OAuth2 Application parameters updated")

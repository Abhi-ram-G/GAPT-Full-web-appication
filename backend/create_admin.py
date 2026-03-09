
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from registry.models import User
from oauth2_provider.models import Application

email = 'abhiram.ad23@bitsathy.ac.in'
password = 'password'

user, created = User.objects.get_or_create(
    email=email,
    defaults={
        'username': email,
        'first_name': 'Abhiram',
        'role': 'ADMIN',
        'is_staff': True,
        'is_superuser': True,
    }
)

if created or not user.check_password(password):
    user.set_password(password)
    user.save()
    print(f"User {email} created/updated with password {password}")
else:
    print(f"User {email} already exists with correct password")

# Also ensure OAuth2 Application exists
app, app_created = Application.objects.get_or_create(
    client_id='GAPT_CLIENT_ID',
    defaults={
        'name': 'GAPT Frontend',
        'client_type': 'confidential',
        'authorization_grant_type': 'password',
        'client_secret': 'GAPT_CLIENT_SECRET',
        'user': user,
        'skip_authorization': True
    }
)

if app_created:
    print("OAuth2 Application created")
else:
    # Ensure it's correct
    app.client_secret = 'GAPT_CLIENT_SECRET'
    app.authorization_grant_type = 'password'
    app.user = user
    app.skip_authorization = True
    app.save()
    print("OAuth2 Application updated")

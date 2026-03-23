import os
import socket
import warnings
import pymysql
from pathlib import Path

pymysql.install_as_MySQLdb()
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
CA_CERT_PATH_ENV = os.getenv('DB_SSL_CA')
CA_CERT_DATA = os.getenv('DB_SSL_CA_CERT')
DB_SSL_MODE = os.getenv('DB_SSL_MODE')

CA_CERT_PATH = None
if CA_CERT_PATH_ENV:
    CA_CERT_PATH = Path(CA_CERT_PATH_ENV)
elif CA_CERT_DATA:
    CA_CERT_PATH = Path('/tmp/aiven-ca.pem')
    pem_text = CA_CERT_DATA.replace('\\n', '\n')
    CA_CERT_PATH.write_text(pem_text, encoding='utf-8')

DB_MYSQL_OPTIONS = {
    'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
}

ssl_options = {}
if CA_CERT_PATH and CA_CERT_PATH.exists():
    ssl_options['ca'] = str(CA_CERT_PATH)
elif CA_CERT_DATA:
    CA_CERT_PATH = Path('/tmp/aiven-ca.pem')
    pem_text = CA_CERT_DATA.replace('\\n', '\n')
    CA_CERT_PATH.write_text(pem_text, encoding='utf-8')
    ssl_options['ca'] = str(CA_CERT_PATH)

if DB_SSL_MODE:
    ssl_options['ssl_mode'] = DB_SSL_MODE
if ssl_options:
    DB_MYSQL_OPTIONS['ssl'] = ssl_options

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key-change-this')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ImproperlyConfigured(
            f"Environment variable '{name}' is required in production but was not provided."
        )
    return value

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'oauth2_provider',
    'corsheaders',
    'django_filters',

    # Local apps
    'registry',
]

AUTH_USER_MODEL = 'registry.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'oauth2_provider.middleware.OAuth2TokenMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.mysql')
DB_HOST_OVERRIDE = os.getenv('DB_HOST')
DB_FORCE_SQLITE = os.getenv('DB_FORCE_SQLITE', 'False') == 'True'

if not DEBUG:
    for var in ('DB_ENGINE', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'):
        require_env(var)

def mysql_host_resolves(host: str | None) -> bool:
    if not host:
        return False
    try:
        socket.getaddrinfo(host, None)
        return True
    except socket.gaierror:
        return False

MYSQL_HOST_AVAILABLE = mysql_host_resolves(DB_HOST_OVERRIDE)

force_sqlite = DB_ENGINE == 'django.db.backends.sqlite3' or DB_FORCE_SQLITE or not MYSQL_HOST_AVAILABLE
if force_sqlite:
    SQLITE_NAME = os.getenv('DB_NAME') or os.path.join(BASE_DIR, 'db.sqlite3')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': SQLITE_NAME,
        }
    }
    warnings.warn("Using SQLite because MySQL host is not resolvable or forced.", RuntimeWarning)
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'gapt_db'),
            'USER': os.getenv('DB_USER', 'root'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': DB_HOST_OVERRIDE or 'localhost',
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': DB_MYSQL_OPTIONS,
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# OAuth2 Config
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'oauth2_provider.backends.OAuth2Backend',
)

OAUTH2_PROVIDER = {
    # this is the list of available scopes
    'SCOPES': {
        'read': 'Read scope',
        'write': 'Write scope',
        'groups': 'Access to your groups'
    }
}

# CORS Config
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,https://gapt-full-web-appication-t4tc.vercel.app,https://gapt-full-web-appication.onrender.com').split(',')
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOW_CREDENTIALS = True

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_OAUTH_REDIRECT_URI = os.getenv('GOOGLE_OAUTH_REDIRECT_URI', '')

OAUTH2_APPLICATION_CLIENT_ID = os.getenv('OAUTH2_APPLICATION_CLIENT_ID', 'GAPT_CLIENT_ID')

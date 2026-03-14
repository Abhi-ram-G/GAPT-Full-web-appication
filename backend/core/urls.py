from django.contrib import admin
from django.urls import path, include

from registry.views import CustomTokenView

urlpatterns = [
    path('gapt-admin/', admin.site.urls),
    path('o/token/', CustomTokenView.as_view(), name='token'),
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('api/', include('rest_framework.urls')),
    path('api/registry/', include('registry.urls')),
]

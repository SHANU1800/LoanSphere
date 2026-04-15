"""
Root URL configuration for LoanSphere.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/kyc/', include('kyc.urls')),
    path('api/fees/', include('fees.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/audit/', include('audit.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

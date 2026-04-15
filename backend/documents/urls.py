from django.urls import path
from . import views

urlpatterns = [
    path('application/<uuid:app_id>/', views.DocumentListView.as_view(), name='document-list'),
    path('upload/', views.DocumentUploadView.as_view(), name='document-upload'),
    path('<uuid:pk>/verify/', views.DocumentVerifyView.as_view(), name='document-verify'),
    path('request/<uuid:app_id>/', views.DocumentRequestView.as_view(), name='document-request'),
]

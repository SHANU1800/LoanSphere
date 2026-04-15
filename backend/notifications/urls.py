from django.urls import path
from . import views

urlpatterns = [
    path('', views.LegacyNotificationListView.as_view(), name='notifications-legacy-list'),
    path('mark-all-read/', views.MarkAllReadView.as_view(), name='notifications-mark-all-read'),
    path('templates/', views.NotificationTemplateListCreateView.as_view(), name='template-list-create'),
    path('templates/<uuid:pk>/', views.NotificationTemplateDetailView.as_view(), name='template-detail'),
    path('logs/', views.NotificationLogListView.as_view(), name='notification-logs'),
    path('emi-reminders/run/', views.TriggerEMIRemindersView.as_view(), name='trigger-emi-reminders'),
]

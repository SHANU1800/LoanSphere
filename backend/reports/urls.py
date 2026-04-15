from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('applications/', views.ApplicationReportView.as_view(), name='application-report'),
    path('fees/', views.FeeReportView.as_view(), name='fee-report'),
]

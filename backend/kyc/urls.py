from django.urls import path
from . import views

urlpatterns = [
    path('<uuid:app_id>/status/', views.KYCStatusView.as_view(), name='kyc-status'),
    path('<uuid:app_id>/verify-aadhaar/', views.TriggerAadhaarVerificationView.as_view(), name='verify-aadhaar'),
    path('<uuid:app_id>/verify-pan/', views.TriggerPanVerificationView.as_view(), name='verify-pan'),
    path('<uuid:app_id>/credit-check/', views.TriggerCreditCheckView.as_view(), name='credit-check'),
    path('<uuid:app_id>/credit-checks/', views.CreditCheckListView.as_view(), name='credit-check-list'),
]

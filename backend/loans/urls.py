from django.urls import path
from . import views

urlpatterns = [
    path('', views.LoanApplicationListCreateView.as_view(), name='loan-list-create'),
    path('<uuid:pk>/', views.LoanApplicationDetailView.as_view(), name='loan-detail'),
    path('<uuid:pk>/comments/', views.LoanCommentListCreateView.as_view(), name='loan-comments'),
    path('<uuid:pk>/submit/', views.SubmitApplicationView.as_view(), name='loan-submit'),
    path('<uuid:pk>/status/', views.UpdateStatusView.as_view(), name='loan-status'),
    path('<uuid:pk>/approve/', views.ApproveApplicationView.as_view(), name='loan-approve'),
    path('<uuid:pk>/reject/', views.RejectApplicationView.as_view(), name='loan-reject'),
    path('<uuid:pk>/disburse/', views.DisburseApplicationView.as_view(), name='loan-disburse'),
    path('<uuid:pk>/disbursal-ready/', views.MarkDisbursalReadyView.as_view(), name='loan-disbursal-ready'),
    path('<uuid:pk>/sanction-letter/', views.SanctionLetterView.as_view(), name='loan-sanction-letter'),
    path('<uuid:pk>/sanction-letter/pdf/', views.SanctionLetterPDFView.as_view(), name='loan-sanction-letter-pdf'),
    path('emi/calculate/', views.EMICalculatorView.as_view(), name='emi-calculator'),
]


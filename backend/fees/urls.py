from django.urls import path
from . import views

urlpatterns = [
    path('', views.FeeRecordListCreateView.as_view(), name='fee-list-create'),
    path('batch-reconcile/', views.BatchReconcileFeeView.as_view(), name='fee-batch-reconcile'),
    path('<uuid:pk>/', views.FeeRecordDetailView.as_view(), name='fee-detail'),
    path('<uuid:pk>/reconcile/', views.ReconcileFeeView.as_view(), name='fee-reconcile'),
]

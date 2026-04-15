from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count, Sum, Q, Avg, DurationField, ExpressionWrapper, F
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone as tz
from loans.models import LoanApplication
from fees.models import FeeRecord
from accounts.permissions import IsStaff


def _scoped_app_queryset(user):
    role = getattr(user, 'role', None)
    if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
        return LoanApplication.objects.all()
    if role == 'agent':
        return LoanApplication.objects.filter(agent=user)
    if role == 'customer' and user.email:
        return LoanApplication.objects.filter(customer_email__iexact=user.email)
    return LoanApplication.objects.none()


def _scoped_fee_queryset(user, apps_qs):
    role = getattr(user, 'role', None)
    if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
        return FeeRecord.objects.all()
    if role in ['agent', 'customer']:
        return FeeRecord.objects.filter(application__in=apps_qs)
    return FeeRecord.objects.none()


class DashboardStatsView(APIView):
    """Dashboard KPIs and summary stats."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        apps = _scoped_app_queryset(request.user)

        total = apps.count()
        status_counts = dict(
            apps.values_list('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        total_loan_amount = apps.filter(status='approved').aggregate(
            total=Sum('loan_amount')
        )['total'] or 0
        avg_loan_amount = apps.aggregate(avg=Avg('loan_amount'))['avg'] or 0

        fees = _scoped_fee_queryset(request.user, apps)
        total_fees = fees.aggregate(total=Sum('amount'))['total'] or 0
        pending_fees = fees.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

        pending_review = apps.filter(status__in=['submitted', 'under_review', 'kyc_verified', 'credit_checked']).count()
        disbursal_queue = apps.filter(status__in=['approved', 'disbursal_ready']).count()

        return Response({
            'total_applications': total,
            'pending_review': pending_review,
            'disbursal_queue': disbursal_queue,
            'status_breakdown': {
                'draft': status_counts.get('draft', 0),
                'submitted': status_counts.get('submitted', 0),
                'under_review': status_counts.get('under_review', 0),
                'kyc_verified': status_counts.get('kyc_verified', 0),
                'credit_checked': status_counts.get('credit_checked', 0),
                'approved': status_counts.get('approved', 0),
                'rejected': status_counts.get('rejected', 0),
                'disbursal_ready': status_counts.get('disbursal_ready', 0),
                'disbursed': status_counts.get('disbursed', 0),
            },
            'total_approved_amount': float(total_loan_amount),
            'average_loan_amount': round(float(avg_loan_amount), 2),
            'total_fees_collected': float(total_fees),
            'pending_fees': float(pending_fees),
        })


class ApplicationReportView(APIView):
    """Application reports by agent, region, and status."""
    permission_classes = [permissions.IsAuthenticated, IsStaff]

    def get(self, request):
        by_agent = list(
            LoanApplication.objects.values(
                'agent__first_name', 'agent__last_name'
            ).annotate(
                count=Count('id'),
                total_amount=Sum('loan_amount')
            ).order_by('-count')[:20]
        )

        by_status = list(
            LoanApplication.objects.values('status').annotate(
                count=Count('id'),
                total_amount=Sum('loan_amount')
            )
        )

        by_city = list(
            LoanApplication.objects.exclude(city='').values('city').annotate(
                count=Count('id')
            ).order_by('-count')[:15]
        )

        by_date = list(
            LoanApplication.objects.annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('-date')[:30]
        )

        return Response({
            'by_agent': by_agent,
            'by_status': by_status,
            'by_city': by_city,
            'by_date': [{'date': str(d['date']), 'count': d['count']} for d in by_date],
        })


class FeeReportView(APIView):
    """Fee collection and reconciliation reports."""
    permission_classes = [permissions.IsAuthenticated, IsStaff]

    def get(self, request):
        fees = FeeRecord.objects.all()

        by_status = list(
            fees.values('status').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
        )

        by_mode = list(
            fees.values('payment_mode').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
        )

        return Response({
            'by_status': by_status,
            'by_payment_mode': by_mode,
            'total_collected': float(fees.filter(status='reconciled').aggregate(total=Sum('amount'))['total'] or 0),
            'total_pending': float(fees.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0),
            'total_verified': float(fees.filter(status='verified').aggregate(total=Sum('amount'))['total'] or 0),
            'total_records': fees.count(),
        })

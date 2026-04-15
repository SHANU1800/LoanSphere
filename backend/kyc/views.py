from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.http import Http404
from django.utils import timezone
from .models import KYCRecord, CreditCheck
from .serializers import KYCRecordSerializer, CreditCheckSerializer
from .services import verify_aadhaar, verify_pan, check_credit_score
from loans.models import LoanApplication
from accounts.permissions import IsKYCProcessor


def _can_access_application(user, app):
    role = getattr(user, 'role', None)
    if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
        return True
    if role == 'agent':
        return app.agent_id == user.id
    if role == 'customer':
        return bool(user.email and app.customer_email and app.customer_email.lower() == user.email.lower())
    return False


class KYCStatusView(generics.RetrieveAPIView):
    """Get KYC status for an application."""
    serializer_class = KYCRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        app_id = self.kwargs.get('app_id')
        try:
            app = LoanApplication.objects.get(pk=app_id)
        except LoanApplication.DoesNotExist:
            raise Http404('Application not found.')
        if not _can_access_application(self.request.user, app):
            raise PermissionDenied('You are not authorized to access this application.')
        record, _ = KYCRecord.objects.get_or_create(application=app)
        return record


class TriggerAadhaarVerificationView(APIView):
    """Trigger Aadhaar verification for an application."""
    permission_classes = [permissions.IsAuthenticated, IsKYCProcessor]

    def post(self, request, app_id):
        try:
            app = LoanApplication.objects.get(pk=app_id)
            record, _ = KYCRecord.objects.get_or_create(application=app)

            result = verify_aadhaar(app.aadhaar_number)
            record.aadhaar_status = 'verified' if result['verified'] else 'failed'
            record.aadhaar_verified_at = timezone.now()
            record.aadhaar_response_data = result
            record.save()

            return Response({
                'message': 'Aadhaar verification completed.',
                'status': record.aadhaar_status,
                'data': result
            })
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class TriggerPanVerificationView(APIView):
    """Trigger PAN verification for an application."""
    permission_classes = [permissions.IsAuthenticated, IsKYCProcessor]

    def post(self, request, app_id):
        try:
            app = LoanApplication.objects.get(pk=app_id)
            record, _ = KYCRecord.objects.get_or_create(application=app)

            result = verify_pan(app.pan_number)
            record.pan_status = 'verified' if result['verified'] else 'failed'
            record.pan_verified_at = timezone.now()
            record.pan_response_data = result
            record.save()

            return Response({
                'message': 'PAN verification completed.',
                'status': record.pan_status,
                'data': result
            })
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class TriggerCreditCheckView(APIView):
    """Trigger CIBIL or CRIF credit check."""
    permission_classes = [permissions.IsAuthenticated, IsKYCProcessor]

    def post(self, request, app_id):
        bureau = (request.data.get('bureau', 'cibil') or 'cibil').lower()
        if bureau not in ['cibil', 'crif']:
            return Response({'error': 'Invalid bureau.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            app = LoanApplication.objects.get(pk=app_id)
            result = check_credit_score(bureau, app.pan_number)

            latest = CreditCheck.objects.filter(application=app, bureau=bureau).order_by('-created_at').first()
            if latest:
                latest.score = result['score']
                latest.status = 'completed'
                latest.raw_response = result
                latest.checked_at = timezone.now()
                latest.save(update_fields=['score', 'status', 'raw_response', 'checked_at'])
                credit_check = latest
            else:
                credit_check = CreditCheck.objects.create(
                    application=app,
                    bureau=bureau,
                    score=result['score'],
                    status='completed',
                    raw_response=result,
                    checked_at=timezone.now()
                )

            return Response({
                'message': f'{bureau.upper()} credit check completed.',
                'score': result['score'],
                'risk_category': result['risk_category'],
                'data': CreditCheckSerializer(credit_check).data
            })
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class CreditCheckListView(generics.ListAPIView):
    """List credit checks for an application."""
    serializer_class = CreditCheckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        app_id = self.kwargs.get('app_id')
        try:
            app = LoanApplication.objects.get(pk=app_id)
        except LoanApplication.DoesNotExist:
            return CreditCheck.objects.none()
        if not _can_access_application(self.request.user, app):
            return CreditCheck.objects.none()
        all_checks = CreditCheck.objects.filter(application_id=app_id).order_by('bureau', '-created_at')
        seen = set()
        latest_ids = []
        for check in all_checks:
            if check.bureau in seen:
                continue
            seen.add(check.bureau)
            latest_ids.append(check.id)
        return CreditCheck.objects.filter(id__in=latest_ids).order_by('-created_at')

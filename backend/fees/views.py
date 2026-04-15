from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q
import csv
import io
from .models import FeeRecord
from .serializers import FeeRecordSerializer, FeeReconciliationSerializer
from accounts.permissions import IsAdminOrFinance


class FeeRecordListCreateView(generics.ListCreateAPIView):
    """List or create fee records."""
    serializer_class = FeeRecordSerializer

    def get_queryset(self):
        user = self.request.user
        qs = FeeRecord.objects.all()
        if user.role == 'agent':
            qs = qs.filter(recorded_by=user)
        app_id = self.request.query_params.get('application')
        if app_id:
            qs = qs.filter(application_id=app_id)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class FeeRecordDetailView(generics.RetrieveAPIView):
    """Get fee record detail."""
    serializer_class = FeeRecordSerializer
    queryset = FeeRecord.objects.all()


class ReconcileFeeView(APIView):
    """Finance: reconcile a fee record."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFinance]

    def patch(self, request, pk):
        serializer = FeeReconciliationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            fee = FeeRecord.objects.get(pk=pk)
            fee.status = serializer.validated_data['status']
            fee.reconciliation_notes = serializer.validated_data.get('notes', '')
            fee.reconciled_by = request.user
            fee.reconciled_at = timezone.now()
            fee.save()
            return Response({'message': f'Fee marked as {fee.get_status_display()}.'})
        except FeeRecord.DoesNotExist:
            return Response({'error': 'Fee record not found.'}, status=status.HTTP_404_NOT_FOUND)


class BatchReconcileFeeView(APIView):
    """Finance: reconcile fee records against uploaded bank/branch statement CSV."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrFinance]

    def post(self, request):
        statement = request.FILES.get('statement')
        if not statement:
            return Response({'error': 'Statement file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = statement.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
        except Exception:
            return Response({'error': 'Invalid CSV file.'}, status=status.HTTP_400_BAD_REQUEST)

        required_cols = {'transaction_reference', 'amount'}
        if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
            return Response(
                {'error': 'CSV must contain headers: transaction_reference, amount (optional: payment_date).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matched = 0
        unmatched = 0
        processed = 0

        for row in reader:
            tx_ref = (row.get('transaction_reference') or '').strip()
            amt_raw = (row.get('amount') or '').strip()
            payment_date = (row.get('payment_date') or '').strip()

            if not tx_ref or not amt_raw:
                continue

            try:
                amount = float(amt_raw)
            except ValueError:
                continue

            processed += 1

            qs = FeeRecord.objects.filter(
                Q(status='pending') | Q(status='verified'),
                transaction_reference__iexact=tx_ref,
                amount=amount,
            )
            if payment_date:
                qs = qs.filter(payment_date=payment_date)

            fee = qs.order_by('-created_at').first()
            if fee:
                fee.status = 'reconciled'
                fee.reconciled_by = request.user
                fee.reconciled_at = timezone.now()
                note = f"Auto-reconciled via statement: {statement.name}"
                fee.reconciliation_notes = f"{fee.reconciliation_notes}\n{note}".strip()
                fee.save(update_fields=['status', 'reconciled_by', 'reconciled_at', 'reconciliation_notes', 'updated_at'])
                matched += 1
            else:
                unmatched += 1

        return Response({
            'message': 'Statement reconciliation completed.',
            'file_name': statement.name,
            'rows_processed': processed,
            'matched': matched,
            'unmatched': unmatched,
        })

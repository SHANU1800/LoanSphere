from rest_framework import serializers
from .models import FeeRecord


class FeeRecordSerializer(serializers.ModelSerializer):
    payment_mode_display = serializers.CharField(source='get_payment_mode_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    reconciled_by_name = serializers.SerializerMethodField()
    applicant_id = serializers.CharField(source='application.applicant_id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = FeeRecord
        fields = [
            'id', 'application', 'applicant_id', 'customer_name',
            'amount', 'payment_mode', 'payment_mode_display',
            'receipt_image', 'receipt_image_url', 'branch_name', 'transaction_reference', 'payment_date',
            'status', 'status_display', 'reconciliation_notes',
            'recorded_by', 'recorded_by_name', 'reconciled_by', 'reconciled_by_name',
            'reconciled_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'recorded_by', 'reconciled_by', 'reconciled_at',
            'created_at', 'updated_at'
        ]

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() if obj.recorded_by else None

    def get_reconciled_by_name(self, obj):
        return obj.reconciled_by.get_full_name() if obj.reconciled_by else None

    def get_customer_name(self, obj):
        app = obj.application
        if app:
            return f"{app.customer_first_name} {app.customer_last_name}".strip()
        return None

    def get_receipt_image_url(self, obj):
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None


class FeeReconciliationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['verified', 'reconciled', 'rejected'])
    notes = serializers.CharField(required=False, allow_blank=True)

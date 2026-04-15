from rest_framework import serializers
from .models import KYCRecord, CreditCheck


class KYCRecordSerializer(serializers.ModelSerializer):
    is_fully_verified = serializers.ReadOnlyField()

    class Meta:
        model = KYCRecord
        fields = [
            'id', 'application', 'aadhaar_status', 'aadhaar_verified_at',
            'aadhaar_response_data', 'pan_status', 'pan_verified_at',
            'pan_response_data', 'is_fully_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreditCheckSerializer(serializers.ModelSerializer):
    bureau_display = serializers.CharField(source='get_bureau_display', read_only=True)

    class Meta:
        model = CreditCheck
        fields = [
            'id', 'application', 'bureau', 'bureau_display', 'score',
            'status', 'raw_response', 'checked_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TriggerKYCSerializer(serializers.Serializer):
    verification_type = serializers.ChoiceField(choices=['aadhaar', 'pan'])


class TriggerCreditCheckSerializer(serializers.Serializer):
    bureau = serializers.ChoiceField(choices=CreditCheck.Bureau.choices)

from rest_framework import serializers
from .models import LoanApplication, LoanComment


class LoanApplicationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    agent_name = serializers.SerializerMethodField()
    customer_full_name = serializers.ReadOnlyField()

    class Meta:
        model = LoanApplication
        fields = [
            'id', 'applicant_id', 'customer_full_name', 'customer_phone',
            'loan_amount', 'loan_tenure_months', 'status', 'agent_name',
            'employment_type', 'city', 'state', 'created_at', 'submitted_at'
        ]

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() if obj.agent else None


class LoanApplicationDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/update views."""
    agent_name = serializers.SerializerMethodField()
    customer_full_name = serializers.ReadOnlyField()

    class Meta:
        model = LoanApplication
        fields = '__all__'
        read_only_fields = [
            'id', 'applicant_id', 'loan_account_number', 'agent',
            'submitted_at', 'approved_at', 'rejected_at',
            'created_at', 'updated_at'
        ]

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() if obj.agent else None


class LoanStatusUpdateSerializer(serializers.Serializer):
    """Serializer for status change actions."""
    status = serializers.ChoiceField(choices=LoanApplication.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class LoanApprovalSerializer(serializers.Serializer):
    """Serializer for loan approval action."""
    underwriting_notes = serializers.CharField(required=False, allow_blank=True)


class LoanRejectionSerializer(serializers.Serializer):
    """Serializer for loan rejection action."""
    rejection_reason = serializers.CharField(required=True)


class LoanCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LoanComment
        fields = ['id', 'text', 'user_name', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name else (obj.user.email or obj.user.username)


class LoanCommentCreateSerializer(serializers.Serializer):
    text = serializers.CharField(required=True, allow_blank=False, max_length=5000)

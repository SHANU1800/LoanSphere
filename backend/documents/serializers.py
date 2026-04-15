from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    verification_status_display = serializers.CharField(
        source='get_verification_status_display', read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id', 'application', 'doc_type', 'doc_type_display', 'file',
            'file_name', 'file_size', 'version', 'verification_status',
            'verification_status_display', 'verification_notes',
            'uploaded_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']


class DocumentVerificationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Document.VerificationStatus.choices)
    notes = serializers.CharField(required=False, allow_blank=True)

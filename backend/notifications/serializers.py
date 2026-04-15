from rest_framework import serializers
from .models import NotificationTemplate, NotificationLog


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'template_type', 'channel', 'subject',
            'body_template', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'application', 'recipient_user', 'template', 'channel', 'recipient',
            'subject', 'body', 'status', 'error_message',
            'sent_at', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LegacyNotificationSerializer(serializers.ModelSerializer):
    """Backward-compatible payload for legacy UI expecting /notifications/ shape."""
    title = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    loan_application = serializers.UUIDField(source='application_id', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = NotificationLog
        fields = ['id', 'title', 'message', 'is_read', 'loan_application', 'created_at']

    def get_title(self, obj):
        return obj.subject or 'Notification'

    def get_message(self, obj):
        return obj.body or ''

    def get_is_read(self, obj):
        return bool(obj.is_read)

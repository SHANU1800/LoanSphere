import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Audit trail for all important actions in the system."""

    class ActionType(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        APPROVE = 'approve', 'Approve'
        REJECT = 'reject', 'Reject'
        VERIFY = 'verify', 'Verify'
        UPLOAD = 'upload', 'Upload'
        DOWNLOAD = 'download', 'Download'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ActionType.choices)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else 'System'
        return f"{user_str} - {self.get_action_display()} - {self.model_name} ({self.timestamp})"

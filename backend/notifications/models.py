import uuid
from django.db import models
from django.conf import settings


class NotificationTemplate(models.Model):
    """Editable notification templates for different communication types."""

    class Channel(models.TextChoices):
        SMS = 'sms', 'SMS'
        EMAIL = 'email', 'Email'
        WHATSAPP = 'whatsapp', 'WhatsApp'

    class TemplateType(models.TextChoices):
        APPLICANT_ID = 'applicant_id', 'Applicant ID Created'
        APPLICATION_APPROVED = 'approved', 'Application Approved'
        APPLICATION_REJECTED = 'rejected', 'Application Rejected'
        DOCUMENT_REQUEST = 'doc_request', 'Document Request'
        EMI_REMINDER = 'emi_reminder', 'EMI Reminder'
        SANCTION_LETTER = 'sanction_letter', 'Sanction Letter'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=30, choices=TemplateType.choices)
    channel = models.CharField(max_length=20, choices=Channel.choices)
    subject = models.CharField(max_length=255, blank=True)
    body_template = models.TextField(
        help_text="Use placeholders: {customer_name}, {applicant_id}, {loan_amount}, {emi_date}"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['template_type', 'channel']
        ordering = ['template_type']

    def __str__(self):
        return f"{self.name} ({self.get_channel_display()})"


class NotificationLog(models.Model):
    """Log of all notifications sent."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        'loans.LoanApplication', on_delete=models.CASCADE,
        related_name='notification_logs', null=True, blank=True
    )
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_notifications',
    )
    template = models.ForeignKey(
        NotificationTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )
    channel = models.CharField(max_length=20, choices=NotificationTemplate.Channel.choices)
    recipient = models.CharField(max_length=200)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_channel_display()} to {self.recipient} ({self.get_status_display()})"

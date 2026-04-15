"""
Signals for the loans app — keeps AgentProfile statistics in sync
and creates notification log entries on key status changes.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import LoanApplication


def _resolve_recipient_user(application):
    """Try to map notification target to a concrete user record."""
    User = get_user_model()

    if application.customer_email:
        user = User.objects.filter(email__iexact=application.customer_email).first()
        if user:
            return user

    if application.customer_phone:
        user = User.objects.filter(phone=application.customer_phone).first()
        if user:
            return user

    return None


@receiver(post_save, sender=LoanApplication)
def update_agent_stats(sender, instance, **kwargs):
    """Update agent's application counters whenever a LoanApplication is saved."""
    agent = instance.agent
    if agent is None:
        return

    try:
        profile = agent.agent_profile
    except Exception:
        return

    profile.total_applications = LoanApplication.objects.filter(
        agent=agent
    ).exclude(status=LoanApplication.Status.DRAFT).count()

    profile.approved_applications = LoanApplication.objects.filter(
        agent=agent,
        status__in=[
            LoanApplication.Status.APPROVED,
            LoanApplication.Status.DISBURSAL_READY,
            LoanApplication.Status.DISBURSED,
        ]
    ).count()

    profile.save(update_fields=['total_applications', 'approved_applications'])


@receiver(post_save, sender=LoanApplication)
def create_status_notification(sender, instance, created, **kwargs):
    """Create a NotificationLog entry when an application is approved or rejected."""
    if created:
        return  # Only fire on updates

    try:
        from notifications.models import NotificationTemplate, NotificationLog

        status_to_type = {
            LoanApplication.Status.APPROVED: NotificationTemplate.TemplateType.APPLICATION_APPROVED,
            LoanApplication.Status.REJECTED: NotificationTemplate.TemplateType.APPLICATION_REJECTED,
            LoanApplication.Status.SUBMITTED: NotificationTemplate.TemplateType.APPLICANT_ID,
        }

        template_type = status_to_type.get(instance.status)
        if not template_type:
            return

        # Try to find a matching template; if none, still create a log with defaults
        recipient = instance.customer_phone or instance.customer_email or 'N/A'
        if not recipient or recipient == 'N/A':
            return

        # Prefer email channel
        channel = NotificationTemplate.Channel.EMAIL if instance.customer_email else NotificationTemplate.Channel.SMS

        try:
            template = NotificationTemplate.objects.get(
                template_type=template_type,
                channel=channel,
                is_active=True,
            )
            ctx = {
                'customer_name': instance.customer_full_name,
                'applicant_id': instance.applicant_id,
                'loan_amount': str(instance.loan_amount or ''),
                'loan_account_number': instance.loan_account_number or '',
                'rejection_reason': instance.rejection_reason or '',
            }
            body = template.body_template
            for k, v in ctx.items():
                body = body.replace(f'{{{k}}}', v)
            subject = template.subject
        except NotificationTemplate.DoesNotExist:
            template = None
            subject = f"Loan Application {instance.status.replace('_', ' ').title()}"
            body = (
                f"Dear {instance.customer_full_name}, your application "
                f"{instance.applicant_id} has been {instance.status.replace('_', ' ')}."
            )
            if instance.rejection_reason:
                body += f" Reason: {instance.rejection_reason}"

        NotificationLog.objects.create(
            application=instance,
            recipient_user=_resolve_recipient_user(instance),
            template=template,
            channel=channel,
            recipient=instance.customer_email or instance.customer_phone,
            subject=subject,
            body=body,
            status=NotificationLog.Status.PENDING,  # Will be 'sent' by actual gateway
        )
    except Exception:
        pass  # Never crash the main request due to notification errors

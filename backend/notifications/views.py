from datetime import date
from calendar import monthrange
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import NotificationTemplate, NotificationLog
from .serializers import NotificationTemplateSerializer, NotificationLogSerializer, LegacyNotificationSerializer
from accounts.permissions import IsAdmin
from loans.models import LoanApplication


def _recipient_identities(user):
    identities = []
    if getattr(user, 'email', None):
        identities.append(user.email.strip().lower())
    if getattr(user, 'phone', None):
        identities.append(user.phone.strip().lower())
    return identities


def _notification_queryset_for_user(user):
    role = getattr(user, 'role', None)
    qs = NotificationLog.objects.all()
    if role == 'admin':
        return qs

    identities = _recipient_identities(user)
    filters = Q(recipient_user=user)
    for identity in identities:
        filters |= Q(recipient__iexact=identity)
    return qs.filter(filters)


def _resolve_recipient_user_from_contact(email=None, phone=None):
    User = get_user_model()
    if email:
        user = User.objects.filter(email__iexact=email).first()
        if user:
            return user
    if phone:
        user = User.objects.filter(phone=phone).first()
        if user:
            return user
    return None


class NotificationTemplateListCreateView(generics.ListCreateAPIView):
    """List or create notification templates."""
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = NotificationTemplate.objects.all()


class NotificationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete a notification template."""
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = NotificationTemplate.objects.all()


class NotificationLogListView(generics.ListAPIView):
    """List notification logs with filtering."""
    serializer_class = NotificationLogSerializer

    def _scoped_app_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', None)

        if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
            return LoanApplication.objects.all()
        if role == 'agent':
            return LoanApplication.objects.filter(agent=user)
        if role == 'customer' and user.email:
            return LoanApplication.objects.filter(customer_email__iexact=user.email)
        return LoanApplication.objects.none()

    def get_queryset(self):
        qs = _notification_queryset_for_user(self.request.user)

        if getattr(self.request.user, 'role', None) != 'admin':
            scoped_apps = self._scoped_app_queryset()
            qs = qs.filter(Q(application__in=scoped_apps) | Q(application__isnull=True))

        app_id = self.request.query_params.get('application')
        if app_id:
            qs = qs.filter(application_id=app_id)
        channel = self.request.query_params.get('channel')
        if channel:
            qs = qs.filter(channel=channel)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            normalized = str(is_read).strip().lower()
            if normalized in ['true', '1', 'yes']:
                qs = qs.filter(is_read=True)
            elif normalized in ['false', '0', 'no']:
                qs = qs.filter(is_read=False)
        return qs


class LegacyNotificationListView(NotificationLogListView):
    """Compatibility endpoint for older clients using /api/notifications/."""
    serializer_class = LegacyNotificationSerializer


class MarkAllReadView(APIView):
    """Compatibility endpoint for older clients using /api/notifications/mark-all-read/."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qs = _notification_queryset_for_user(request.user).filter(is_read=False)
        now = timezone.now()
        updated = qs.update(is_read=True, read_at=now)
        return Response({'message': 'All notifications marked as read.', 'updated': updated})


class TriggerEMIRemindersView(APIView):
    """Admin: trigger EMI reminder generation for applications due in 2-3 days."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        today = timezone.localdate()
        due_day = 5

        # Compute next due date based on fixed due day in current/next month
        year, month = today.year, today.month
        max_day_current = monthrange(year, month)[1]
        current_due_day = min(due_day, max_day_current)
        current_due_date = date(year, month, current_due_day)

        if current_due_date < today:
            if month == 12:
                year, month = year + 1, 1
            else:
                month += 1
            max_day_next = monthrange(year, month)[1]
            next_due_date = date(year, month, min(due_day, max_day_next))
        else:
            next_due_date = current_due_date

        days_until_due = (next_due_date - today).days
        if days_until_due not in [2, 3]:
            return Response({
                'message': 'No reminders due today. Reminders are sent 2-3 days before EMI date.',
                'today': str(today),
                'next_due_date': str(next_due_date),
                'days_until_due': days_until_due,
                'created_logs': 0,
            })

        template = NotificationTemplate.objects.filter(
            template_type=NotificationTemplate.TemplateType.EMI_REMINDER,
            is_active=True,
        ).first()

        eligible_apps = LoanApplication.objects.filter(
            status__in=[
                LoanApplication.Status.APPROVED,
                LoanApplication.Status.DISBURSAL_READY,
                LoanApplication.Status.DISBURSED,
            ]
        )

        created = 0
        skipped = 0

        for app in eligible_apps:
            # Avoid duplicate reminder for same app/day
            already_exists = NotificationLog.objects.filter(
                application=app,
                created_at__date=today,
                subject__icontains='EMI Reminder'
            ).exists()
            if already_exists:
                skipped += 1
                continue

            recipient = app.customer_email or app.customer_phone
            if not recipient:
                skipped += 1
                continue

            channel = NotificationTemplate.Channel.EMAIL if app.customer_email else NotificationTemplate.Channel.SMS

            if template and template.channel == channel:
                body = template.body_template
                body = body.replace('{customer_name}', app.customer_full_name)
                body = body.replace('{applicant_id}', app.applicant_id)
                body = body.replace('{loan_amount}', str(app.loan_amount or ''))
                body = body.replace('{emi_date}', next_due_date.strftime('%d-%m-%Y'))
                subject = template.subject or 'EMI Reminder'
                log_template = template
            else:
                subject = 'EMI Reminder'
                body = (
                    f"Dear {app.customer_full_name}, this is a reminder that your EMI is due on "
                    f"{next_due_date.strftime('%d-%m-%Y')} for loan {app.loan_account_number or app.applicant_id}."
                )
                log_template = None

            NotificationLog.objects.create(
                application=app,
                recipient_user=_resolve_recipient_user_from_contact(app.customer_email, app.customer_phone),
                template=log_template,
                channel=channel,
                recipient=recipient,
                subject=subject,
                body=body,
                status=NotificationLog.Status.PENDING,
            )
            created += 1

        return Response({
            'message': 'EMI reminder run completed.',
            'today': str(today),
            'next_due_date': str(next_due_date),
            'days_until_due': days_until_due,
            'created_logs': created,
            'skipped': skipped,
        })

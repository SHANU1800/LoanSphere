import uuid
from django.db import models
from django.conf import settings


class FeeRecord(models.Model):
    """Non-refundable application fee record."""

    class PaymentMode(models.TextChoices):
        CASH = 'cash', 'Cash'
        BRANCH_DEPOSIT = 'branch_deposit', 'Branch Deposit'
        ONLINE = 'online', 'Online Transfer'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        RECONCILED = 'reconciled', 'Reconciled'
        REJECTED = 'rejected', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        'loans.LoanApplication', on_delete=models.CASCADE, related_name='fee_records'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices)
    receipt_image = models.ImageField(upload_to='receipts/%Y/%m/%d/', blank=True, null=True)
    branch_name = models.CharField(max_length=200, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    reconciliation_notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='recorded_fees'
    )
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reconciled_fees'
    )
    reconciled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Fee ₹{self.amount} - {self.application.applicant_id} ({self.get_status_display()})"

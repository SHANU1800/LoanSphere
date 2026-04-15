import uuid
from django.db import models


class KYCRecord(models.Model):
    """Aadhaar/PAN verification record."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(
        'loans.LoanApplication', on_delete=models.CASCADE, related_name='kyc_record'
    )
    aadhaar_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    aadhaar_verified_at = models.DateTimeField(null=True, blank=True)
    aadhaar_response_data = models.JSONField(default=dict, blank=True)

    pan_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    pan_verified_at = models.DateTimeField(null=True, blank=True)
    pan_response_data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC - {self.application.applicant_id}"

    @property
    def is_fully_verified(self):
        return (
            self.aadhaar_status == self.Status.VERIFIED and
            self.pan_status == self.Status.VERIFIED
        )


class CreditCheck(models.Model):
    """CIBIL/CRIF credit check record."""

    class Bureau(models.TextChoices):
        CIBIL = 'cibil', 'CIBIL'
        CRIF = 'crif', 'CRIF'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        'loans.LoanApplication', on_delete=models.CASCADE, related_name='credit_checks'
    )
    bureau = models.CharField(max_length=10, choices=Bureau.choices)
    score = models.IntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    raw_response = models.JSONField(default=dict, blank=True)
    checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_bureau_display()} - {self.application.applicant_id} - Score: {self.score}"

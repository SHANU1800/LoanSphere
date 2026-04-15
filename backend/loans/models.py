import uuid
from django.db import models
from django.conf import settings


class LoanApplication(models.Model):
    """Core loan application model tracking the full lifecycle."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        UNDER_REVIEW = 'under_review', 'Under Review'
        KYC_VERIFIED = 'kyc_verified', 'KYC Verified'
        CREDIT_CHECKED = 'credit_checked', 'Credit Checked'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        DISBURSAL_READY = 'disbursal_ready', 'Disbursal Ready'
        DISBURSED = 'disbursed', 'Disbursed'

    class EmploymentType(models.TextChoices):
        SALARIED = 'salaried', 'Salaried'
        SELF_EMPLOYED = 'self_employed', 'Self Employed'
        BUSINESS = 'business', 'Business Owner'
        PROFESSIONAL = 'professional', 'Professional'
        AGRICULTURE = 'agriculture', 'Agriculture'
        RETIRED = 'retired', 'Retired'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant_id = models.CharField(max_length=20, unique=True, blank=True)
    loan_account_number = models.CharField(max_length=30, unique=True, null=True, blank=True)

    # Agent reference
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='loan_applications'
    )

    # Customer basic info
    customer_first_name = models.CharField(max_length=100)
    customer_last_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=15)
    customer_email = models.EmailField(blank=True)
    customer_dob = models.DateField(null=True, blank=True)
    customer_gender = models.CharField(max_length=10, blank=True)

    # Identity
    aadhaar_number = models.CharField(max_length=12, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)

    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    # Employment & Income
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, blank=True
    )
    employer_name = models.CharField(max_length=200, blank=True)
    employer_address = models.CharField(max_length=500, blank=True)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    annual_income = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Loan details
    loan_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loan_tenure_months = models.IntegerField(default=12)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    loan_purpose = models.CharField(max_length=255, blank=True)

    # Bank details (post-approval)
    bank_account_number = models.CharField(max_length=30, blank=True)
    bank_ifsc = models.CharField(max_length=15, blank=True)
    bank_account_holder = models.CharField(max_length=200, blank=True)
    bank_name = models.CharField(max_length=200, blank=True)

    # Status & workflow
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    rejection_reason = models.TextField(blank=True)
    underwriting_notes = models.TextField(blank=True)

    # Timestamps
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.applicant_id:
            # Generate sequential applicant ID: APP-YYYYMMDD-XXXX
            from django.utils import timezone
            today = timezone.now().strftime('%Y%m%d')
            count = LoanApplication.objects.filter(
                applicant_id__startswith=f'APP-{today}'
            ).count() + 1
            self.applicant_id = f'APP-{today}-{count:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.applicant_id} - {self.customer_first_name} {self.customer_last_name}"

    @property
    def customer_full_name(self):
        return f"{self.customer_first_name} {self.customer_last_name}"


class LoanComment(models.Model):
    """Internal notes/comments on a loan application timeline."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loan_comments',
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.application.applicant_id} - {self.user.get_full_name() or self.user.email}"

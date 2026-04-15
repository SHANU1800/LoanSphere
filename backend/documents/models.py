import uuid
from django.db import models
from django.conf import settings


class Document(models.Model):
    """Document uploaded for a loan application."""

    class DocType(models.TextChoices):
        AADHAAR = 'aadhaar', 'Aadhaar Card'
        PAN = 'pan', 'PAN Card'
        ADDRESS_PROOF = 'address_proof', 'Address Proof'
        INCOME_PROOF = 'income_proof', 'Income Proof'
        CUSTOMER_PHOTO = 'customer_photo', 'Customer Photo'
        BANK_STATEMENT = 'bank_statement', 'Bank Statement'
        SALARY_SLIP = 'salary_slip', 'Salary Slip'
        DISBURSAL_FORM = 'disbursal_form', 'Disbursal Form'
        SLA_DOCUMENT = 'sla_document', 'SLA Document'
        FEE_RECEIPT = 'fee_receipt', 'Fee Receipt'
        OTHER = 'other', 'Other'

    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        'loans.LoanApplication', on_delete=models.CASCADE, related_name='documents'
    )
    doc_type = models.CharField(max_length=30, choices=DocType.choices)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(default=0)
    version = models.IntegerField(default=1)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    verification_notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_doc_type_display()} - {self.application.applicant_id}"

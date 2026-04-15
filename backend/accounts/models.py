import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """Custom user model with role-based access control."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        AGENT = 'agent', 'Agent'
        UNDERWRITER = 'underwriter', 'Underwriter'
        CREDIT_MANAGER = 'credit_manager', 'Credit Manager'
        FINANCE = 'finance', 'Finance'
        OPERATIONS = 'operations', 'Operations'
        COMPLIANCE_OFFICER = 'compliance_officer', 'Compliance Officer'
        CUSTOMER = 'customer', 'Customer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENT)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


class AgentProfile(models.Model):
    """Extended profile for field agents."""

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='agent_profile')
    agent_code = models.CharField(max_length=20, unique=True, blank=True)
    region = models.CharField(max_length=100, blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    language_preference = models.CharField(max_length=10, default='en')
    total_applications = models.IntegerField(default=0)
    approved_applications = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.agent_code:
            self.agent_code = f"AGT-{str(self.user.id)[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Agent: {self.user.get_full_name()} ({self.agent_code})"

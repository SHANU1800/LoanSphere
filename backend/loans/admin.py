from django.contrib import admin
from .models import LoanApplication, LoanComment


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'applicant_id', 'customer_first_name', 'customer_last_name',
        'loan_amount', 'status', 'agent', 'created_at'
    ]
    list_filter = ['status', 'employment_type', 'city', 'state']
    search_fields = ['applicant_id', 'customer_first_name', 'customer_last_name', 'customer_phone']
    readonly_fields = ['applicant_id', 'loan_account_number']


@admin.register(LoanComment)
class LoanCommentAdmin(admin.ModelAdmin):
    list_display = ['application', 'user', 'created_at']
    search_fields = ['application__applicant_id', 'user__email', 'text']
    list_filter = ['created_at']

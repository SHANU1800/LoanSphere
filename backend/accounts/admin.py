from django.contrib import admin
from .models import CustomUser, AgentProfile


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_approved', 'is_active', 'created_at']
    list_filter = ['role', 'is_approved', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']


@admin.register(AgentProfile)
class AgentProfileAdmin(admin.ModelAdmin):
    list_display = ['agent_code', 'user', 'region', 'total_applications', 'approved_applications']
    search_fields = ['agent_code', 'user__email', 'region']

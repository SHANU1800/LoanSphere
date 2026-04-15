from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'agent'


class IsUnderwriter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'underwriter'


class IsFinance(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'finance'


class IsOperations(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'operations'


class IsComplianceOfficer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'compliance_officer'


class IsAuditViewer(BasePermission):
    """Users who can view platform audit logs."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'compliance_officer']


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'customer'


class IsAdminOrUnderwriter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'underwriter', 'credit_manager']


class IsAdminOrFinance(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'finance']


class IsAdminOrAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'agent']


class IsKYCProcessor(BasePermission):
    """Users who can trigger KYC and credit bureau verification."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            'admin', 'underwriter', 'credit_manager', 'compliance_officer'
        ]


class IsStaff(BasePermission):
    """Any non-agent staff member."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            'admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer'
        ]

import json
from .models import AuditLog


class AuditMiddleware:
    """Middleware to automatically log important API actions."""

    AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.method in self.AUDIT_METHODS and
            hasattr(request, 'user') and
            request.user.is_authenticated and
            request.path.startswith('/api/') and
            response.status_code < 400
        ):
            try:
                action = self._get_action(request.method, request.path)
                AuditLog.objects.create(
                    user=request.user,
                    action=action,
                    model_name=self._get_model_name(request.path),
                    description=f"{request.method} {request.path}",
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                )
            except Exception:
                pass  # Don't break the request if audit logging fails

        return response

    def _get_action(self, method, path):
        if 'approve' in path:
            return 'approve'
        if 'reject' in path:
            return 'reject'
        if 'verify' in path:
            return 'verify'
        if method == 'POST':
            return 'create'
        if method in ('PUT', 'PATCH'):
            return 'update'
        if method == 'DELETE':
            return 'delete'
        return 'update'

    def _get_model_name(self, path):
        parts = [p for p in path.split('/') if p and p != 'api']
        return parts[0] if parts else ''

    def _get_client_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

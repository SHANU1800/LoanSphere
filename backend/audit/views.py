from rest_framework import generics, permissions, serializers
from .models import AuditLog
from accounts.permissions import IsAuditViewer


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'model_name',
            'object_id', 'description', 'changes', 'ip_address',
            'user_agent', 'timestamp'
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'


class AuditLogListView(generics.ListAPIView):
    """Admin: view audit logs with filtering."""
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuditViewer]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        model = self.request.query_params.get('model')
        if model:
            qs = qs.filter(model_name=model)
        from_date = self.request.query_params.get('from_date')
        if from_date:
            qs = qs.filter(timestamp__date__gte=from_date)
        to_date = self.request.query_params.get('to_date')
        if to_date:
            qs = qs.filter(timestamp__date__lte=to_date)
        return qs

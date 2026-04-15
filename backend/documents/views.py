from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied
from .models import Document
from .serializers import DocumentSerializer, DocumentVerificationSerializer
from accounts.permissions import IsStaff
from loans.models import LoanApplication


def _can_access_application(user, app):
    role = getattr(user, 'role', None)
    if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
        return True
    if role == 'agent':
        return app.agent_id == user.id
    if role == 'customer':
        return bool(user.email and app.customer_email and app.customer_email.lower() == user.email.lower())
    return False


class DocumentListView(generics.ListAPIView):
    """List documents for a specific application."""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        app_id = self.kwargs.get('app_id')
        try:
            app = LoanApplication.objects.get(pk=app_id)
        except LoanApplication.DoesNotExist:
            return Document.objects.none()
        if not _can_access_application(self.request.user, app):
            raise PermissionDenied('You are not authorized to access this application.')
        return Document.objects.filter(application_id=app_id)


class DocumentUploadView(generics.CreateAPIView):
    """Upload a document for an application."""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        app = serializer.validated_data.get('application')
        if not app or not _can_access_application(self.request.user, app):
            raise PermissionDenied('You are not authorized to upload documents for this application.')

        uploaded_file = self.request.FILES.get('file')
        serializer.save(
            uploaded_by=self.request.user,
            file_name=uploaded_file.name if uploaded_file else '',
            file_size=uploaded_file.size if uploaded_file else 0
        )


class DocumentVerifyView(APIView):
    """Admin: verify or reject a document."""
    permission_classes = [permissions.IsAuthenticated, IsStaff]

    def patch(self, request, pk):
        serializer = DocumentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            doc = Document.objects.get(pk=pk)
            if not _can_access_application(request.user, doc.application):
                return Response({'error': 'You are not authorized to verify this document.'}, status=status.HTTP_403_FORBIDDEN)
            doc.verification_status = serializer.validated_data['status']
            doc.verification_notes = serializer.validated_data.get('notes', '')
            doc.save()
            return Response({'message': f'Document {doc.get_verification_status_display()}.'})
        except Document.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)


class DocumentRequestView(APIView):
    """Admin: request additional documents from the agent for an application."""
    permission_classes = [permissions.IsAuthenticated, IsStaff]

    def post(self, request, app_id):
        try:
            app = LoanApplication.objects.get(pk=app_id)
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_application(request.user, app):
            return Response({'error': 'You are not authorized to request documents for this application.'}, status=status.HTTP_403_FORBIDDEN)

        doc_types = request.data.get('doc_types', [])
        message = request.data.get('message', '').strip()

        if not doc_types and not message:
            return Response({'error': 'Provide at least one document type or a message.'}, status=status.HTTP_400_BAD_REQUEST)

        doc_list = ', '.join(doc_types) if doc_types else 'Additional documents'
        full_message = f"Document Request — {doc_list}"
        if message:
            full_message += f": {message}"

        # Append to underwriting notes for tracking and agent visibility
        from django.utils import timezone
        note_entry = f"\n[{timezone.now().strftime('%d %b %Y %H:%M')}] Document requested by {request.user.get_full_name() or request.user.email}: {full_message}"
        app.underwriting_notes = (app.underwriting_notes or '') + note_entry
        app.save(update_fields=['underwriting_notes'])

        return Response({
            'message': 'Document request sent to agent.',
            'request_details': full_message,
        })

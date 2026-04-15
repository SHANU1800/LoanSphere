from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import LoanApplication, LoanComment
from .serializers import (
    LoanApplicationListSerializer, LoanApplicationDetailSerializer,
    LoanStatusUpdateSerializer, LoanApprovalSerializer, LoanRejectionSerializer,
    LoanCommentSerializer, LoanCommentCreateSerializer
)
from accounts.permissions import IsAdmin, IsAdminOrUnderwriter, IsAdminOrAgent, IsAgent


def _can_access_application(user, app):
    role = getattr(user, 'role', None)
    if role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
        return True
    if role == 'agent':
        return app.agent_id == user.id
    if role == 'customer':
        return bool(user.email and app.customer_email and app.customer_email.lower() == user.email.lower())
    return False


class LoanApplicationListCreateView(generics.ListCreateAPIView):
    """List all loan applications or create a new one."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'employment_type', 'city', 'state']
    search_fields = ['applicant_id', 'customer_first_name', 'customer_last_name', 'customer_phone']
    ordering_fields = ['created_at', 'loan_amount', 'status']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LoanApplicationDetailSerializer
        return LoanApplicationListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'agent':
            return LoanApplication.objects.filter(agent=user)
        if user.role == 'customer':
            return LoanApplication.objects.filter(customer_email__iexact=user.email)
        if user.role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
            return LoanApplication.objects.all()
        return LoanApplication.objects.all()

    def perform_create(self, serializer):
        if self.request.user.role not in ['agent', 'admin']:
            raise PermissionDenied('Only agents or admins can create applications.')
        serializer.save(agent=self.request.user)


class LoanApplicationDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a loan application."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanApplicationDetailSerializer
    queryset = LoanApplication.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'agent':
            return LoanApplication.objects.filter(agent=user)
        if user.role == 'customer':
            return LoanApplication.objects.filter(customer_email__iexact=user.email)
        if user.role in ['admin', 'underwriter', 'credit_manager', 'finance', 'operations', 'compliance_officer']:
            return LoanApplication.objects.all()
        return LoanApplication.objects.none()

    def update(self, request, *args, **kwargs):
        if request.user.role in ['customer', 'finance', 'compliance_officer', 'underwriter', 'credit_manager']:
            raise PermissionDenied('You do not have permission to update this application.')
        return super().update(request, *args, **kwargs)


class SubmitApplicationView(APIView):
    """Agent: submit a draft application."""
    permission_classes = [permissions.IsAuthenticated, IsAgent]

    def post(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk, agent=request.user)
            if app.status != LoanApplication.Status.DRAFT:
                return Response(
                    {'error': 'Only draft applications can be submitted.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            app.status = LoanApplication.Status.SUBMITTED
            app.submitted_at = timezone.now()
            app.save()
            return Response({'message': 'Application submitted successfully.', 'applicant_id': app.applicant_id})
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class UpdateStatusView(APIView):
    """Admin: update application status."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrUnderwriter]

    def patch(self, request, pk):
        serializer = LoanStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            app = LoanApplication.objects.get(pk=pk)
            app.status = serializer.validated_data['status']
            if serializer.validated_data.get('notes'):
                app.underwriting_notes = serializer.validated_data['notes']
            app.save()
            return Response({'message': f'Status updated to {app.get_status_display()}.'})
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class ApproveApplicationView(APIView):
    """Admin/Underwriter: approve a loan application."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrUnderwriter]

    def post(self, request, pk):
        serializer = LoanApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            app = LoanApplication.objects.get(pk=pk)
            if app.status in [LoanApplication.Status.APPROVED, LoanApplication.Status.REJECTED]:
                return Response(
                    {'error': 'Application already processed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            app.status = LoanApplication.Status.APPROVED
            app.approved_at = timezone.now()
            if serializer.validated_data.get('underwriting_notes'):
                app.underwriting_notes = serializer.validated_data['underwriting_notes']
            # Generate Loan Account Number
            count = LoanApplication.objects.filter(
                loan_account_number__isnull=False
            ).count() + 1
            app.loan_account_number = f"LAN-{timezone.now().strftime('%Y%m')}-{count:06d}"
            app.save()
            return Response({
                'message': 'Application approved.',
                'loan_account_number': app.loan_account_number
            })
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class RejectApplicationView(APIView):
    """Admin/Underwriter: reject a loan application."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrUnderwriter]

    def post(self, request, pk):
        serializer = LoanRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            app = LoanApplication.objects.get(pk=pk)
            if app.status in [LoanApplication.Status.APPROVED, LoanApplication.Status.REJECTED]:
                return Response(
                    {'error': 'Application already processed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            app.status = LoanApplication.Status.REJECTED
            app.rejected_at = timezone.now()
            app.rejection_reason = serializer.validated_data['rejection_reason']
            app.save()
            return Response({'message': 'Application rejected.'})
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class DisburseApplicationView(APIView):
    """Admin: mark an approved application as disbursed."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrUnderwriter]

    def post(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
            if app.status not in [LoanApplication.Status.APPROVED, LoanApplication.Status.DISBURSAL_READY]:
                return Response(
                    {'error': 'Only approved or disbursal-ready applications can be disbursed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            app.status = LoanApplication.Status.DISBURSED
            app.save()
            return Response({'message': 'Application marked as disbursed.', 'status': 'disbursed'})
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class MarkDisbursalReadyView(APIView):
    """Admin: mark an approved application as disbursal-ready."""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrUnderwriter]

    def post(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
            if app.status != LoanApplication.Status.APPROVED:
                return Response(
                    {'error': 'Only approved applications can be marked as disbursal-ready.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            app.status = LoanApplication.Status.DISBURSAL_READY
            app.save()
            return Response({'message': 'Application marked as disbursal-ready.'})
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class SanctionLetterView(APIView):
    """Generate sanction letter data for an approved loan application."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
            if not _can_access_application(request.user, app):
                return Response({'error': 'You are not authorized to access this application.'}, status=status.HTTP_403_FORBIDDEN)
            if app.status not in [
                LoanApplication.Status.APPROVED,
                LoanApplication.Status.DISBURSAL_READY,
                LoanApplication.Status.DISBURSED,
            ]:
                return Response(
                    {'error': 'Sanction letter is only available for approved or disbursed applications.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from django.utils import timezone as tz
            import math

            principal = float(app.loan_amount)
            rate = float(app.interest_rate)
            tenure = int(app.loan_tenure_months)
            monthly_rate = rate / (12 * 100)
            if monthly_rate > 0 and tenure > 0:
                emi = principal * monthly_rate * (1 + monthly_rate) ** tenure / (
                    (1 + monthly_rate) ** tenure - 1
                )
            else:
                emi = 0

            total_payable = emi * tenure
            total_interest = total_payable - principal

            return Response({
                'letter_date': tz.now().strftime('%d %B %Y'),
                'applicant_id': app.applicant_id,
                'loan_account_number': app.loan_account_number or 'Pending Assignment',
                'applicant_name': f"{app.customer_first_name} {app.customer_last_name}",
                'applicant_phone': app.customer_phone,
                'applicant_email': app.customer_email,
                'applicant_address': ', '.join(filter(bool, [
                    app.address_line1, app.address_line2, app.city, app.state, app.pincode
                ])),
                'pan_number': f"{app.pan_number[:2]}******{app.pan_number[-2:]}" if app.pan_number and len(app.pan_number) >= 10 else app.pan_number,
                'aadhaar_masked': f"XXXX-XXXX-{app.aadhaar_number[-4:]}" if app.aadhaar_number else '',
                'loan_amount': float(app.loan_amount),
                'loan_purpose': app.loan_purpose,
                'interest_rate': float(app.interest_rate),
                'tenure_months': app.loan_tenure_months,
                'emi': round(emi, 2),
                'total_payable': round(total_payable, 2),
                'total_interest': round(total_interest, 2),
                'approved_at': app.approved_at.strftime('%d %B %Y') if app.approved_at else '',
                'employment_type': app.employment_type,
                'employer_name': app.employer_name,
                'monthly_income': float(app.monthly_income),
                'bank_account_number': app.bank_account_number,
                'bank_ifsc': app.bank_ifsc,
                'bank_name': app.bank_name,
                'status': app.status,
            })
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class SanctionLetterPDFView(APIView):
    """Generate sanction letter PDF for an approved/disbursed loan application."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
            if not _can_access_application(request.user, app):
                return Response({'error': 'You are not authorized to access this application.'}, status=status.HTTP_403_FORBIDDEN)
            if app.status not in [
                LoanApplication.Status.APPROVED,
                LoanApplication.Status.DISBURSAL_READY,
                LoanApplication.Status.DISBURSED,
            ]:
                return Response(
                    {'error': 'Sanction letter PDF is only available for approved or disbursed applications.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from io import BytesIO
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            from reportlab.pdfgen import canvas

            principal = float(app.loan_amount)
            rate = float(app.interest_rate)
            tenure = int(app.loan_tenure_months)
            monthly_rate = rate / (12 * 100)
            if monthly_rate > 0 and tenure > 0:
                emi = principal * monthly_rate * (1 + monthly_rate) ** tenure / (
                    (1 + monthly_rate) ** tenure - 1
                )
            else:
                emi = 0
            total_payable = emi * tenure
            total_interest = total_payable - principal

            buffer = BytesIO()
            c = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            y = height - 20 * mm
            c.setFont('Helvetica-Bold', 16)
            c.drawString(20 * mm, y, 'LOAN SANCTION LETTER')
            y -= 8 * mm
            c.setFont('Helvetica', 10)
            c.drawString(20 * mm, y, f"Date: {timezone.now().strftime('%d %B %Y')}")
            y -= 6 * mm
            c.drawString(20 * mm, y, f"Applicant ID: {app.applicant_id}")
            y -= 6 * mm
            c.drawString(20 * mm, y, f"Loan Account No: {app.loan_account_number or 'Pending Assignment'}")

            y -= 12 * mm
            c.setFont('Helvetica-Bold', 11)
            c.drawString(20 * mm, y, 'Applicant Details')
            y -= 6 * mm
            c.setFont('Helvetica', 10)
            c.drawString(20 * mm, y, f"Name: {app.customer_full_name}")
            y -= 5 * mm
            c.drawString(20 * mm, y, f"Phone: {app.customer_phone or '-'}")
            y -= 5 * mm
            c.drawString(20 * mm, y, f"Email: {app.customer_email or '-'}")

            y -= 10 * mm
            c.setFont('Helvetica-Bold', 11)
            c.drawString(20 * mm, y, 'Loan Terms')
            y -= 6 * mm
            c.setFont('Helvetica', 10)
            rows = [
                ('Loan Amount', f"INR {principal:,.2f}"),
                ('Interest Rate', f"{rate:.2f}% p.a."),
                ('Tenure', f"{tenure} months"),
                ('Monthly EMI', f"INR {emi:,.2f}"),
                ('Total Payable', f"INR {total_payable:,.2f}"),
                ('Total Interest', f"INR {total_interest:,.2f}"),
                ('Loan Purpose', app.loan_purpose or '-'),
            ]
            for key, value in rows:
                c.drawString(20 * mm, y, f"{key}: {value}")
                y -= 5 * mm

            y -= 8 * mm
            c.setFont('Helvetica', 9)
            c.drawString(20 * mm, y, 'Terms: Subject to successful completion of all required KYC and disbursal formalities.')

            y -= 18 * mm
            c.setFont('Helvetica', 10)
            c.drawString(20 * mm, y, 'Authorized Signatory')
            c.drawString(120 * mm, y, 'Applicant Signature')

            c.showPage()
            c.save()
            buffer.seek(0)

            filename = f"sanction_letter_{app.applicant_id}.pdf"
            return FileResponse(buffer, as_attachment=True, filename=filename, content_type='application/pdf')
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)


class EMICalculatorView(APIView):
    """Calculate EMI for given loan parameters."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            principal = float(request.data.get('loan_amount', 0))
            rate = float(request.data.get('interest_rate', 0))
            tenure = int(request.data.get('tenure_months', 12))

            if principal <= 0 or rate <= 0 or tenure <= 0:
                return Response(
                    {'error': 'All values must be positive.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            monthly_rate = rate / (12 * 100)
            emi = principal * monthly_rate * (1 + monthly_rate) ** tenure / (
                (1 + monthly_rate) ** tenure - 1
            )
            total_payable = emi * tenure
            total_interest = total_payable - principal

            return Response({
                'emi': round(emi, 2),
                'total_payable': round(total_payable, 2),
                'total_interest': round(total_interest, 2),
                'principal': principal,
                'interest_rate': rate,
                'tenure_months': tenure,
            })
        except (ValueError, TypeError, ZeroDivisionError):
            return Response(
                {'error': 'Invalid input values.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LoanCommentListCreateView(APIView):
    """List/add comments for a specific loan application."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_application(request.user, app):
            return Response({'error': 'You are not authorized to access this application.'}, status=status.HTTP_403_FORBIDDEN)

        comments = LoanComment.objects.filter(application=app).select_related('user')
        serializer = LoanCommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        try:
            app = LoanApplication.objects.get(pk=pk)
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_application(request.user, app):
            return Response({'error': 'You are not authorized to access this application.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = LoanCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = LoanComment.objects.create(
            application=app,
            user=request.user,
            text=serializer.validated_data['text'].strip(),
        )
        return Response(LoanCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

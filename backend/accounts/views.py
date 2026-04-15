from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate, get_user_model
from .serializers import (
    UserRegistrationSerializer, UserSerializer,
    AgentProfileSerializer, LoginSerializer, ChangePasswordSerializer
)
from .models import AgentProfile
from .permissions import IsAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user (agent registration pending admin approval)."""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Registration successful. Pending admin approval.' if user.role == 'agent' else 'Registration successful.'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Email + password login returning JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        if user is None:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if not user.is_active:
            return Response(
                {'error': 'Account is deactivated.'},
                status=status.HTTP_403_FORBIDDEN
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user profile."""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Admin: list all users with filtering."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class AgentListView(generics.ListAPIView):
    """Admin: list all agents with profiles."""
    serializer_class = AgentProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = AgentProfile.objects.select_related('user').all()


class ApproveAgentView(APIView):
    """Admin: approve a pending agent."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, role='agent')
            user.is_approved = True
            user.save()
            return Response({'message': f'Agent {user.get_full_name()} approved.'})
        except User.DoesNotExist:
            return Response(
                {'error': 'Agent not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class LogoutView(APIView):
    """Logout by blacklisting the refresh token."""

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass  # Token already invalid — still return success
        return Response({'message': 'Logged out successfully.'})


class DeactivateUserView(APIView):
    """Admin: deactivate/activate a user account."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.is_active = not user.is_active
            user.save()
            action = 'activated' if user.is_active else 'deactivated'
            return Response({'message': f'User {user.get_full_name()} {action}.'})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class ChangePasswordView(APIView):
    """Change password for authenticated user."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})

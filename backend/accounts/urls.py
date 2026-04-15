from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:user_id>/toggle-active/', views.DeactivateUserView.as_view(), name='toggle-user-active'),
    path('agents/', views.AgentListView.as_view(), name='agent-list'),
    path('agents/<uuid:user_id>/approve/', views.ApproveAgentView.as_view(), name='approve-agent'),
]

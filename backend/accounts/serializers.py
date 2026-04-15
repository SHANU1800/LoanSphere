from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AgentProfile

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'confirm_password',
            'first_name', 'last_name', 'phone', 'role'
        ]

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.role == User.Role.AGENT:
            AgentProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'phone', 'role', 'is_approved', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class AgentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AgentProfile
        fields = [
            'id', 'user', 'agent_code', 'region', 'device_id',
            'language_preference', 'total_applications', 'approved_applications',
            'created_at'
        ]
        read_only_fields = ['id', 'agent_code', 'total_applications', 'approved_applications']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

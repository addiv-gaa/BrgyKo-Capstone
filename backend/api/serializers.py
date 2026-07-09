from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CertificateRequest, PermitRequest

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Everything below this line MUST be indented with 4 or 8 spaces!
        print(f"DEBUG: Generating token for user: {user.username}")
        
        token = super().get_token(user)
        
        roles_list = list(user.groups.values_list('name', flat=True))
        print(f"DEBUG: Found roles: {roles_list}")
        
        token['roles'] = roles_list
        return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {"password": {"write_only": True}}

    def create(self,validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class CertificateRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CertificateRequest
        fields = '__all__'

class PermitRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PermitRequest
        fields = '__all__'
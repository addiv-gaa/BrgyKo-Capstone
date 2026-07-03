from django.contrib.auth.models import User
from rest_framework import serializers

from .models import CertificateRequest

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
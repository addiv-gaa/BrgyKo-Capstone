from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from .models import CertificateRequest, PermitRequest, InventoryItem, Announcement, ReadAnnouncement, Household

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Everything below this line MUST be indented with 4 or 8 spaces!
        print(f"DEBUG: Generating token for user: {user.username}")
        
        token = super().get_token(user)
        
        roles_list = list(user.groups.values_list('name', flat=True))
        token['username'] = user.username
        token['first_name'] = user.first_name
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

from rest_framework import serializers
from .models import InventoryItem

class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'

class AnnouncementSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'category', 'created_at', 'is_read']

    def get_is_read(self, obj):
        user = self.context['request'].user
        if user.is_anonymous:
            return False
        return ReadAnnouncement.objects.filter(user=user, announcement=obj).exists()
    
class HouseholdSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Household
        # CRITICAL: Tell the serializer which field holds the geometry
        geo_field = "location" 
        
        # We can safely use '__all__' to include the new boolean flags, 
        # housing_status, dwelling_type, etc., in the properties object.
        fields = '__all__'
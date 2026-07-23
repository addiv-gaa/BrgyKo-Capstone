from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from .models import (
    CertificateRequest, 
    PermitRequest,  
    Announcement, 
    ReadAnnouncement, 
    Household, 
    Resident,
    Facility, 
    Equipment, 
    Event, 
    Reservation,
    OfficialDocument, 
)

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

class ResidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = '__all__'

# --- 2. Mini Resident Serializer (Nested inside the Map Details Panel) ---
class ResidentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = [
            'id', 'first_name', 'last_name', 'sex', 'civil_status', 'relationship_to_head',
            'is_4ps_beneficiary', 'has_senior_citizen', 'has_pwd', 'has_solo_parent'
        ]
    
class HouseholdSerializer(GeoFeatureModelSerializer):
    # Nest the residents inside the household payload
    residents = ResidentMiniSerializer(many=True, read_only=True)
    
    # Dynamically calculate the fields we removed from the database model
    head_of_household = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    
    # Dynamically bubble up the vulnerability flags to color the map markers
    is_4ps_beneficiary = serializers.SerializerMethodField()
    has_senior_citizen = serializers.SerializerMethodField()
    has_pwd = serializers.SerializerMethodField()
    has_solo_parent = serializers.SerializerMethodField()

    class Meta:
        model = Household
        geo_field = 'location' # Tells DRF-GIS which field holds the coordinates
        fields = [
            'id', 'address', 'housing_status', 'dwelling_type', 
            'head_of_household', 'member_count', 'residents',
            'is_4ps_beneficiary', 'has_senior_citizen', 'has_pwd', 'has_solo_parent'
        ]

    # --- Dynamic Calculation Methods ---
    def get_head_of_household(self, obj):
        # Look through the attached residents and find the head
        head = obj.residents.filter(relationship_to_head='Head').first()
        if head:
            return f"{head.first_name} {head.last_name}"
        return "No Head Assigned"

    def get_member_count(self, obj):
        return obj.residents.count()

    def get_is_4ps_beneficiary(self, obj):
        # Returns True if ANY resident in this house is a 4Ps beneficiary
        return obj.residents.filter(is_4ps_beneficiary=True).exists()

    def get_has_senior_citizen(self, obj):
        return obj.residents.filter(has_senior_citizen=True).exists()

    def get_has_pwd(self, obj):
        return obj.residents.filter(has_pwd=True).exists()

    def get_has_solo_parent(self, obj):
        return obj.residents.filter(has_solo_parent=True).exists()
    
class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = '__all__'

class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = '__all__'

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['organizer', 'created_at']

class ReservationSerializer(serializers.ModelSerializer):
    facility_name = serializers.ReadOnlyField(source='facility.name')
    equipment_name = serializers.ReadOnlyField(source='equipment.name')
    
    class Meta:
        model = Reservation
        fields = '__all__'
        # Security enhancement: prevents users from injecting their own approved status or manipulating timestamps/user binding.
        read_only_fields = ['user', 'status', 'date_requested']

class OfficialDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficialDocument
        fields = [
            'id', 'title', 'file', 'file_name', 'document_type', 
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'is_archived' # Added is_archived
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            name = f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
            return name if name else obj.uploaded_by.username
        return "Unknown"

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return None
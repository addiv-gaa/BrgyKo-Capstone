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
    ProfileUpdateRequest,
    IncidentReport,
    BarangaySettings, # NEW: Imported IncidentReport
)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Inject user details
        token['username'] = user.username
        token['first_name'] = user.first_name
        
        # --- CHANGED: Extract the specific RBAC role from the UserProfile ---
        try:
            role = user.otp_profile.role
        except Exception:
            role = 'RESIDENT' # Fallback if profile is missing
            
        token['role'] = role 
        
        print(f"DEBUG: Generating token for {user.username} with role: {role}")
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
        # NEW: Protect tracking and admin fields from user manipulation
        read_only_fields = ['status', 'rejection_reason', 'date_requested']

class PermitRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PermitRequest
        fields = '__all__'
        # NEW: Protect tracking and admin fields
        read_only_fields = ['status', 'rejection_reason', 'date_requested']

class EventNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['start_time', 'end_time']

class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    linked_event_details = EventNestedSerializer(source='linked_event', read_only=True) # NEW: Pulls start/end time
    
    class Meta:
        model = Announcement
        fields = [
            'id', 
            'title', 
            'content', 
            'categories',      
            'is_urgent',       
            'tags',            
            'attachment',      
            'linked_event',    
            'linked_event_details', # NEW field for the frontend card
            'created_at', 
            'author', 
            'author_name'
        ]
        read_only_fields = ['author', 'created_at']

    def get_is_read(self, obj):
        user = self.context['request'].user
        if user.is_anonymous:
            return False
        return ReadAnnouncement.objects.filter(user=user, announcement=obj).exists()


# --- 1. Admin Resident Serializer (Full Access) ---
class ResidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = '__all__'

# --- 2. User-Facing Profile Serializer (Locked Down) ---
class ResidentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = [
            'first_name', 
            'last_name', 
            'birth_date', 
            'civil_status', 
            'sex', 
            'contact_number', 
            'purok', 
            'approval_status',
            'rejection_reason' # NEW: Expose rejection reason so they know why it failed
        ]
        # Protect official data from being changed via the web form
        read_only_fields = [
            'first_name', 
            'last_name', 
            'birth_date', 
            'civil_status', 
            'sex', 
            'purok', 
            'approval_status',
            'rejection_reason'
        ]

# --- 3. Mini Resident Serializer (Nested inside the Map Details Panel) ---
class ResidentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = [
            'id', 'first_name', 'last_name', 'sex', 'civil_status', 'relationship_to_head',
            'is_4ps_beneficiary', 'has_senior_citizen', 'has_pwd', 'has_solo_parent'
        ]
    
class HouseholdSerializer(GeoFeatureModelSerializer):
    residents = ResidentMiniSerializer(many=True, read_only=True)
    
    head_of_household = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    is_4ps_beneficiary = serializers.SerializerMethodField()
    has_senior_citizen = serializers.SerializerMethodField()
    has_pwd = serializers.SerializerMethodField()
    has_solo_parent = serializers.SerializerMethodField()

    class Meta:
        model = Household
        geo_field = 'location' 
        fields = [
            'id', 'address', 'housing_status', 'dwelling_type', 
            'head_of_household', 'member_count', 'residents',
            'is_4ps_beneficiary', 'has_senior_citizen', 'has_pwd', 'has_solo_parent'
        ]

    def get_head_of_household(self, obj):
        head = obj.residents.filter(relationship_to_head='Head').first()
        if head:
            return f"{head.first_name} {head.last_name}"
        return "No Head Assigned"

    def get_member_count(self, obj):
        return obj.residents.count()

    def get_is_4ps_beneficiary(self, obj):
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
        # NEW: Added rejection_reason to protected fields
        read_only_fields = ['user', 'status', 'rejection_reason', 'date_requested']

class OfficialDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficialDocument
        fields = [
            'id', 'title', 'file', 'file_name', 'document_type', 
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'is_archived' 
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

class ProfileUpdateRequestSerializer(serializers.ModelSerializer):
    resident_name = serializers.SerializerMethodField()

    class Meta:
        model = ProfileUpdateRequest
        fields = '__all__'
        # NEW: Added rejection_reason
        read_only_fields = ['user', 'resident', 'created_at', 'rejection_reason']

    def get_resident_name(self, obj):
        return f"{obj.resident.first_name} {obj.resident.last_name}"

# --- NEW: Incident Report Serializer ---
class IncidentReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentReport
        fields = '__all__'
        # Protect admin-only fields from being set by the resident
        read_only_fields = ['user', 'status', 'resolution_notes', 'created_at', 'updated_at']

    def get_reporter_name(self, obj):
        if obj.user.first_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.username

class BarangaySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarangaySettings
        fields = '__all__'
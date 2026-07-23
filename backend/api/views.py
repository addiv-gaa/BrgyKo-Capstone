from django.conf import settings
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import google.generativeai as genai

from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import UserRateThrottle
from .permissions import IsAdminGroup, IsStaffGroup
from rest_framework.views import APIView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Sum, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics

from .models import (
    CertificateRequest, 
    PermitRequest, 
    AiQueryStatistic,  
    Announcement, 
    ReadAnnouncement, 
    Household,
    Resident,
    Facility, 
    Equipment, 
    Reservation,
    Event,
    OfficialDocument,
)

from .serializers import (
    CertificateRequestSerializer, 
    PermitRequestSerializer, 
    UserSerializer, 
    AnnouncementSerializer, 
    HouseholdSerializer,
    ResidentSerializer,
    ReservationSerializer,
    FacilitySerializer, 
    EquipmentSerializer, 
    EventSerializer,
    OfficialDocumentSerializer,
)


genai.configure(api_key=settings.GOOGLE_API_KEY)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# --- User Facing Views (Filtered to their own requests) ---
class CertificateRequestView(generics.ListCreateAPIView):
    queryset = CertificateRequest.objects.all()
    serializer_class = CertificateRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CertificateRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class PermitRequestView(generics.ListCreateAPIView):
    queryset = PermitRequest.objects.all()
    serializer_class = PermitRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PermitRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class SystemSettingsView(APIView):
    permission_classes = [IsAdminGroup]

    def post(self, request):
        return Response({"message": "System settings updated."})
    
# --- Manager Views (Full Access via ViewSets) ---
class CertificateRequestManagerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffGroup]
    queryset = CertificateRequest.objects.all().order_by('date_requested')
    serializer_class = CertificateRequestSerializer

class PermitRequestManagerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffGroup]
    queryset = PermitRequest.objects.all().order_by('date_requested')
    serializer_class = PermitRequestSerializer
    
class AiChatThrottle(UserRateThrottle):
    scope = 'ai_chat'

class AiAssistantView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AiChatThrottle]

    def post(self, request):
        user_prompt = request.data.get('prompt')
        
        if not user_prompt:
            return Response({"error": "Prompt is required"}, status=400)

        try:
            system_instruction = """
            You are the official AI Assistant for BarangayKo. 
            Your job is to help residents with local government services.
            You can answer questions about:
            - Certificate requirements (Clearance, Residency, Indigency).
            - Permit procedures and fees.
            - Standard office hours (Monday to Friday, 8 AM to 5 PM).
            - Welfare programs.
            Keep your answers concise, friendly, and professional. 
            If someone asks a question completely unrelated to the barangay or local government, politely decline to answer and redirect them to barangay services.
            """

            model = genai.GenerativeModel(
                model_name="gemini-3.1-flash-lite",
                system_instruction=system_instruction
            )

            chat_response = model.generate_content(user_prompt)
            ai_response_text = chat_response.text

            AiQueryStatistic.objects.create(
                user=request.user,
                prompt=user_prompt,
                response=ai_response_text
            )

            return Response({"reply": ai_response_text})

        except Exception as e:
            print(f"Gemini API Error: {e}")
            return Response(
                {"error": "The AI is currently unavailable. Please try again later."}, 
                status=503
            )
        

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        stats = {
            "total_residents": User.objects.count(),
            "certs_this_month": CertificateRequest.objects.count(),
            "pending_reservations": Reservation.objects.filter(status='PENDING').count(), 
            "pending_documents": CertificateRequest.objects.filter(status='PENDING').count(),
            "welfare_beneficiaries": 430, 
            "sk_programs": 6,             
            "chatbot_queries": AiQueryStatistic.objects.count(),
        }
        return Response(stats)

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        announcement = self.get_object()
        ReadAnnouncement.objects.get_or_create(user=request.user, announcement=announcement)
        return Response({'status': 'marked as read'}, status=status.HTTP_200_OK)
    
class HouseholdViewSet(viewsets.ModelViewSet):
    queryset = Household.objects.prefetch_related('residents').all()
    serializer_class = HouseholdSerializer
    
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = [
        'address', 
        'residents__first_name', 
        'residents__last_name'
    ]
    filterset_fields = ['housing_status', 'dwelling_type']

class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.select_related('household').all()
    serializer_class = ResidentSerializer
    
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = [
        'first_name', 
        'last_name', 
        'purok'
    ]
    filterset_fields = [
        'purok', 
        'household', 
        'relationship_to_head',
        'is_4ps_beneficiary',
        'has_senior_citizen',
        'has_pwd',
        'has_solo_parent'
    ]

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    def create(self, request, *args, **kwargs):
        facility_id = request.data.get('facility')
        equipment_id = request.data.get('equipment')
        start = request.data.get('start_time')
        end = request.data.get('end_time')

        # --- 1. FACILITY CHECK: Strict Time Overlap ---
        if facility_id:
            overlapping_facilities = Reservation.objects.filter(
                facility_id=facility_id,
                status='APPROVED' # Only block if the existing request is approved
            ).filter(
                Q(start_time__lt=end) & Q(end_time__gt=start)
            )

            if overlapping_facilities.exists():
                return Response(
                    {"error": "This facility is already booked for the selected time slot."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- 2. EQUIPMENT CHECK: Time + Quantity Overlap ---
        if equipment_id:
            qty_requested = int(request.data.get('equipment_quantity', 0))
            
            try:
                equipment = Equipment.objects.get(id=equipment_id)
            except Equipment.DoesNotExist:
                return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)

            # Find all approved reservations for this equipment during the requested time
            overlapping_equipment = Reservation.objects.filter(
                equipment_id=equipment_id,
                status='APPROVED'
            ).filter(
                Q(start_time__lt=end) & Q(end_time__gt=start)
            ).aggregate(total_reserved=Sum('equipment_quantity'))

            # Calculate how many are currently taken
            reserved_qty = overlapping_equipment['total_reserved'] or 0
            available_qty = equipment.total_quantity - reserved_qty

            if qty_requested > available_qty:
                return Response(
                    {"error": f"Only {available_qty} '{equipment.name}' available during this time slot."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- 3. PROCEED: If all checks pass, save the reservation ---
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        # Fetch the specific reservation being approved/rejected
        reservation = self.get_object()
        
        # Get the new status from the React frontend payload
        new_status = request.data.get('status')
        
        if new_status not in ['APPROVED', 'REJECTED']:
            return Response(
                {"error": "Invalid status provided. Must be APPROVED or REJECTED."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update and save to database
        reservation.status = new_status
        reservation.save()
        
        return Response({"message": f"Reservation successfully {new_status.lower()}."})

    def perform_create(self, serializer):
        # Automatically attach the logged-in user to the reservation
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        
        # Security Check: Ensure the user owns this reservation
        if reservation.user != request.user:
            return Response(
                {"error": "You do not have permission to cancel this reservation."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        if reservation.status == 'CANCELLED':
            return Response(
                {"error": "This reservation is already cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the status
        reservation.status = 'CANCELLED'
        reservation.save()
        
        return Response({"message": "Reservation successfully cancelled."})
    
# CHANGED: Inherit from ModelViewSet instead of ReadOnlyModelViewSet
class FacilityViewSet(viewsets.ModelViewSet):
    """View for facilities. Residents can view, Staff can manage."""
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAuthenticated]

    # NEW: Secure the endpoint so only staff can add, edit, or delete
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

# CHANGED: Inherit from ModelViewSet instead of ReadOnlyModelViewSet
class EquipmentViewSet(viewsets.ModelViewSet):
    """View for equipment. Residents can view, Staff can manage."""
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated]

    # NEW: Secure the endpoint so only staff can add, edit, or delete
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

class EventViewSet(viewsets.ModelViewSet):
    """For staff to manage official Barangay Events."""
    queryset = Event.objects.all().order_by('-start_time')
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

# --- ADD THIS CUSTOM ENDPOINT FOR THE REACT CALENDAR ---

@api_view(['GET'])
def calendar_feed(request):
    """
    Merges Events and Approved Reservations into a single array 
    formatted specifically for react-big-calendar.
    """
    events = Event.objects.all()
    reservations = Reservation.objects.filter(status='APPROVED')
    
    calendar_data = []
    
    # 1. Add Official Events
    for event in events:
        calendar_data.append({
            'id': f"event_{event.id}",
            'title': event.title,
            'start': event.start_time,
            'end': event.end_time,
            'type': event.event_type # Now returns 'ACTIVITY' or 'ABSENCE'
        })
        
    # 2. Add Approved Reservations
    for res in reservations:
        item_name = res.facility.name if res.facility else getattr(res.equipment, 'name', 'Item')
        calendar_data.append({
            'id': f"res_{res.id}",
            'title': f"Reserved: {item_name}",
            'start': res.start_time,
            'end': res.end_time,
            'type': 'RESERVATION'
        })
        
    return Response(calendar_data)

class DocumentPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'

class OfficialDocumentViewSet(viewsets.ModelViewSet):
    queryset = OfficialDocument.objects.all()
    serializer_class = OfficialDocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DocumentPagination # Attach pagination
    
    # 2. Add OrderingFilter to backends
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    
    # 3. Expose is_archived to the filterset
    filterset_fields = ['document_type', 'is_archived'] 
    search_fields = ['title']
    
    # 4. Define allowed sorting fields and default order
    ordering_fields = ['title', 'document_type', 'uploaded_at']
    ordering = ['-uploaded_at'] 

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    # 5. Custom Endpoints for Bulk Actions
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        OfficialDocument.objects.filter(id__in=ids).delete()
        return Response(status=204)

    @action(detail=False, methods=['post'])
    def bulk_archive(self, request):
        ids = request.data.get('ids', [])
        OfficialDocument.objects.filter(id__in=ids).update(is_archived=True)
        return Response(status=204)
from django.conf import settings
import random
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import google.generativeai as genai

from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from datetime import datetime, timedelta


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
    UserProfile,
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
    
class ClaimResidentProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Check if user already has a profile linked
        if hasattr(user, 'resident_profile') and user.resident_profile is not None:
            return Response({"error": "An account is already linked to a resident profile."}, status=status.HTTP_400_BAD_REQUEST)

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        birthdate = request.data.get('birthdate')

        if not first_name or not last_name or not birthdate:
            return Response({"error": "First name, last name, and birthdate are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Search the pre-existing resident database for a matching record
            resident = Resident.objects.get(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                birth_date=birthdate,
                user__isnull=True # Ensure this profile hasn't already been claimed by someone else!
            )
        except Resident.DoesNotExist:
            return Response({"error": "No unlinked resident record found matching these details. Please contact barangay staff."}, status=status.HTTP_404_NOT_FOUND)

        # Link the resident profile to the logged-in user and set status to PENDING verification
        resident.user = user
        resident.approval_status = 'PENDING'
        resident.save()

        return Response({"message": "Profile successfully claimed! Waiting for staff approval."})
    
class ResidentApprovalViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all().order_by('-id')
    serializer_class = ResidentSerializer
    permission_classes = [IsStaffGroup]

    # Custom endpoint to list only pending residents: /api/resident-approvals/pending/
    @action(detail=False, methods=['get'])
    def pending(self, request):
        pending_residents = Resident.objects.filter(approval_status='PENDING', user__isnull=False)
        serializer = self.get_serializer(pending_residents, many=True)
        return Response(serializer.data)

    # Custom endpoint to approve/reject: /api/resident-approvals/<id>/update_status/
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        resident = self.get_object()
        new_status = request.data.get('status') # Expects 'APPROVED' or 'REJECTED'

        if new_status not in ['APPROVED', 'REJECTED']:
            return Response({"error": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)

        resident.approval_status = new_status
        resident.save()

        return Response({"message": f"Resident profile successfully {new_status.lower()}."}, status=status.HTTP_200_OK)
    
class RegisterWithEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a user with this email already exists
        user_qs = User.objects.filter(email=email)
        
        if user_qs.exists():
            user = user_qs.first()
            if user.is_active:
                return Response({"error": "Email is already registered and active."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # GHOST USER FIX: Account exists but is inactive. 
                # Update credentials just in case they changed them on this new attempt.
                user.set_password(password)
                user.username = username
                user.save()
                
                # Fetch or create the profile, then generate a new OTP
                profile, created = UserProfile.objects.get_or_create(user=user)
                otp = str(random.randint(100000, 999999))
                profile.email_otp = otp
                profile.otp_created_at = timezone.now()
                profile.save()
        else:
            # Create a brand new user
            user = User.objects.create_user(username=username, email=email, password=password)
            user.is_active = False
            user.save()
            
            # Generate new OTP profile
            otp = str(random.randint(100000, 999999))
            UserProfile.objects.create(user=user, email_otp=otp, otp_created_at=timezone.now())

        # Guarantee the OTP prints to the terminal
        print("\n" + "="*40)
        print(f"🔑 YOUR OTP CODE FOR {email}: {otp}")
        print("="*40 + "\n")

        # Safely attempt to send mail
        try:
            send_mail(
                'Your Barangay System Verification Code',
                f'Your 6-digit verification code is: {otp}',
                'no-reply@barangay.gov',
                [email],
                fail_silently=True, 
            )
        except Exception as e:
            print(f"Could not send email: {e}")

        return Response({
            "message": "Registration successful. Check your terminal console for the OTP code.", 
            "user_id": user.id
        }, status=status.HTTP_200_OK)

class VerifyEmailOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        entered_otp = request.data.get('otp')

        try:
            profile = UserProfile.objects.get(user__id=user_id)
        except UserProfile.DoesNotExist:
            return Response({"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Check if they are locked out (5 or more failed attempts)
        if profile.otp_attempts >= 5:
            return Response(
                {"error": "Too many invalid attempts. Please click 'Resend OTP' to get a new code."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 2. Check if OTP is wrong
        if profile.email_otp != entered_otp:
            # Increment the failed attempt counter
            profile.otp_attempts += 1
            profile.save()
            return Response(
                {"error": f"Invalid OTP code. {5 - profile.otp_attempts} attempts remaining."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Check if OTP expired
        if timezone.now() - profile.otp_created_at > timedelta(minutes=10):
            return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Success! Activate the user
        user = profile.user
        user.is_active = True
        user.save()

        # Clear OTP and reset attempts
        profile.email_otp = ''
        profile.otp_attempts = 0
        profile.save()

        return Response({"message": "Email successfully verified! You can now log in."}, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({"error": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            profile = UserProfile.objects.get(user=user)
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if user.is_active:
            return Response({"error": "Account is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a new 6-digit OTP
        otp = str(random.randint(100000, 999999))
        profile.email_otp = otp
        profile.otp_created_at = timezone.now()
        
        # NEW: Reset the attempts counter since they have a fresh code
        profile.otp_attempts = 0
        profile.save()

        # Guarantee the new OTP prints to the terminal
        print("\n" + "="*40)
        print(f"🔄 RESENT OTP CODE FOR {user.email}: {otp}")
        print("="*40 + "\n")

        # Safely attempt to send mail
        try:
            send_mail(
                'Your New Verification Code',
                f'Your new 6-digit verification code is: {otp}',
                'no-reply@barangay.gov',
                [user.email],
                fail_silently=True, 
            )
        except Exception as e:
            print(f"Could not send email: {e}")

        return Response({"message": "A new OTP has been sent."}, status=status.HTTP_200_OK)
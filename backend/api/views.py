from django.conf import settings
import random
from itertools import chain
from operator import attrgetter
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import google.generativeai as genai

from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.exceptions import NotFound
from datetime import datetime, timedelta

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import UserRateThrottle
from .permissions import IsAdminGroup, IsStaffGroup
from rest_framework.views import APIView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import permissions

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
    ProfileUpdateRequest,
    IncidentReport,
    BarangaySettings,
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
    ResidentProfileSerializer,
    ProfileUpdateRequestSerializer,
    IncidentReportSerializer,
    BarangaySettingsSerializer,
)

genai.configure(api_key=settings.GOOGLE_API_KEY)


# ==========================================
# 1. THROTTLING CLASSES
# ==========================================
class AiChatThrottle(UserRateThrottle):
    scope = 'ai_chat'

class IncidentReportThrottle(UserRateThrottle):
    scope = 'incident_report'


# ==========================================
# 2. AUTHENTICATION & REGISTRATION
# ==========================================
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class RegisterWithEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        user_qs = User.objects.filter(email=email)
        
        if user_qs.exists():
            user = user_qs.first()
            if user.is_active:
                return Response({"error": "Email is already registered and active."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                user.set_password(password)
                user.username = username
                user.save()
                
                profile, created = UserProfile.objects.get_or_create(user=user)
                otp = str(random.randint(100000, 999999))
                profile.email_otp = otp
                profile.otp_created_at = timezone.now()
                profile.save()
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
            user.is_active = False
            user.save()
            
            otp = str(random.randint(100000, 999999))
            UserProfile.objects.create(user=user, email_otp=otp, otp_created_at=timezone.now())

        print("\n" + "="*40)
        print(f"🔑 YOUR OTP CODE FOR {email}: {otp}")
        print("="*40 + "\n")

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

        if profile.otp_attempts >= 5:
            return Response(
                {"error": "Too many invalid attempts. Please click 'Resend OTP' to get a new code."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if profile.email_otp != entered_otp:
            profile.otp_attempts += 1
            profile.save()
            return Response(
                {"error": f"Invalid OTP code. {5 - profile.otp_attempts} attempts remaining."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.now() - profile.otp_created_at > timedelta(minutes=10):
            return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        user = profile.user
        user.is_active = True
        user.save()

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

        otp = str(random.randint(100000, 999999))
        profile.email_otp = otp
        profile.otp_created_at = timezone.now()
        profile.otp_attempts = 0
        profile.save()

        print("\n" + "="*40)
        print(f"🔄 RESENT OTP CODE FOR {user.email}: {otp}")
        print("="*40 + "\n")

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


# ==========================================
# 3. RESIDENT IDENTITY & PROFILES
# ==========================================
class UserProfileView(RetrieveUpdateAPIView):
    serializer_class = ResidentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.resident_profile
        except Resident.DoesNotExist:
            raise NotFound(detail="You have not claimed a resident profile yet.")

class ClaimResidentProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if hasattr(user, 'resident_profile') and user.resident_profile is not None:
            return Response({"error": "An account is already linked to a resident profile."}, status=status.HTTP_400_BAD_REQUEST)

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        birthdate = request.data.get('birthdate')

        if not first_name or not last_name or not birthdate:
            return Response({"error": "First name, last name, and birthdate are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resident = Resident.objects.get(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                birth_date=birthdate,
                user__isnull=True 
            )
            
            resident.user = user
            resident.approval_status = 'APPROVED'
            resident.save()
            return Response({"message": "Profile successfully matched and linked!"}, status=status.HTTP_200_OK)

        except Resident.DoesNotExist:
            return Response({
                "error": "not_found", 
                "message": "No matching record found in the barangay registry. Would you like to submit a new application?"
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Resident.MultipleObjectsReturned:
            return Response({
                "error": "duplicate_found", 
                "message": "Multiple records found. Please contact the barangay hall for manual verification."
            }, status=status.HTTP_400_BAD_REQUEST)

class SubmitResidentApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if hasattr(user, 'resident_profile') and user.resident_profile is not None:
            return Response({"error": "An account is already linked."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ResidentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=user, approval_status='PENDING')
            return Response({"message": "New application submitted for review."}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UnlinkProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            resident = request.user.resident_profile
            resident.user = None
            resident.approval_status = 'PENDING'
            resident.save()
            return Response({"message": "Account successfully unlinked."}, status=status.HTTP_200_OK)
        except Resident.DoesNotExist:
            return Response({"error": "No profile to unlink."}, status=status.HTTP_404_NOT_FOUND)

class ResetRejectedClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            resident = request.user.resident_profile
            if resident.approval_status == 'REJECTED':
                resident.user = None
                resident.approval_status = 'PENDING' 
                resident.save()
                return Response({"message": "Claim reset successfully."}, status=status.HTTP_200_OK)
            return Response({"error": "Profile is not in a rejected state."}, status=status.HTTP_400_BAD_REQUEST)
        except Resident.DoesNotExist:
            return Response({"error": "No profile currently linked."}, status=status.HTTP_404_NOT_FOUND)


# ==========================================
# 4. PROFILE CORRECTIONS & UPDATES
# ==========================================
class CreateProfileUpdateRequestView(generics.CreateAPIView):
    queryset = ProfileUpdateRequest.objects.all()
    serializer_class = ProfileUpdateRequestSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        try:
            resident = self.request.user.resident_profile
        except Resident.DoesNotExist:
            raise NotFound("You must claim a resident profile before requesting corrections.")
        
        serializer.save(user=self.request.user, resident=resident)

class StaffProfileUpdateListView(generics.ListAPIView):
    serializer_class = ProfileUpdateRequestSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def get_queryset(self):
        return ProfileUpdateRequest.objects.all().order_by('-created_at')

class StaffProfileUpdateActionView(generics.UpdateAPIView):
    queryset = ProfileUpdateRequest.objects.all()
    serializer_class = ProfileUpdateRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        update_request = self.get_object()
        action_status = request.data.get('status') 
        rejection_reason = request.data.get('rejection_reason', '') 

        if action_status not in ['APPROVED', 'REJECTED']:
            return Response({"error": "Invalid status action."}, status=status.HTTP_400_BAD_REQUEST)

        update_request.status = action_status
        if action_status == 'REJECTED':
            update_request.rejection_reason = rejection_reason 
            
        update_request.save()

        if action_status == 'APPROVED':
            resident = update_request.resident
            if update_request.requested_first_name:
                resident.first_name = update_request.requested_first_name
            if update_request.requested_last_name:
                resident.last_name = update_request.requested_last_name
            if update_request.requested_birth_date:
                resident.birth_date = update_request.requested_birth_date
            if update_request.requested_civil_status:
                resident.civil_status = update_request.requested_civil_status
            resident.save()

        return Response({"message": f"Request {action_status.lower()} successfully."})


# ==========================================
# 5. USER-FACING REQUESTS & REPORTS
# ==========================================
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

    

class IncidentReportViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentReportSerializer
    permission_classes = [IsAuthenticated]
    #throttle_classes = [IncidentReportThrottle]

    def get_queryset(self):
        user = self.request.user
        try:
            role = user.otp_profile.role
        except Exception:
            role = 'RESIDENT'
            
        # PRIVACY FIX: Staff sees everything, residents only see their own
        if role in ['TANOD', 'SECRETARY', 'CAPTAIN']:
            return IncidentReport.objects.all().order_by('-created_at')
        return IncidentReport.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically attaches the logged-in user so they can't spoof being someone else
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        user = request.user
        try:
            role = user.otp_profile.role
        except Exception:
            role = 'RESIDENT'
            
        # SECURITY FIX: Only allow authorized staff to update the status of a report
        if role not in ['TANOD', 'SECRETARY', 'CAPTAIN']:
            return Response(
                {"error": "You do not have permission to change the status of this report."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        report = self.get_object()
        new_status = request.data.get('status')
        resolution_notes = request.data.get('resolution_notes', '')

        if new_status not in dict(IncidentReport.STATUS_CHOICES).keys():
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        report.status = new_status
        if resolution_notes:
            report.resolution_notes = resolution_notes
            
        report.save()
        return Response({"message": f"Report updated to {new_status}."})


# ==========================================
# 6. MANAGER & STAFF VIEWSETS
# ==========================================
class CertificateRequestManagerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffGroup]
    queryset = CertificateRequest.objects.all().order_by('-date_requested')
    serializer_class = CertificateRequestSerializer

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        cert_request = self.get_object()
        new_status = request.data.get('status')
        rejection_reason = request.data.get('rejection_reason', '')

        if new_status not in dict(CertificateRequest.STATUS_CHOICES).keys():
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        cert_request.status = new_status
        if new_status == 'REJECTED':
            cert_request.rejection_reason = rejection_reason
        
        cert_request.save()
        return Response({"message": f"Certificate request {new_status.lower()}."})

class PermitRequestManagerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffGroup]
    queryset = PermitRequest.objects.all().order_by('-date_requested')
    serializer_class = PermitRequestSerializer

class ResidentApprovalViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all().order_by('-id')
    serializer_class = ResidentSerializer
    permission_classes = [IsStaffGroup]

    @action(detail=False, methods=['get'])
    def pending(self):
        pending_residents = Resident.objects.filter(approval_status='PENDING', user__isnull=False)
        serializer = self.get_serializer(pending_residents, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        resident = self.get_object()
        new_status = request.data.get('status') 
        rejection_reason = request.data.get('rejection_reason', '') 

        if new_status not in ['APPROVED', 'REJECTED']:
            return Response({"error": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == 'REJECTED':
            resident.rejection_reason = rejection_reason 
            resident.user = None
            resident.approval_status = 'PENDING' 
            resident.save()
            return Response({"message": "Claim rejected securely."}, status=status.HTTP_200_OK)

        resident.approval_status = new_status
        resident.rejection_reason = '' 
        resident.save()
        return Response({"message": f"Resident profile {new_status.lower()}."}, status=status.HTTP_200_OK)

class HouseholdViewSet(viewsets.ModelViewSet):
    queryset = Household.objects.prefetch_related('residents').all()
    serializer_class = HouseholdSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['address', 'residents__first_name', 'residents__last_name']
    filterset_fields = ['housing_status', 'dwelling_type']

class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.select_related('household').all()
    serializer_class = ResidentSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['first_name', 'last_name', 'purok']
    filterset_fields = [
        'purok', 'household', 'relationship_to_head',
        'is_4ps_beneficiary', 'has_senior_citizen', 'has_pwd', 'has_solo_parent'
    ]


# ==========================================
# 7. FACILITIES, EVENTS & RESERVATIONS
# ==========================================
class FacilityViewSet(viewsets.ModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()]
        return super().get_permissions()

class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    def create(self, request, *args, **kwargs):
        facility_id = request.data.get('facility')
        equipment_id = request.data.get('equipment')
        start = request.data.get('start_time')
        end = request.data.get('end_time')

        if facility_id:
            overlapping_facilities = Reservation.objects.filter(
                facility_id=facility_id,
                status='APPROVED' 
            ).filter(
                Q(start_time__lt=end) & Q(end_time__gt=start)
            )

            if overlapping_facilities.exists():
                return Response(
                    {"error": "This facility is already booked for the selected time slot."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if equipment_id:
            qty_requested = int(request.data.get('equipment_quantity', 0))
            try:
                equipment = Equipment.objects.get(id=equipment_id)
            except Equipment.DoesNotExist:
                return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)

            overlapping_equipment = Reservation.objects.filter(
                equipment_id=equipment_id, status='APPROVED'
            ).filter(
                Q(start_time__lt=end) & Q(end_time__gt=start)
            ).aggregate(total_reserved=Sum('equipment_quantity'))

            reserved_qty = overlapping_equipment['total_reserved'] or 0
            available_qty = equipment.total_quantity - reserved_qty

            if qty_requested > available_qty:
                return Response(
                    {"error": f"Only {available_qty} '{equipment.name}' available during this time slot."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        reservation = self.get_object()
        new_status = request.data.get('status')
        rejection_reason = request.data.get('rejection_reason', '')
        
        if new_status not in ['APPROVED', 'REJECTED']:
            return Response({"error": "Invalid status provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        reservation.status = new_status
        if new_status == 'REJECTED':
            reservation.rejection_reason = rejection_reason
            
        reservation.save()
        return Response({"message": f"Reservation successfully {new_status.lower()}."})

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        
        if reservation.user != request.user:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        if reservation.status == 'CANCELLED':
            return Response({"error": "Already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = 'CANCELLED'
        reservation.save()
        return Response({"message": "Reservation successfully cancelled."})

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-start_time')
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffGroup()] 
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

@api_view(['GET'])
def calendar_feed(request):
    events = Event.objects.all()
    reservations = Reservation.objects.filter(status='APPROVED')
    calendar_data = []
    
    for event in events:
        calendar_data.append({
            'id': f"event_{event.id}",
            'title': event.title,
            'start': event.start_time,
            'end': event.end_time,
            'type': event.event_type 
        })
        
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


# ==========================================
# 8. ANNOUNCEMENTS, DASHBOARDS & DOCUMENTS
# ==========================================
class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # FIX: Allow any authenticated user (residents too) to view/read announcements
        if self.action in ['list', 'retrieve', 'mark_as_read']:
            return [IsAuthenticated()]
        
        # Keep staff-only restriction for creating, updating, or deleting
        return [IsStaffGroup()]

    def perform_create(self, serializer):
        user = self.request.user
        
        try:
            role = user.otp_profile.role.upper()
        except Exception:
            role = 'RESIDENT'
            
        blocked_roles = ['RESIDENT', 'TANOD']
        
        if role in blocked_roles:
            raise PermissionDenied("You do not have permission to post announcements.")

        serializer.save(author=user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        announcement = self.get_object()
        ReadAnnouncement.objects.get_or_create(user=request.user, announcement=announcement)
        return Response({'status': 'marked as read'}, status=status.HTTP_200_OK)

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        stats = {
            "total_residents": Resident.objects.count(),
            "certs_this_month": CertificateRequest.objects.count(),
            "pending_reservations": Reservation.objects.filter(status='PENDING').count(), 
            "pending_documents": CertificateRequest.objects.filter(status='PENDING').count(),
            "welfare_beneficiaries": 430, 
            "sk_programs": 6,            
            "chatbot_queries": AiQueryStatistic.objects.count(),
        }
        return Response(stats)


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

class DocumentPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'

class OfficialDocumentViewSet(viewsets.ModelViewSet):
    queryset = OfficialDocument.objects.all()
    serializer_class = OfficialDocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DocumentPagination
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_fields = ['document_type', 'is_archived'] 
    search_fields = ['title']
    ordering_fields = ['title', 'document_type', 'uploaded_at']
    ordering = ['-uploaded_at'] 

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

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

# ==========================================
# 9. ADMIN HUB & AUDIT LOGS
# ==========================================
class AdminAuditLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            role = request.user.otp_profile.role.upper()
        except Exception:
            raise PermissionDenied("User profile not found.")
            
        if role not in ['CAPTAIN', 'SECRETARY']:
            raise PermissionDenied("Only Captains and Secretaries can view audit logs.")

        # 1. Fetch the logs from all tracked models
        resident_logs = Resident.history.all()[:30]
        cert_logs = CertificateRequest.history.all()[:30]
        incident_logs = IncidentReport.history.all()[:30]
        
        # --- NEW: Fetch Staff/User Profile Logs ---
        profile_logs = UserProfile.history.all()[:30]

        # 2. Add profile_logs to the chain
        combined_logs = sorted(
            chain(resident_logs, cert_logs, incident_logs, profile_logs),
            key=attrgetter('history_date'),
            reverse=True
        )[:50]

        log_data = []
        for record in combined_logs:
            action_map = {'+': 'Created', '~': 'Updated', '-': 'Deleted'}
            model_name = record.__class__.__name__.replace('Historical', '')
            
            # Detail Calculation
            details = ""
            if record.history_type == '~':
                prev_record = record.prev_record
                if prev_record:
                    delta = record.diff_against(prev_record)
                    changes = []
                    for change in delta.changes:
                        changes.append(f"{change.field}: {change.old} ➔ {change.new}")
                    details = " | ".join(changes)
                else:
                    details = "Updated (No previous record found)"
            elif record.history_type == '+':
                details = "Initial creation"
            elif record.history_type == '-':
                details = "Record deleted permanently"

            # Check if this is a UserProfile log so we can display the username being modified
            target_info = f"({record.history_id})"
            if model_name == "UserProfile" and hasattr(record, 'user'):
                target_info = f"({record.user.username})"

            log_data.append({
                "id": record.history_id,
                "model": model_name,
                "action": action_map.get(record.history_type, 'Unknown'),
                "user": record.history_user.username if record.history_user else "System",
                "date": record.history_date,
                "details": details,
            })

        return Response(log_data, status=status.HTTP_200_OK)


class StaffManagementAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions_check(self, request):
        try:
            role = request.user.otp_profile.role.upper()
        except Exception:
            raise PermissionDenied("User profile not found.")
            
        if role not in ['CAPTAIN', 'SECRETARY']:
            raise PermissionDenied("Only Captains and Secretaries can manage staff accounts.")

    def get(self, request):
        self.get_permissions_check(request)
        
        staff_profiles = UserProfile.objects.exclude(role='RESIDENT').select_related('user').order_by('-user__date_joined')
        
        staff_data = []
        for profile in staff_profiles:
            staff_data.append({
                "id": profile.user.id,
                "username": profile.user.username,
                "email": profile.user.email,
                "role": profile.role,
                "is_active": profile.user.is_active,
                "date_joined": profile.user.date_joined,
            })
        return Response(staff_data, status=status.HTTP_200_OK)

    def post(self, request):
        self.get_permissions_check(request)

        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        staff_role = request.data.get('role')

        if not all([username, password, email, staff_role]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        # --- SECURITY FIX: Strict Whitelist ---
        # Explicitly block the creation of CAPTAIN, ADMIN, and SECRETARY accounts
        staff_role_upper = staff_role.upper()
        allowed_roles = ['TREASURER', 'COUNCIL', 'SK', 'TANOD']
        
        if staff_role_upper not in allowed_roles:
            return Response(
                {"error": f"Security restriction: You are not authorized to create '{staff_role_upper}' level admin accounts."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        # --------------------------------------

        try:
            new_user = User.objects.create_user(username=username, email=email, password=password)
            UserProfile.objects.create(user=new_user, role=staff_role_upper)
            return Response({"message": f"{staff_role_upper} account created successfully."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        self.get_permissions_check(request)

        user_id = request.data.get('user_id')
        action_type = request.data.get('action_type')

        if not user_id or not action_type:
            return Response({"error": "User ID and action type required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
            
            if target_user == request.user:
                return Response({"error": "You cannot modify your own account here."}, status=status.HTTP_400_BAD_REQUEST)

            # --- SECURITY FIX: Admin Modification Protection ---
            target_profile = UserProfile.objects.filter(user=target_user).first()
            if target_profile and target_profile.role in ['CAPTAIN', 'SECRETARY'] and request.user.otp_profile.role != 'CAPTAIN':
                return Response(
                    {"error": f"You do not have clearance to modify a {target_profile.role} account."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            if action_type == 'toggle_status':
                # Double-check protection: Never allow deactivating a Captain or Secretary from the frontend
                if target_profile.role in ['CAPTAIN', 'SECRETARY']:
                    return Response({"error": "Critical system accounts cannot be revoked via the dashboard."}, status=status.HTTP_403_FORBIDDEN)
                
                target_user.is_active = not target_user.is_active
                target_user.save()
                status_text = "Activated" if target_user.is_active else "Deactivated"
                return Response({"message": f"Account {status_text} successfully."}, status=status.HTTP_200_OK)
            
            elif action_type == 'reset_password':
                new_password = request.data.get('new_password')
                if not new_password:
                    return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
                target_user.set_password(new_password)
                target_user.save()
                return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)

            elif action_type == 'change_role':
                new_role = request.data.get('new_role')
                if not new_role:
                    return Response({"error": "New role is required."}, status=status.HTTP_400_BAD_REQUEST)
                
                new_role = new_role.upper()
                allowed_roles = ['TREASURER', 'COUNCIL', 'SK', 'TANOD']
                
                if new_role not in allowed_roles:
                    return Response({"error": "Invalid or unauthorized role assignment."}, status=status.HTTP_403_FORBIDDEN)
                
                if target_profile.role in ['CAPTAIN', 'SECRETARY']:
                    return Response({"error": "Cannot downgrade critical system accounts."}, status=status.HTTP_403_FORBIDDEN)

                target_profile.role = new_role
                target_profile.save()
                return Response({"message": f"Role updated to {new_role} successfully."}, status=status.HTTP_200_OK)

            return Response({"error": "Invalid action type."}, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class SystemSettingsView(APIView):
    
    # 1. ADD THIS METHOD to handle permissions dynamically
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]  # Allows the React frontend to fetch settings without a token
        return [IsAuthenticated()] # Secures POST requests

    def get(self, request):
        settings, created = BarangaySettings.objects.get_or_create(pk=1)
        serializer = BarangaySettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            role = request.user.otp_profile.role.upper()
        except Exception:
            raise PermissionDenied("User profile not found.")
            
        if role not in ['CAPTAIN', 'SECRETARY']:
            raise PermissionDenied("Only Captains and Secretaries can modify system settings.")

        settings, created = BarangaySettings.objects.get_or_create(pk=1)
        serializer = BarangaySettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "System settings updated successfully."}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
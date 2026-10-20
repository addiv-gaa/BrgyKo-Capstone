from django.conf import settings
import random
import math
from itertools import chain
from operator import attrgetter
from django.http import HttpResponse
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
import google.generativeai as genai
import openpyxl
from datetime import date
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.exceptions import NotFound
from datetime import datetime, timedelta

from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.throttling import UserRateThrottle
from .permissions import IsAdminUser, IsInternalUser
from rest_framework.views import APIView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import permissions

from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Sum, Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics

from .models import (
    AiQueryStatistic,  
    Announcement, 
    ReadAnnouncement, 
    Household,
    Resident,
    Event,
    OfficialDocument,
    UserProfile,
    BarangaySettings,
    EmergencyContact,
    BarangayOfficial,
    OfficialTab,
    BarangayFAQ,
)

from .serializers import (
    UserSerializer, 
    AnnouncementSerializer, 
    HouseholdSerializer,
    ResidentSerializer,
    EventSerializer,
    OfficialDocumentSerializer,
    ResidentProfileSerializer,
    BarangaySettingsSerializer,
    AiQueryStatisticSerializer,
    EmergencyContactSerializer, BarangayOfficialSerializer,
    OfficialTabSerializer,
    BarangayFAQSerializer,
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

    def post(self, request, *args, **kwargs):
        from django.core.cache import cache
        username = str(request.data.get('username') or '').strip()
        lock_key = f"login_lock_{username.lower()}"
        attempt_key = f"login_attempts_{username.lower()}"

        if cache.get(lock_key):
            return Response(
                {"detail": "Account locked: 5 consecutive failed login attempts. Please try again after 15 minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            attempts = cache.get(attempt_key, 0) + 1
            if attempts >= 5:
                cache.set(lock_key, True, timeout=15 * 60)
                cache.delete(attempt_key)
                return Response(
                    {"detail": "Account locked: 5 consecutive failed login attempts. Locked for 15 minutes."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            cache.set(attempt_key, attempts, timeout=15 * 60)
            return Response(
                {"detail": "No active account found with the given credentials."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Clear failed login counters on successful authentication
        cache.delete(lock_key)
        cache.delete(attempt_key)

        user = serializer.user
        access_token = serializer.validated_data.get('access')
        refresh_token = serializer.validated_data.get('refresh')

        response = Response()

        # Set access token as HttpOnly cookie
        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=True,   # True in production (HTTPS), False in dev
            samesite='None',
            max_age=30 * 60,             # 30 minutes (matches SIMPLE_JWT setting)
            path='/',
        )

        # Set refresh token as HttpOnly cookie
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite='None',
            max_age=24 * 60 * 60,        # 1 day (matches SIMPLE_JWT setting)
            path='/',
        )

        # Get user info to send in the response body
        try:
            role = user.otp_profile.role
            must_change_password = user.otp_profile.must_change_password
        except Exception:
            role = 'RESIDENT'
            must_change_password = False

        response.data = {
            'detail': 'Login successful',
            'access': str(access_token),
            'refresh': str(refresh_token),
            'user': {
                'username': user.username,
                'first_name': user.first_name,
                'role': role,
                'must_change_password': must_change_password,
            }
        }
        response.status_code = 200

        from .models import SessionLog
        SessionLog.objects.create(user=user, action="Logged In")

        return response


class CustomTokenRefreshView(APIView):
    """Reads refresh token from HttpOnly cookie or request body and returns new access token."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')

        if not refresh_token:
            return Response({'error': 'No refresh token found.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = str(refresh.access_token)

            response = Response({
                'detail': 'Token refreshed successfully.',
                'access': new_access_token
            })
            response.set_cookie(
                key='access_token',
                value=new_access_token,
                httponly=True,
                secure=True,
                samesite='None',
                max_age=30 * 60,
                path='/',
            )
            return response
        except Exception:
            response = Response({'error': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
            response.delete_cookie('access_token', path='/', samesite='None')
            response.delete_cookie('refresh_token', path='/', samesite='None')
            return response



class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=400)
            
        from django.contrib.auth.models import User
        user = User.objects.filter(email=email).first()
        if not user:
            # SECURITY: Return a generic success to prevent email enumeration
            import time
            time.sleep(0.5) # Simulate email sending delay
            return Response({
                "message": "If an account exists with this email, an OTP has been sent.", 
                "user_id": -1 # Dummy ID
            }, status=200)
            
        import random
        from django.utils import timezone
        from django.core.mail import send_mail
        from .models import UserProfile
        
        otp = str(random.randint(100000, 999999))
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.email_otp = otp
        profile.otp_created_at = timezone.now()
        profile.otp_attempts = 0
        profile.save()
        
        try:
            send_mail(
                'Password Reset Verification Code',
                f'Your 6-digit verification code is: {otp}',
                'no-reply@barangay.gov',
                [user.email],
                fail_silently=True, 
            )
        except Exception:
            pass
            
        return Response({"message": "If an account exists with this email, an OTP has been sent.", "user_id": user.id})

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        user_id = request.data.get('user_id')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not all([user_id, otp, new_password]):
            return Response({"error": "Missing required fields."}, status=400)
            
        from django.contrib.auth.models import User
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "Invalid OTP."}, status=400)
            
        from .models import UserProfile
        profile = getattr(user, 'otp_profile', None)
        if not profile:
            return Response({"error": "Invalid OTP."}, status=400)

        # Enforce maximum 5 wrong attempts (F-006 Brute Force protection)
        if profile.otp_attempts >= 5:
            profile.email_otp = ''
            profile.save()
            return Response({"error": "Too many failed attempts. This OTP has been invalidated. Please request a new OTP."}, status=400)

        if profile.email_otp != otp:
            profile.otp_attempts += 1
            if profile.otp_attempts >= 5:
                profile.email_otp = ''
                profile.save()
                return Response({"error": "Too many failed attempts. This OTP has been invalidated. Please request a new OTP."}, status=400)
            profile.save()
            return Response({"error": f"Invalid OTP. {5 - profile.otp_attempts} attempt(s) remaining."}, status=400)
            
        # Verify age of OTP (10 mins)
        from django.utils import timezone
        import datetime
        if not profile.otp_created_at or timezone.now() - profile.otp_created_at > datetime.timedelta(minutes=10):
            profile.email_otp = ''
            profile.save()
            return Response({"error": "OTP has expired."}, status=400)
            
        user.set_password(new_password)
        user.save()
        
        # Clear OTP, reset attempts, and clear must_change_password
        profile.email_otp = ''
        profile.otp_attempts = 0
        profile.must_change_password = False
        profile.save()
        
        # Log the password reset
        from .models import SessionLog
        SessionLog.objects.create(user=user, action="Password Reset")
        
        return Response({"message": "Password reset successfully.", "username": user.username})


class ChangeTemporaryPasswordView(APIView):
    """Enforces first-login mandatory password change for staff accounts."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not new_password:
            return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if confirm_password is not None and new_password != confirm_password:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.set_password(new_password)
        user.save()

        if hasattr(user, 'otp_profile'):
            profile = user.otp_profile
            profile.must_change_password = False
            profile.save()

        from .models import SessionLog
        SessionLog.objects.create(user=user, action="Changed Temporary Password")

        return Response({"message": "Password changed successfully.", "must_change_password": False}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Clears the HttpOnly auth cookies."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        if request.user and request.user.is_authenticated:
            from django.core.cache import cache
            cache_key = f"recent_logout_{request.user.id}"
            if not cache.get(cache_key):
                cache.set(cache_key, True, timeout=3)
                from .models import SessionLog
                SessionLog.objects.create(user=request.user, action='Logged Out')

        response = Response({'detail': 'Logged out successfully.'})
        response.delete_cookie(
            'access_token', 
            path='/',
            samesite='None'
        )
        response.delete_cookie(
            'refresh_token', 
            path='/',
            samesite='None'
        )
        return response


class CurrentUserView(APIView):
    """Returns the currently authenticated user's info."""

    def get(self, request):
        try:
            role = request.user.otp_profile.role
            must_change_password = request.user.otp_profile.must_change_password
        except Exception:
            role = 'RESIDENT'
            must_change_password = False

        return Response({
            'username': request.user.username,
            'first_name': request.user.first_name,
            'role': role,
            'must_change_password': must_change_password,
        })

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
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if hasattr(request.user, 'resident_profile') and request.user.resident_profile is not None:
            serializer = ResidentProfileSerializer(request.user.resident_profile)
            data = serializer.data
            data['approval_status'] = 'APPROVED'
            return Response(data)
        return Response({"approval_status": "UNLINKED"})

    def patch(self, request):
        if hasattr(request.user, 'resident_profile') and request.user.resident_profile is not None:
            contact = request.data.get('contact_number')
            if contact is not None:
                request.user.resident_profile.contact_number = str(contact).strip()
                request.user.resident_profile.save()
            serializer = ResidentProfileSerializer(request.user.resident_profile)
            data = serializer.data
            data['approval_status'] = 'APPROVED'
            return Response(data)
        return Response({"error": "No linked resident profile found."}, status=status.HTTP_404_NOT_FOUND)

class HouseholdViewSet(viewsets.ModelViewSet):
    permission_classes = [IsInternalUser]
    queryset = Household.objects.prefetch_related('residents').all()
    serializer_class = HouseholdSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['address', 'residents__first_name', 'residents__last_name']
    filterset_fields = ['housing_status', 'dwelling_type']

class ResidentPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get('paginate', '').lower() in ['false', '0', 'no']:
            return None
        return super().paginate_queryset(queryset, request, view)

class ResidentSearchFilter(filters.SearchFilter):
    """
    Search filter that supports names, purok, and flexible birthdate queries.
    Supports formats:
    - Exact ISO date: YYYY-MM-DD
    - Slashed dates: MM/DD/YYYY, DD/MM/YYYY
    - Dashed dates: MM-DD-YYYY, DD-MM-YYYY
    - Textual dates: Month DD, YYYY (e.g. 'December 7, 2005')
    - Birth year: YYYY (e.g. 1995)
    - Standard text icontains for first_name, last_name, purok, birth_date
    """
    def filter_queryset(self, request, queryset, view):
        raw_search = request.query_params.get(self.search_param, '').strip()
        if not raw_search:
            return queryset

        from django.db.models import Q
        import datetime

        # 1. Check if the full raw search string parses as a date
        raw_date_candidates = set()
        for fmt in [
            '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%m-%d-%Y', '%d-%m-%Y',
            '%B %d, %Y', '%b %d, %Y', '%B %d %Y', '%b %d %Y', 
            '%d %B %Y', '%d %b %Y'
        ]:
            try:
                parsed = datetime.datetime.strptime(raw_search, fmt).date()
                raw_date_candidates.add(parsed)
            except ValueError:
                pass

        if raw_date_candidates:
            date_q = Q()
            for d in raw_date_candidates:
                date_q |= Q(birth_date=d)
            text_q = (
                Q(first_name__icontains=raw_search) | 
                Q(last_name__icontains=raw_search) | 
                Q(purok__icontains=raw_search)
            )
            return queryset.filter(date_q | text_q)

        # 2. Otherwise process search terms individually
        search_terms = self.get_search_terms(request)
        if not search_terms:
            return queryset

        base_conditions = []
        for term in search_terms:
            term_q = (
                Q(first_name__icontains=term) | 
                Q(last_name__icontains=term) | 
                Q(purok__icontains=term) | 
                Q(birth_date__icontains=term)
            )

            # Year match (e.g. 1995)
            if term.isdigit() and len(term) == 4 and 1900 <= int(term) <= 2100:
                term_q |= Q(birth_date__year=int(term))

            # Partial/full date formats for individual terms
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%m-%d-%Y', '%d-%m-%Y']:
                try:
                    d = datetime.datetime.strptime(term, fmt).date()
                    term_q |= Q(birth_date=d)
                except ValueError:
                    pass

            base_conditions.append(term_q)

        for condition in base_conditions:
            queryset = queryset.filter(condition)

        return queryset

class ResidentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsInternalUser]
    queryset = Resident.objects.select_related('household').all()
    serializer_class = ResidentSerializer
    pagination_class = ResidentPagination
    filter_backends = [ResidentSearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'purok', 'birth_date']
    filterset_fields = [
        'purok', 
        'household', 
        'relationship_to_head',
        'is_registered_voter',
        'sex',
        'civil_status',
        'inhabitant_type'
    ]
    ordering_fields = ['first_name', 'last_name', 'purok', 'birth_date', 'id']
    ordering = ['-id']




    def perform_create(self, serializer):
        # All manually created residents go to the approval queue
        serializer.save(is_approved=False, submitted_by=self.request.user if self.request.user.is_authenticated else None)


    def get_queryset(self):
        qs = super().get_queryset()

        if self.request.query_params.get('pending') == 'true':
            qs = qs.filter(is_approved=False)
        else:
            qs = qs.filter(is_approved=True)
        # 1. Youth Filter
        is_youth = self.request.query_params.get('is_youth')
        if is_youth == 'true':
            from datetime import date
            today = date.today()
            def sub_years(d, years):
                try: return d.replace(year=d.year - years)
                except ValueError: return d.replace(year=d.year - years, day=d.day - 1)
            age_15 = sub_years(today, 15)
            age_31 = sub_years(today, 31)
            qs = qs.filter(birth_date__lte=age_15, birth_date__gt=age_31)
            
        # 2. Welfare 'OR' Filter
        from django.db.models import Q
        welfare_q = Q()
        has_welfare = False
        
        if self.request.query_params.get('is_pwd') in ['True', 'true', '1']:
            welfare_q |= Q(is_pwd=True)
            has_welfare = True
        if self.request.query_params.get('is_senior_citizen') in ['True', 'true', '1']:
            welfare_q |= Q(is_senior_citizen=True)
            has_welfare = True
        if self.request.query_params.get('is_solo_parent') in ['True', 'true', '1']:
            welfare_q |= Q(is_solo_parent=True)
            has_welfare = True
        if self.request.query_params.get('is_4ps_beneficiary') in ['True', 'true', '1']:
            welfare_q |= Q(is_4ps_beneficiary=True)
            has_welfare = True
        if self.request.query_params.get('is_indigenous') in ['True', 'true', '1']:
            welfare_q |= Q(is_indigenous=True)
            has_welfare = True
        if self.request.query_params.get('is_ofw') in ['True', 'true', '1']:
            welfare_q |= Q(is_ofw=True)
            has_welfare = True
        if self.request.query_params.get('is_out_of_school') in ['True', 'true', '1']:
            welfare_q |= Q(is_out_of_school=True)
            has_welfare = True
            
        if has_welfare:
            qs = qs.filter(welfare_q)
            
        return qs

    @action(detail=False, methods=['patch'], url_path='bulk-approve')
    def bulk_approve(self, request):
        if not hasattr(request.user, 'otp_profile') or request.user.otp_profile.role != 'CAPTAIN':
            return Response({"error": "Only the Captain can approve residents."}, status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get('ids', [])
        residents = Resident.objects.filter(id__in=ids, is_approved=False)
        for resident in residents:
            resident.is_approved = True
            resident._change_reason = "Approved from Queue"
            resident.save()
        return Response({"message": f"{len(ids)} residents approved successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-deny')
    def bulk_deny(self, request):
        if not hasattr(request.user, 'otp_profile') or request.user.otp_profile.role != 'CAPTAIN':
            return Response({"error": "Only the Captain can deny residents."}, status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get('ids', [])
        residents = Resident.objects.filter(id__in=ids, is_approved=False)
        for resident in residents:
            resident._change_reason = "Denied from Queue"
            resident.delete()
        return Response({"message": f"{len(ids)} residents denied and removed."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return Response({"error": "Invalid format. Please upload a .xlsx or .xls file."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # We use data_only=True to read evaluated formulas if any exist
            wb = openpyxl.load_workbook(excel_file, data_only=True)
            
            # The template uses a specific sheet named 'DATA'
            if 'DATA' not in wb.sheetnames:
                return Response({"error": "Missing 'DATA' sheet in the uploaded template."}, status=status.HTTP_400_BAD_REQUEST)
                
            sheet = wb['DATA']
            rows = list(sheet.iter_rows(values_only=True))
            
            if not rows or len(rows) < 2:
                return Response({"error": "The 'DATA' sheet is empty or missing headers."}, status=status.HTTP_400_BAD_REQUEST)

            # Map the exact headers from the template (Row 1)
            headers = [str(h).strip().upper() if h else "" for h in rows[0]]
            
            created_count = 0
            updated_count = 0
            errors = []

            # Start reading from Row 2 (Index 1)
            for i, row in enumerate(rows[1:], start=2):
                row_data = dict(zip(headers, row))
                
                first_name = row_data.get('FIRST NAME')
                last_name = row_data.get('LAST NAME')
                
                # Stop processing if we hit completely blank rows at the bottom
                if not first_name and not last_name:
                    continue

                if not first_name or not last_name:
                    errors.append(f"Row {i}: Missing required First Name or Last Name.")
                    continue

                is_auto_senior = False

                # Safely parse the 'BIRTHDATE (YYYY-MM-DD)' column with typo protection
                raw_birth_date = row_data.get('BIRTHDATE (YYYY-MM-DD)')
                birth_date = None

                if isinstance(raw_birth_date, datetime):
                    birth_date = raw_birth_date.strftime('%Y-%m-%d')
                elif raw_birth_date:
                    try:
                        # Attempt to parse the string to ensure it's a real date
                        parsed_date = datetime.strptime(str(raw_birth_date).strip()[:10], '%Y-%m-%d')
                        birth_date = parsed_date.strftime('%Y-%m-%d')
                    except ValueError:
                        # Catch fake dates like "2018-19-26" and set to None instead of crashing
                        birth_date = None

                if birth_date:
                    b_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
                    today = datetime.today().date()
                    # Calculate exact age accounting for leap years and birth month/day
                    age = today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
                    if age >= 60:
                        is_auto_senior = True

                try:
                    # F-018: Check if resident already exists to prevent blank spreadsheet cells from overwriting existing DB data
                    existing_resident = Resident.objects.filter(
                        first_name=str(first_name).strip(),
                        last_name=str(last_name).strip(),
                        birth_date=birth_date
                    ).first()

                    if existing_resident:
                        field_map = {
                            'inhabitant_type': row_data.get('INHABITANT TYPE'),
                            'middle_name': row_data.get('MIDDLE NAME'),
                            'suffix': row_data.get('SUFFIX'),
                            'birth_place': row_data.get('BIRTH PLACE'),
                            'sex': row_data.get('SEX'),
                            'civil_status': row_data.get('CIVIL STATUS'),
                            'citizenship': row_data.get('CITIZENSHIP'),
                            'occupation': row_data.get('PROFESSION/ OCCUPATION'),
                            'contact_number': row_data.get('CONTACT NUMBER'),
                            'email_address': row_data.get('EMAIL ADDRESS'),
                            'highest_education': row_data.get('HIGHEST EDUCATIONAL ATTAINMENT'),
                            'mothers_first_name': row_data.get("MOTHER'S FIRST NAME"),
                            'mothers_middle_name': row_data.get("MOTHER'S MIDDLE NAME"),
                            'mothers_last_name': row_data.get("MOTHER'S LAST NAME"),
                        }
                        for field, raw_val in field_map.items():
                            if raw_val is not None:
                                val_str = str(raw_val).strip()
                                if val_str:
                                    if field == 'sex':
                                        val_str = val_str.capitalize()
                                    elif field == 'civil_status':
                                        val_str = val_str.capitalize()
                                    setattr(existing_resident, field, val_str)
                        if is_auto_senior:
                            existing_resident.is_senior_citizen = True
                        existing_resident.save()
                        updated_count += 1
                    else:
                        new_data = {
                            'first_name': str(first_name).strip(),
                            'last_name': str(last_name).strip(),
                            'birth_date': birth_date,
                            'inhabitant_type': str(row_data.get('INHABITANT TYPE') or 'NON-MIGRANT').strip(),
                            'middle_name': str(row_data.get('MIDDLE NAME') or '').strip(),
                            'suffix': str(row_data.get('SUFFIX') or '').strip(),
                            'birth_place': str(row_data.get('BIRTH PLACE') or '').strip(),
                            'sex': str(row_data.get('SEX') or 'Male').strip().capitalize(),
                            'civil_status': str(row_data.get('CIVIL STATUS') or 'Single').strip().capitalize(),
                            'citizenship': str(row_data.get('CITIZENSHIP') or 'Filipino').strip(),
                            'occupation': str(row_data.get('PROFESSION/ OCCUPATION') or '').strip(),
                            'contact_number': str(row_data.get('CONTACT NUMBER') or '').strip(),
                            'email_address': str(row_data.get('EMAIL ADDRESS') or '').strip(),
                            'highest_education': str(row_data.get('HIGHEST EDUCATIONAL ATTAINMENT') or '').strip(),
                            'mothers_first_name': str(row_data.get("MOTHER'S FIRST NAME") or '').strip(),
                            'mothers_middle_name': str(row_data.get("MOTHER'S MIDDLE NAME") or '').strip(),
                            'mothers_last_name': str(row_data.get("MOTHER'S LAST NAME") or '').strip(),
                            'is_senior_citizen': is_auto_senior,
                            'is_approved': False,
                            'submitted_by': request.user if request.user.is_authenticated else None,
                            'purok': 'Unassigned',
                            'is_4ps_beneficiary': False,
                            'is_pwd': False,
                            'is_solo_parent': False,
                        }
                        Resident.objects.create(**new_data)
                        created_count += 1

                except Exception as e:
                    errors.append(f"Row {i} Failed: {str(e)}")

            # Send back detailed counts to the frontend
            return Response({
                "message": f"Successfully added {created_count} new residents and updated {updated_count} existing residents.",
                "errors": errors
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def export_excel(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "DATA"

        # Exact headers extracted from Import-Inhabitant-Template-v1.4.2-13.xlsx
        headers = [
            'INHABITANT TYPE', 
            'LAST NAME', 
            'FIRST NAME', 
            'MIDDLE NAME', 
            'SUFFIX', 
            'BIRTH PLACE', 
            'BIRTHDATE (YYYY-MM-DD)', 
            'SEX', 
            'CIVIL STATUS', 
            'CITIZENSHIP', 
            'PROFESSION/ OCCUPATION', 
            'CONTACT NUMBER', 
            'EMAIL ADDRESS', 
            'HIGHEST EDUCATIONAL ATTAINMENT', 
            "MOTHER'S FIRST NAME", 
            "MOTHER'S MIDDLE NAME", 
            "MOTHER'S LAST NAME"
        ]
        ws.append(headers)

        # Style the header row to be bold
        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True)

        # Fetch all residents and map them to the 17 columns
        residents = Resident.objects.filter(is_approved=True).order_by('last_name', 'first_name')
        
        for res in residents:
            birthdate_str = res.birth_date.strftime('%Y-%m-%d') if res.birth_date else ""
            
            row = [
                getattr(res, 'inhabitant_type', 'Resident'), # Default to Resident if field doesn't exist
                res.last_name,
                res.first_name,
                res.middle_name,
                getattr(res, 'suffix', ''),
                getattr(res, 'birth_place', ''),
                birthdate_str,
                res.sex,
                res.civil_status,
                getattr(res, 'citizenship', 'Filipino'), # Default citizenship
                getattr(res, 'occupation', ''),
                getattr(res, 'contact_number', ''),
                getattr(res, 'email_address', ''),
                getattr(res, 'highest_education', ''),
                getattr(res, 'mothers_first_name', ''),
                getattr(res, 'mothers_middle_name', ''),
                getattr(res, 'mothers_last_name', ''),
            ]
            ws.append(row)

        from io import BytesIO
        from django.core.files.base import ContentFile
        from django.utils import timezone
        from .models import OfficialDocument

        buffer = BytesIO()
        wb.save(buffer)
        excel_bytes = buffer.getvalue()

        try:
            timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
            filename = f"Resident_Registry_Export_{timestamp_str}.xlsx"
            display_time = timezone.now().strftime("%b %d, %Y %I:%M %p")
            doc_title = f"Resident Registry Demographic Export - Generated {display_time}"
            uploader = request.user if request.user.is_authenticated else None

            OfficialDocument.objects.create(
                title=doc_title,
                file=ContentFile(excel_bytes, name=filename),
                document_type='Report',
                uploaded_by=uploader
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error auto-archiving registry export: {e}")

        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="Resident_Registry_Export.xlsx"'
        return response
    
    @action(detail=False, methods=['post'], url_path='bulk_delete')
    def bulk_delete(self, request):
        try:
            ids_to_delete = request.data.get('ids', [])
            if not ids_to_delete or not isinstance(ids_to_delete, list):
                return Response({"error": "Please provide a valid list of resident IDs to delete."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Perform deletion
            deleted_count, _ = Resident.objects.filter(id__in=ids_to_delete).delete()
            return Response({"message": f"Successfully deleted {deleted_count} residents."}, status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            return Response({"error": f"An error occurred during bulk deletion: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk_update_welfare')
    def bulk_update_welfare(self, request):
        try:
            ids_to_update = request.data.get('ids', [])
            flags = request.data.get('flags', {})
            
            if not ids_to_update or not isinstance(ids_to_update, list):
                return Response(
                    {"error": "Please provide a valid list of resident IDs to update."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Securely filter the incoming flags to ensure only welfare booleans are updated
            allowed_fields = ['is_4ps_beneficiary', 'is_senior_citizen', 'is_pwd', 'is_solo_parent', 'is_registered_voter']
            update_data = {}
            for key, value in flags.items():
                if key in allowed_fields and value is not None:
                    update_data[key] = bool(value)

            if not update_data:
                return Response(
                    {"error": "No valid welfare flags provided to update."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Perform the mass update (this executes as a single SQL query)
            updated_count = Resident.objects.filter(id__in=ids_to_update).update(**update_data)

            return Response(
                {"message": f"Successfully updated welfare statuses for {updated_count} residents."}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"An error occurred during bulk update: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==========================================
# 7. CALENDAR & EVENTS
# ==========================================
class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-start_time')
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsInternalUser()] 
        return super().get_permissions()



    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
# Make sure your Event model is imported here too!

@api_view(['GET'])
@permission_classes([AllowAny])  # <--- NEW: This explicitly opens the endpoint to the public
def calendar_feed(request):
    events = Event.objects.all()
    
    # Filter out AGENDA for residents (only STAFF and above can see)
    if not request.user.is_authenticated:
        events = events.exclude(event_type='AGENDA')
    else:
        try:
            role = request.user.otp_profile.role.upper()
            if role not in ['ADMIN', 'STAFF', 'SECRETARY', 'CAPTAIN']:
                events = events.exclude(event_type='AGENDA')
        except Exception:
            events = events.exclude(event_type='AGENDA')
            
    calendar_data = []
    
    for event in events:
        calendar_data.append({
            'id': f"event_{event.id}",
            'raw_id': event.id,
            'title': event.title,
            'description': event.description,
            'start': event.start_time,
            'end': event.end_time,
            'type': event.event_type 
        })
        
    return Response(calendar_data)


# ==========================================
# 8. ANNOUNCEMENTS, DASHBOARDS & DOCUMENTS
# ==========================================
class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        # FIX: Allow absolutely anyone (public/unauthenticated users) to view announcements
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        
        # Keep staff-only restriction for creating, updating, or deleting
        return [IsInternalUser()]

    def get_queryset(self):
        qs = Announcement.objects.all().order_by('-created_at')
        
        # When unarchiving, we need to be able to find the archived object!
        if self.action == 'unarchive':
            return qs
            
        if self.request.query_params.get('archived') == 'true':
            return qs.filter(is_archived=True)
        return qs.filter(is_archived=False)

    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def archive(self, request, pk=None):
        announcement = self.get_object()
        announcement.is_archived = True
        announcement.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def unarchive(self, request, pk=None):
        announcement = self.get_object()
        announcement.is_archived = False
        announcement.save()
        return Response({'status': 'unarchived'})



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

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        from datetime import date
        today = date.today()
        
        def sub_years(d, years):
            try:
                return d.replace(year=d.year - years)
            except ValueError:
                return d.replace(year=d.year - years, day=d.day - 1)

        age_15_date = sub_years(today, 15)
        age_30_date = sub_years(today, 30)
        age_60_date = sub_years(today, 60)

        # 1. Base Querysets
        residents = Resident.objects.filter(is_approved=True)
        households = Household.objects.all()

        total_residents = residents.count()

        # 2. Card Metrics
        welfare_count = residents.filter(
            Q(is_4ps_beneficiary=True) | 
            Q(is_senior_citizen=True) | 
            Q(is_pwd=True) | 
            Q(is_solo_parent=True) |
            Q(is_indigenous=True) |
            Q(is_ofw=True) |
            Q(is_out_of_school=True)
        ).count()

        registered_voters = residents.filter(is_registered_voter=True).count()
        
        # Youth: age between 15 (inclusive) and 30 (inclusive)
        # That means birth_date <= date 15 years ago AND birth_date >= date 31 years ago
        age_31_date = sub_years(today, 31)
        youth_residents = residents.filter(birth_date__lte=age_15_date, birth_date__gt=age_31_date).count()

        # 3. Chart Data (Aggregated Server-Side)
        
        # Gender
        gender_data = list(residents.values('sex').annotate(value=Count('id')))
        # rename 'sex' to 'name'
        for g in gender_data:
            g['name'] = g.pop('sex')

        # Welfare
        welfare_data = [
            {"name": "4Ps", "value": residents.filter(is_4ps_beneficiary=True).count()},
            {"name": "PWD", "value": residents.filter(is_pwd=True).count()},
            {"name": "Solo Parent", "value": residents.filter(is_solo_parent=True).count()},
            {"name": "Senior", "value": residents.filter(is_senior_citizen=True).count()},
            {"name": "Indigenous", "value": residents.filter(is_indigenous=True).count()},
            {"name": "OFW", "value": residents.filter(is_ofw=True).count()},
            {"name": "Out of School", "value": residents.filter(is_out_of_school=True).count()},
        ]

        # Voter
        voter_data = [
            {"name": "Registered", "value": registered_voters},
            {"name": "Not Registered", "value": total_residents - registered_voters},
        ]

        # Age Brackets
        age_brackets = [
            ("Under 5 years old", 0, 4),
            ("5-9 years old", 5, 9),
            ("10-14 years old", 10, 14),
            ("15-19 years old", 15, 19),
            ("20-24 years old", 20, 24),
            ("25-29 years old", 25, 29),
            ("30-34 years old", 30, 34),
            ("35-39 years old", 35, 39),
            ("40-44 years old", 40, 44),
            ("45-49 years old", 45, 49),
            ("50-54 years old", 50, 54),
            ("55-59 years old", 55, 59),
            ("60-64 years old", 60, 64),
            ("65-69 years old", 65, 69),
            ("70-74 years old", 70, 74),
            ("75-79 years old", 75, 79),
        ]

        age_data = []
        for name, min_age, max_age in age_brackets:
            min_date = sub_years(today, min_age)
            max_date = sub_years(today, max_age + 1)
            base_qs = residents.filter(birth_date__lte=min_date, birth_date__gt=max_date)
            male_count = base_qs.filter(sex='Male').count()
            female_count = base_qs.filter(sex='Female').count()
            age_data.append({"name": name, "Male": male_count, "Female": female_count})

        date_80 = sub_years(today, 80)
        base_qs_80 = residents.filter(birth_date__lte=date_80)
        m_80 = base_qs_80.filter(sex='Male').count()
        f_80 = base_qs_80.filter(sex='Female').count()
        age_data.append({"name": "80 years old and over", "Male": m_80, "Female": f_80})

        # Purok
        purok_data = list(residents.values('purok').annotate(value=Count('id')))
        for p in purok_data:
            p['name'] = p.pop('purok') or 'Unknown'

        # Civil Status
        civil_data = list(residents.values('civil_status').annotate(value=Count('id')))
        for c in civil_data:
            c['name'] = c.pop('civil_status') or 'Unknown'

        # Housing Status
        housing_data = list(households.values('housing_status').annotate(value=Count('id')))
        for h in housing_data:
            h['name'] = h.pop('housing_status') or 'Unknown'

        stats = {
            # Cards
            "total_residents": total_residents,
            "welfare_beneficiaries": welfare_count, 
            "registered_voters": registered_voters,
            "youth_residents": youth_residents,
            
            # Additional Dashboard metrics
                                                "chatbot_queries": AiQueryStatistic.objects.count(),

            # Charts
            "charts": {
                "monthly_ai": list(AiQueryStatistic.objects.filter(created_at__year=today.year).values('created_at__month').annotate(ai=Count('id')).order_by('created_at__month')),
                "gender": gender_data,
                "welfare": welfare_data,
                "voter": voter_data,
                "age": age_data,
                "purok": purok_data,
                "civil_status": civil_data,
                "housing_status": housing_data
            }
        }
        return Response(stats)

def get_demographics_snapshot():
    total_residents = Resident.objects.filter(is_approved=True).count()
    if total_residents == 0:
        return "No residents currently registered in the database."

    # Sex distribution
    sex_counts = dict(Resident.objects.filter(is_approved=True).values_list('sex').annotate(count=Count('id')))

    # Purok distribution
    purok_counts = dict(Resident.objects.filter(is_approved=True).values_list('purok').annotate(count=Count('id')))

    # Welfare and Status statistics
    status_stats = Resident.objects.filter(is_approved=True).aggregate(
        four_ps=Count('id', filter=Q(is_4ps_beneficiary=True)),
        seniors=Count('id', filter=Q(is_senior_citizen=True)),
        pwd=Count('id', filter=Q(is_pwd=True)),
        solo_parents=Count('id', filter=Q(is_solo_parent=True)),
        indigenous=Count('id', filter=Q(is_indigenous=True)),
        ofw=Count('id', filter=Q(is_ofw=True)),
        out_of_school=Count('id', filter=Q(is_out_of_school=True)),
        registered_voter=Count('id', filter=Q(is_registered_voter=True)),
    )

    # Age brackets
    today = date.today()
    # Age calculation approximations based on birth_date
    children = Resident.objects.filter(is_approved=True, birth_date__gt=today.replace(year=today.year - 15)).count()
    youth = Resident.objects.filter(
        birth_date__lte=today.replace(year=today.year - 15),
        birth_date__gt=today.replace(year=today.year - 31)
    ).count()
    seniors_age = Resident.objects.filter(is_approved=True, birth_date__lte=today.replace(year=today.year - 60)).count()
    adults = total_residents - (children + youth + seniors_age)

    return f"""
    BARANGAY DEMOGRAPHIC SNAPSHOT (LIVE DATA):
    - Total Registered Residents: {total_residents}
    - Gender Breakdown: {sex_counts}
    - Distribution by Purok / Zone: {purok_counts}
    - Age Group Distribution:
        * Children (0-14): {children}
        * Youth / SK Age (15-30): {youth}
        * Working-age Adults (31-59): {max(adults, 0)}
        * Senior Citizens (60+): {seniors_age}
    - Social Welfare Programs & Vulnerabilities:
        * 4Ps Beneficiaries: {status_stats['four_ps']}
        * PWD (Persons with Disabilities): {status_stats['pwd']}
        * Solo Parents: {status_stats['solo_parents']}
        * Tagged Senior Citizens: {status_stats['seniors']}
        * Indigenous Peoples (IP): {status_stats['indigenous']}
        * Overseas Filipino Workers (OFW): {status_stats['ofw']}
        * Out of School Youth (OSY): {status_stats['out_of_school']}
    - Civic Status:
        * Registered Voters: {status_stats['registered_voter']}
    """

class StaffDemographicsAiView(APIView):
    # Only authenticated users with staff tokens can access this endpoint
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Verify staff role
        try:
            role = user.otp_profile.role.upper()
        except Exception:
            role = 'RESIDENT'

        authorized_roles = ['ADMIN', 'STAFF', 'SECRETARY', 'CAPTAIN']
        if role not in authorized_roles:
            raise PermissionDenied("Access denied. Demographics intelligence is restricted to administrative staff.")

        user_prompt = request.data.get('prompt')
        if not user_prompt:
            return Response({"error": "Prompt is required."}, status=400)

        try:
            from .models import DemographicSnapshot
            demographics_data = get_demographics_snapshot()

            snapshots = DemographicSnapshot.objects.all().order_by('snapshot_date')
            historical_context = "HISTORICAL MONTHLY SNAPSHOTS (Use this for trend and comparison questions):\\n"
            for s in snapshots:
                month_name = s.snapshot_date.strftime("%B %Y")
                historical_context += f"""
[{month_name} Snapshot - As of {s.snapshot_date}]
Total Residents: {s.total_residents}
Age Groups: Children={s.children}, Youth={s.youth}, Adults={s.adults}, Seniors={s.seniors}
Sectors: 4Ps={s.four_ps}, PWD={s.pwd}, Solo Parents={s.solo_parents}, OFW={s.ofw}, OSY={s.out_of_school}, Indigenous={s.indigenous}
Registered Voters: {s.registered_voters}
Gender: Male={s.male}, Female={s.female}
Purok data: {s.purok_data}
"""

            system_instruction = f"""
            You are the Barangay Executive Data Analyst for Barangay officials (Captains and Secretaries).
            Your purpose is to answer analytical, statistical, and operational questions based strictly on the barangay census data provided.

            Here is the CURRENT LIVE resident census data (use this for "current" or "now" questions):
            {demographics_data}
            
            {historical_context}

            CRITICAL Guidelines:
            - Answer the questions accurately based ONLY on the provided demographic snapshots.
            - If asked for yearly demographic figures (e.g. "population for 2026"), ALWAYS use the December snapshot of that year. Do NOT sum the months together.
            - If asked for trends or changes (e.g. "from January to June"), compare the data between those specific monthly snapshots.
            - Offer actionable community planning insights when requested.
            - Maintain a formal, executive, objective tone.
            - If asked about individuals, state that individual PII is strictly protected and cannot be retrieved.
            """

            model = genai.GenerativeModel(
                model_name="gemini-3.5-flash-lite",
                system_instruction=system_instruction
            )
            chat_response = model.generate_content(user_prompt)

            return Response({"reply": chat_response.text})

        except Exception as e:
            print(f"Staff AI Analytics Error: {e}")
            return Response(
                {"error": "Failed to analyze demographic data. Please try again later."},
                status=500
            )

class AiAssistantView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AiChatThrottle]

    def post(self, request):
        user_prompt = request.data.get('prompt')
        if not user_prompt:
            return Response({"error": "Prompt is required"}, status=400)

        try:
            from .models import BarangaySettings, EmergencyContact, BarangayOfficial, BarangayFAQ
            
            # 1. Fetch live context from the database
            settings = BarangaySettings.objects.first()
            contacts = EmergencyContact.objects.all().order_by('category', 'order')
            officials = BarangayOfficial.objects.filter(is_active=True).order_by('order')
            faqs = BarangayFAQ.objects.filter(is_active=True).order_by('category', 'order', 'id')

            # 2. Build Context Strings
            b_name = settings.barangay_name if settings else "the Barangay"
            
            settings_context = ""
            if settings:
                operating_hrs = getattr(settings, 'operating_hours', 'Monday – Friday: 8:00 AM – 5:00 PM')
                advisory_msg = settings.advisory_banner_text if getattr(settings, 'show_advisory_banner', False) and getattr(settings, 'advisory_banner_text', '') else 'No active emergency advisory.'
                settings_context = f"""
                Barangay Name: {settings.barangay_name}
                Address: {settings.barangay_hall_address}
                Contact Number: {settings.official_contact_number}
                Contact Email: {settings.official_contact_email}
                Operating Hours / Schedule: {operating_hrs}
                Active Advisory: {advisory_msg}
                Classification: {settings.barangay_classification}, {settings.barangay_city}, {settings.barangay_province}, {settings.barangay_region}
                Puroks: {settings.number_of_puroks}
                
                History: {settings.history_text}
                Location & Geography: {settings.location_geography_text}
                Community & Culture: {settings.community_culture_text}
                Services & Facilities: {settings.services_facilities_text}
                """
                
            contacts_context = "\n".join([f"- {c.name} ({c.category}): {c.phone} - {c.description}" for c in contacts])
            officials_context = "\n".join([f"- {o.name} (Position: {o.position}, Committee: {o.committee})" for o in officials])
            faqs_context = "\n".join([f"- [{f.get_category_display()}] Q: {f.question}\n  A: {f.answer}" for f in faqs])
            if not faqs_context:
                faqs_context = "No custom FAQs recorded yet."

            # 3. Construct System Instruction
            system_instruction = f"""
            You are the official AI Assistant for {b_name}. 
            Your job is to help residents with local government services, inquiries, and information.
            
            Here is the official, live data for your barangay. You MUST use this data to answer questions accurately. Do not invent information.
            
            [BARANGAY DETAILS & OPERATING HOURS]
            {settings_context}
            
            [EMERGENCY CONTACTS]
            {contacts_context}
            
            [BARANGAY OFFICIALS & COUNCIL]
            {officials_context}

            [OFFICIAL KNOWLEDGE BASE & FAQS (FEES, CLEARANCES, REQUIREMENTS & PROCEDURES)]
            {faqs_context}
            
            Guidelines:
            - Answer questions accurately using the official context provided above.
            - If residents ask about clearances, certificate fees, or requirements, refer strictly to the Knowledge Base & FAQs section above. Give the specific fee (e.g. ₱50.00 for employment, free for first-time jobseekers, ₱0 for indigency) and requirements.
            - If residents ask about operating hours or office schedule, provide the official hours from the details above.
            - If there is an active emergency advisory, remind residents if relevant to their inquiry.
            - If asked about contact numbers, provide the specific hotlines from the Emergency Contacts list.
            - If asked about who is in charge of something, check the Barangay Officials list and their committees.
            - Keep your answers concise, friendly, and professional. Use formatting (bullet points, bold text) to make it easy to read.
            - You may reply in English or Tagalog/Filipino depending on the language used by the resident.
            - If someone asks a question completely unrelated to the barangay or local government, politely decline to answer and redirect them to barangay services.
            """
            
            model = genai.GenerativeModel(
                model_name="gemini-3.5-flash-lite",
                system_instruction=system_instruction
            )
            chat_response = model.generate_content(user_prompt)
            ai_response_text = chat_response.text

            # --- Only attach the user if they are actually logged in ---
            user_instance = request.user if request.user.is_authenticated else None

            AiQueryStatistic.objects.create(
                user=user_instance, # This will safely be NULL for public residents
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
    permission_classes = [IsInternalUser]
    pagination_class = DocumentPagination
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, OrderingFilter]
    filterset_fields = ['document_type', 'is_archived'] 
    search_fields = ['title']
    ordering_fields = ['title', 'document_type', 'uploaded_at']
    ordering = ['-uploaded_at'] 




    
    def get_queryset(self):
        return OfficialDocument.objects.all().order_by('-uploaded_at')

    @action(detail=True, methods=['post'], permission_classes=[IsInternalUser])
    def archive(self, request, pk=None):
        document = self.get_object()
        document.is_archived = True
        document.save()
        return Response({'status': 'archived'})

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['post'], permission_classes=[IsInternalUser])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        documents = OfficialDocument.objects.filter(id__in=ids)
        for doc in documents:
            doc._change_reason = "Bulk Deleted from Archives"
            doc.delete()
        return Response(status=204)

    @action(detail=False, methods=['post'], permission_classes=[IsInternalUser])
    def bulk_archive(self, request):
        ids = request.data.get('ids', [])
        documents = OfficialDocument.objects.filter(id__in=ids)
        for doc in documents:
            doc.is_archived = True
            doc._change_reason = "Bulk Archived"
            doc.save()
        return Response(status=204)

# ==========================================
# 9. ADMIN HUB & AUDIT LOGS
# ==========================================
class AdminAuditLogAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):

        # Query Parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))
        export = request.GET.get('export', 'false').lower() == 'true'
        
        # Filters
        action_filter = request.GET.get('action', '')
        user_filter = request.GET.get('user', '')
        model_filter = request.GET.get('model', '')
        start_date = request.GET.get('start_date', '')
        end_date = request.GET.get('end_date', '')

        # Action mapping to simple-history types
        action_map_reverse = {'Created': '+', 'Updated': '~', 'Deleted': '-'}

        def apply_filters(queryset, is_session_log=False):
            if start_date:
                queryset = queryset.filter(history_date__gte=start_date)
            if end_date:
                # Add 1 day to include the entire end_date
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                    queryset = queryset.filter(history_date__lt=end_date_obj)
                except ValueError:
                    pass
            if action_filter and action_filter in action_map_reverse:
                if is_session_log:
                    return queryset.none()
                else:
                    queryset = queryset.filter(history_type=action_map_reverse[action_filter])
            if user_filter:
                if is_session_log:
                    queryset = queryset.filter(user__username__icontains=user_filter)
                else:
                    queryset = queryset.filter(history_user__username__icontains=user_filter)
            return queryset

        # 1. Fetch the logs from all tracked models based on model_filter
        querysets = []
        if not model_filter or model_filter == 'Resident':
            querysets.append(apply_filters(Resident.history.all()))
        if not model_filter or model_filter == 'UserProfile':
            querysets.append(apply_filters(UserProfile.history.all()))
        if not model_filter or model_filter == 'BarangayOfficial':
            querysets.append(apply_filters(BarangayOfficial.history.all()))
        if not model_filter or model_filter == 'OfficialTab':
            querysets.append(apply_filters(OfficialTab.history.all()))
        if not model_filter or model_filter == 'BarangayFAQ':
            querysets.append(apply_filters(BarangayFAQ.history.all()))
        if not model_filter or model_filter == 'BarangaySettings':
            querysets.append(apply_filters(BarangaySettings.history.all()))
        if not model_filter or model_filter == 'EmergencyContact':
            querysets.append(apply_filters(EmergencyContact.history.all()))
        if not model_filter or model_filter == 'Announcement':
            querysets.append(apply_filters(Announcement.history.all()))
        if not model_filter or model_filter == 'Event':
            querysets.append(apply_filters(Event.history.all()))
        if not model_filter or model_filter == 'OfficialDocument':
            querysets.append(apply_filters(OfficialDocument.history.all()))
        if not model_filter or model_filter == 'Household':
            querysets.append(apply_filters(Household.history.all()))
        if not model_filter or model_filter == 'SessionLog':
            from .models import SessionLog
            querysets.append(apply_filters(SessionLog.objects.all(), is_session_log=True))

        # 2. Combine and sort
        combined_logs = sorted(
            chain(*querysets),
            key=attrgetter('history_date'),
            reverse=True
        )

        total_logs = len(combined_logs)

        # Apply Pagination if not exporting
        if not export:
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_logs = combined_logs[start_index:end_index]
            total_pages = math.ceil(total_logs / page_size) if total_logs > 0 else 1
        else:
            paginated_logs = combined_logs
            total_pages = 1

        log_data = []
        for record in paginated_logs:
            action_map = {'+': 'Created', '~': 'Updated', '-': 'Deleted', '*': 'Session Event'}
            model_name = record.__class__.__name__.replace('Historical', '')
            
            if model_name == 'SessionLog':
                action_user = record.user.username if record.user else "Deleted User"
                log_data.append({
                    "id": record.history_id,
                    "model": "Session",
                    "action": "Session Event",
                    "user": action_user,
                    "target": "Authentication",
                    "date": record.history_date.isoformat(),
                    "details": record.action,
                })
                continue

            # Detail Calculation
            details = ""
            if record.history_type == '~':
                prev_record = record.prev_record
                if prev_record:
                    delta = record.diff_against(prev_record)
                    changes = []
                    for change in delta.changes:
                        changes.append(f"{change.field}: {change.old} -> {change.new}")
                    details = " | ".join(changes)
                else:
                    details = "Updated (No previous record found)"
            elif record.history_type == '+':
                details = "Initial creation"
            elif record.history_type == '-':
                details = "Record deleted permanently"

            # Dynamic Target Extraction
            target_info = f"ID: {getattr(record, 'id', record.history_id)}"
            
            try:
                if model_name == "UserProfile":
                    from django.contrib.auth.models import User
                    u = User.objects.filter(id=getattr(record, 'user_id', None)).first()
                    target_info = u.username if u else f"User #{getattr(record, 'user_id', getattr(record, 'id', '?'))}"
                elif model_name == "Resident":
                    target_info = f"{getattr(record, 'first_name', '')} {getattr(record, 'last_name', '')}".strip()
                elif model_name == "Household":
                    target_info = f"Household at {getattr(record, 'address', '')[:30]}..." 
                elif model_name in ["Announcement", "Event", "OfficialDocument"]:
                    target_info = getattr(record, 'title', target_info)
                elif model_name in ["BarangayOfficial", "EmergencyContact", "OfficialTab"]:
                    target_info = getattr(record, 'name', target_info)
                elif model_name == "BarangayFAQ":
                    target_info = getattr(record, 'question', target_info)
                elif model_name == "BarangaySettings":
                    target_info = "Global Configuration"
                elif model_name == "Session":
                    target_info = "Authentication"
            except Exception:
                pass
                
            if not target_info:
                target_info = f"ID: {record.history_id}"

            action_user = "System"
            try:
                if record.history_user:
                    action_user = record.history_user.username
            except Exception:
                action_user = "Deleted User"

            display_model = "Council Tab" if model_name == "OfficialTab" else ("Barangay FAQ" if model_name == "BarangayFAQ" else model_name)

            log_data.append({
                "id": record.history_id,
                "model": display_model,
                "target": target_info,
                "action": action_map.get(record.history_type, 'Unknown'),
                "user": action_user,
                "date": record.history_date.isoformat(),
                "details": details,
            })

        if export:
            import csv
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
            writer = csv.writer(response)
            writer.writerow(['ID', 'Timestamp', 'User', 'Action', 'Model', 'Target', 'Details'])
            for log in log_data:
                writer.writerow([log['id'], log['date'], log['user'], log['action'], log['model'], log['target'], log['details']])
            return response

        return Response({
            'count': total_logs,
            'num_pages': total_pages,
            'current_page': page,
            'results': log_data
        }, status=status.HTTP_200_OK)


class StaffManagementAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        
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
                "must_change_password": profile.must_change_password,
            })
        return Response(staff_data, status=status.HTTP_200_OK)

    def post(self, request):

        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        staff_role = request.data.get('role')

        if not all([username, password, email, staff_role]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        # --- SECURITY FIX: Strict Whitelist ---
        staff_role_upper = staff_role.upper()
        allowed_roles = ['STAFF', 'CAPTAIN']
        
        if staff_role_upper not in allowed_roles:
            return Response(
                {"error": f"Security restriction: You are not authorized to create '{staff_role_upper}' level admin accounts."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        # --------------------------------------

        # Enforce single active Punong Barangay (CAPTAIN)
        if staff_role_upper == 'CAPTAIN' and UserProfile.objects.filter(role='CAPTAIN', user__is_active=True).exists():
            return Response(
                {"error": "An active Punong Barangay account already exists. You must deactivate or delete the existing Punong Barangay account before registering a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_user = User.objects.create_user(username=username, email=email, password=password)
            if staff_role_upper in ['ADMIN', 'STAFF', 'CAPTAIN', 'SECRETARY']:
                new_user.is_staff = True
                new_user.save()
            UserProfile.objects.create(user=new_user, role=staff_role_upper, must_change_password=True)
            from .models import SessionLog
            SessionLog.objects.create(user=request.user, action=f"Created {staff_role_upper} Account: {username}")
            return Response({"message": f"{staff_role_upper} account created successfully."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
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
            requester_role = request.user.otp_profile.role if hasattr(request.user, 'otp_profile') else 'RESIDENT'
            
            if target_profile and target_profile.role == 'ADMIN' and action_type in ['delete_account', 'change_role', 'reset_password']:
                return Response(
                    {"error": "Admin accounts cannot be deleted, have their role changed, or have their passwords reset via the dashboard. Use the Forgot Password page to reset passwords."},
                    status=status.HTTP_403_FORBIDDEN
                )

            if target_profile and target_profile.role in ['CAPTAIN', 'SECRETARY'] and requester_role not in ['CAPTAIN', 'ADMIN']:
                return Response(
                    {"error": f"You do not have clearance to modify a {target_profile.role} account."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            from .models import SessionLog

            if action_type == 'toggle_status':
                # Double-check protection: Never allow deactivating a Captain or Secretary from the frontend unless you're an ADMIN
                if target_profile.role in ['CAPTAIN', 'SECRETARY'] and requester_role != 'ADMIN':
                    return Response({"error": "Critical system accounts cannot be revoked via the dashboard."}, status=status.HTTP_403_FORBIDDEN)
                
                # If activating an account that has role CAPTAIN, ensure no other active CAPTAIN exists
                if not target_user.is_active and target_profile.role == 'CAPTAIN':
                    if UserProfile.objects.filter(role='CAPTAIN', user__is_active=True).exclude(user=target_user).exists():
                        return Response(
                            {"error": "Cannot activate this Punong Barangay account because another active Punong Barangay account already exists. Deactivate or delete the active one first."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                target_user.is_active = not target_user.is_active
                target_user.save()
                status_text = "Activated" if target_user.is_active else "Deactivated"
                SessionLog.objects.create(user=request.user, action=f"Account {status_text}: {target_user.username}")
                return Response({"message": f"Account {status_text} successfully."}, status=status.HTTP_200_OK)
            
            elif action_type == 'reset_password':
                new_password = request.data.get('new_password')
                if not new_password:
                    return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
                target_user.set_password(new_password)
                target_user.save()
                if target_profile:
                    target_profile.must_change_password = True
                    target_profile.save()
                SessionLog.objects.create(user=request.user, action=f"Reset Password for {target_user.username}")
                return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)

            elif action_type == 'delete_account':
                if target_profile and target_profile.role in ['CAPTAIN', 'SECRETARY'] and requester_role != 'ADMIN':
                    return Response({"error": "Critical system accounts cannot be deleted."}, status=status.HTTP_403_FORBIDDEN)
                deleted_name = target_user.username
                target_user.delete()
                SessionLog.objects.create(user=request.user, action=f"Deleted Account: {deleted_name}")
                return Response({"message": "Account permanently deleted."}, status=status.HTTP_200_OK)

            elif action_type == 'change_role':
                new_role = request.data.get('new_role')
                if not new_role:
                    return Response({"error": "New role is required."}, status=status.HTTP_400_BAD_REQUEST)
                
                new_role = new_role.upper()
                allowed_roles = ['ADMIN', 'STAFF', 'CAPTAIN', 'SECRETARY', 'TREASURER', 'COUNCIL', 'SK', 'TANOD']
                
                if new_role not in allowed_roles:
                    return Response({"error": "Invalid or unauthorized role assignment."}, status=status.HTTP_403_FORBIDDEN)
                
                if target_profile.role in ['CAPTAIN', 'SECRETARY'] and requester_role != 'ADMIN':
                    return Response({"error": "Cannot downgrade critical system accounts."}, status=status.HTTP_403_FORBIDDEN)

                if new_role == 'CAPTAIN' and target_user.is_active:
                    if UserProfile.objects.filter(role='CAPTAIN', user__is_active=True).exclude(user=target_user).exists():
                        return Response(
                            {"error": "An active Punong Barangay account already exists. Deactivate or delete the existing Punong Barangay account first."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

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
        # F-027: Prevent empty seal URL from turning into literal string 'null'
        if settings.barangay_seal_url and settings.barangay_seal_url.strip().lower() in ['null', 'none', 'undefined']:
            settings.barangay_seal_url = ''
            settings.save()
        serializer = BarangaySettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            role = request.user.otp_profile.role.upper()
        except Exception:
            raise PermissionDenied("User profile not found.")
            
        if role not in ['CAPTAIN', 'SECRETARY', 'ADMIN']:
            raise PermissionDenied("Only Captains and Secretaries can modify system settings.")

        settings, created = BarangaySettings.objects.get_or_create(pk=1)
        save_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'barangay_seal_url' in save_data:
            val = str(save_data.get('barangay_seal_url') or '').strip()
            if val.lower() in ['null', 'none', 'undefined', '']:
                save_data['barangay_seal_url'] = ''

        # Handle removing barangay_seal or captain_image if sent as empty string or 'null'
        if 'barangay_seal' in save_data and not request.FILES.get('barangay_seal'):
            val = str(save_data.get('barangay_seal') or '').strip().lower()
            if val in ['null', 'none', 'undefined', '']:
                settings.barangay_seal = None
                settings.save()
                save_data.pop('barangay_seal', None)

        if 'captain_image' in save_data and not request.FILES.get('captain_image'):
            val = str(save_data.get('captain_image') or '').strip().lower()
            if val in ['null', 'none', 'undefined', '']:
                settings.captain_image = None
                settings.save()
                save_data.pop('captain_image', None)

        serializer = BarangaySettingsSerializer(settings, data=save_data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "System settings updated successfully."}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AiQueryStatisticViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows AI Query statistics to be viewed by admins/staff.
    """
    queryset = AiQueryStatistic.objects.all().order_by('-created_at')
    serializer_class = AiQueryStatisticSerializer
    permission_classes = [IsAdminUser]
class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all().order_by('category', 'order', 'id')
    serializer_class = EmergencyContactSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsInternalUser()]


class OfficialTabViewSet(viewsets.ModelViewSet):
    queryset = OfficialTab.objects.all().order_by('order', 'id')
    serializer_class = OfficialTabSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]


class BarangayOfficialViewSet(viewsets.ModelViewSet):
    queryset = BarangayOfficial.objects.select_related('tab').all().order_by('order', 'id')
    serializer_class = BarangayOfficialSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        tab_id = self.request.query_params.get('tab')
        if tab_id:
            qs = qs.filter(tab_id=tab_id)
        return qs



class ForceDemographicSnapshotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            role = user.otp_profile.role.upper()
        except Exception:
            return Response({"error": "Unauthorized"}, status=403)
            
        if role not in ['ADMIN', 'SECRETARY', 'CAPTAIN']:
            return Response({"error": "Access denied."}, status=403)
            
        from .scheduler import generate_monthly_snapshot
        
        success = generate_monthly_snapshot()
        if success:
            return Response({"message": "Successfully generated the demographic snapshot for today."})
        else:
            return Response({"error": "Failed to generate snapshot."}, status=500)


class ProtectedMediaView(APIView):
    """
    Secure media serving view.
    Public media (announcements, officials, settings) are publicly accessible.
    Sensitive media (resident IDs, official documents, profile updates) require authenticated internal staff.
    """
    permission_classes = [AllowAny]

    def get(self, request, file_path):
        import os
        import mimetypes
        from django.http import FileResponse, Http404

        safe_path = os.path.normpath(file_path).lstrip('/\\')
        if safe_path.startswith('..') or '..' in safe_path.split(os.path.sep):
            raise Http404("Invalid file path.")

        lower_path = safe_path.replace('\\', '/').lower()
        is_sensitive = any(lower_path.startswith(prefix) for prefix in [
            'residents/', 'official_documents/', 'documents/', 'updates/', 'cert_requirements/'
        ])

        if is_sensitive:
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required to access this file."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            try:
                role = str(request.user.otp_profile.role).upper()
            except Exception:
                role = ''
            if not (request.user.is_superuser or request.user.is_staff or role in ['ADMIN', 'STAFF', 'CAPTAIN', 'SECRETARY']):
                return Response(
                    {"detail": "Access denied to protected document."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

        full_path = os.path.join(settings.MEDIA_ROOT, safe_path)
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise Http404("File not found.")

        content_type, _ = mimetypes.guess_type(full_path)
        filename = os.path.basename(full_path)
        as_attachment = request.GET.get('download') in ['1', 'true', 'yes']
        return FileResponse(
            open(full_path, 'rb'), 
            content_type=content_type or 'application/octet-stream',
            as_attachment=as_attachment,
            filename=filename
        )

class BarangayFAQViewSet(viewsets.ModelViewSet):
    queryset = BarangayFAQ.objects.all().order_by('order', 'id')
    serializer_class = BarangayFAQSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminUser()]

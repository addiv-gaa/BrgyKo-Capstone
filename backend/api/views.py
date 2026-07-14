from django.conf import settings
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
import google.generativeai as genai

from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics

from .models import (
    CertificateRequest, 
    PermitRequest, 
    AiQueryStatistic, 
    InventoryItem, 
    Announcement, 
    ReadAnnouncement, 
    Household,
    Resident,
)

from .serializers import (
    CertificateRequestSerializer, 
    PermitRequestSerializer, 
    UserSerializer, 
    InventoryItemSerializer, 
    AnnouncementSerializer, 
    HouseholdSerializer,
    ResidentSerializer,
)

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import UserRateThrottle
from .permissions import IsAdminGroup, IsStaffGroup
from rest_framework.views import APIView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

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
        
class InventoryListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated] 
    queryset = InventoryItem.objects.all().order_by('-created_at')
    serializer_class = InventoryItemSerializer

class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        stats = {
            "total_residents": User.objects.count(),
            "certs_this_month": CertificateRequest.objects.count(), 
            "items_borrowed": InventoryItem.objects.filter(status='Borrowed').aggregate(Sum('quantity'))['quantity__sum'] or 0,
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
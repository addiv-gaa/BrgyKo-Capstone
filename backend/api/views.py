from django.conf import settings
import google.generativeai as genai

from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics

from .models import CertificateRequest, PermitRequest, AiQueryStatistic, InventoryItem
from .serializers import CertificateRequestSerializer, PermitRequestSerializer, UserSerializer, InventoryItemSerializer

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import UserRateThrottle
from .permissions import IsAdminGroup, IsStaffGroup
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

genai.configure(api_key=settings.GOOGLE_API_KEY)

# Create your views here.
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class CertificateRequestView(generics.ListCreateAPIView):
    queryset = CertificateRequest.objects.all()
    serializer_class = CertificateRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filters the database so the user only sees their own requests
        return CertificateRequest.objects.filter(user=self.request.user)

    # --- Handles the POST request ---
    def perform_create(self, serializer):
        # Automatically attaches the logged-in user to the request before saving
        serializer.save(user=self.request.user)

class PermitRequestView(generics.ListCreateAPIView):
    queryset = PermitRequest.objects.all()
    serializer_class = PermitRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filters the database so the user only sees their own requests
        return PermitRequest.objects.filter(user=self.request.user)

    # --- Handles the POST request ---
    def perform_create(self, serializer):
        # Automatically attaches the logged-in user to the request before saving
        serializer.save(user=self.request.user)

class PermitRequestManagerView(APIView):
    # This locks the endpoint. A standard 'User' will get a 403 Forbidden.
    permission_classes = [IsStaffGroup]

    def get(self, request):
        # Your logic to fetch permits for staff to review
        return Response({"message": "Here are the permit requests."})

class SystemSettingsView(APIView):
    # Only Admins can hit this endpoint.
    permission_classes = [IsAdminGroup]

    def post(self, request):
        return Response({"message": "System settings updated."})
    
class CertificateRequestManagerView(generics.ListAPIView):
    # Only staff can access this list
    permission_classes = [IsStaffGroup] 
    serializer_class = CertificateRequestSerializer
    
    def get_queryset(self):
        # Returns ALL certificates, showing newest first
        return CertificateRequest.objects.all().order_by('date_requested')
    
class AiChatThrottle(UserRateThrottle):
    scope = 'ai_chat'

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
            # 2. Define the AI's Persona using System Instructions
            # This is crucial for a helpdesk system so it doesn't answer off-topic questions.
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

            # 3. Initialize the model
            model = genai.GenerativeModel(
                model_name="gemini-3.1-flash-lite",
                system_instruction=system_instruction
            )

            # 4. Generate the response from Gemini
            chat_response = model.generate_content(user_prompt)
            ai_response_text = chat_response.text

            # 5. Save the interaction to PostgreSQL for your dashboard statistics
            AiQueryStatistic.objects.create(
                user=request.user,
                prompt=user_prompt,
                response=ai_response_text
            )

            # 6. Send the response back to React
            return Response({"reply": ai_response_text})

        except Exception as e:
            # Catch API errors (e.g., quota exceeded, network issues)
            print(f"Gemini API Error: {e}")
            return Response(
                {"error": "The AI is currently unavailable. Please try again later."}, 
                status=503
            )
        
class InventoryListView(generics.ListCreateAPIView):
    # Depending on your setup, you might want to restrict this to IsStaffGroup
    permission_classes = [IsAuthenticated] 
    queryset = InventoryItem.objects.all().order_by('-created_at')
    serializer_class = InventoryItemSerializer
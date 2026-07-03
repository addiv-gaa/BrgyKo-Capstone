from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics

from .models import CertificateRequest
from .serializers import CertificateRequestSerializer, UserSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny

# Create your views here.
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
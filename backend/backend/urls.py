"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from api.views import AiAssistantView, CreateUserView, CertificateRequestView, PermitRequestView, CustomTokenObtainPairView, CertificateRequestManagerView, InventoryListView, InventoryDetailView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/register/', CreateUserView.as_view(), name='register'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api-auth/', include("rest_framework.urls")), 
    path('api/certificates/', CertificateRequestView.as_view(), name='certificate-request'),
    path('api/permits/', PermitRequestView.as_view(), name='permit-request'),
    path('api/manager/certificates/', CertificateRequestManagerView.as_view(), name='manager-certificates'),
    path('api/ai-assistant/', AiAssistantView.as_view(), name='ai-assistant'),
    path('api/inventory/', InventoryListView.as_view(), name='inventory-list'),
    path('api/inventory/<int:pk>/', InventoryDetailView.as_view(), name='inventory-detail'), 
]


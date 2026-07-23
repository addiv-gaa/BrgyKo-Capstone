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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from api.views import (
    AiAssistantView, 
    CreateUserView, 
    CertificateRequestView, 
    PermitRequestView, 
    CustomTokenObtainPairView,
    ClaimResidentProfileView, 
    CertificateRequestManagerViewSet, 
    PermitRequestManagerViewSet, 
    DashboardStatsView, 
    AnnouncementViewSet,
    HouseholdViewSet,
    ResidentViewSet,
    FacilityViewSet,       
    EquipmentViewSet,      
    EventViewSet,          
    ReservationViewSet,    
    calendar_feed,         
    OfficialDocumentViewSet,
    ResidentApprovalViewSet,
    RegisterWithEmailView,
    VerifyEmailOTPView,
    ResendOTPView,
)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'households', HouseholdViewSet, basename='household')
router.register(r'residents', ResidentViewSet, basename='residents')
router.register(r'manager/certificates', CertificateRequestManagerViewSet, basename='manager-certificates')
router.register(r'manager/permits', PermitRequestManagerViewSet, basename='manager-permits')
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'events', EventViewSet, basename='event')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'official-documents', OfficialDocumentViewSet, basename='official-documents')
router.register(r'resident-approvals', ResidentApprovalViewSet, basename='resident-approvals')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api-auth/', include("rest_framework.urls")), 
    path('api/certificates/', CertificateRequestView.as_view(), name='certificate-request'),
    path('api/permits/', PermitRequestView.as_view(), name='permit-request'),
    path('api/ai-assistant/', AiAssistantView.as_view(), name='ai-assistant'),
    path('api/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/calendar-feed/', calendar_feed, name='calendar-feed'),
    path('api/claim-profile/', ClaimResidentProfileView.as_view(), name='claim-profile'),
    path('api/register/', RegisterWithEmailView.as_view(), name='register'),
    path('api/verify-otp/', VerifyEmailOTPView.as_view(), name='verify-otp'),
    path('api/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('api/', include(router.urls)), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
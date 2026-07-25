from django.urls import path, include
from django.contrib import admin 
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings             # 1. Import settings
from django.conf.urls.static import static   # 2. Import static
from api.views import (
    # Authentication & User Management
    CustomTokenObtainPairView,
    CreateUserView,
    RegisterWithEmailView,
    VerifyEmailOTPView,
    ResendOTPView,
    SystemSettingsView,
    
    # User Profile & Approvals
    UserProfileView,
    ClaimResidentProfileView,
    SubmitResidentApplicationView, # NEW
    UnlinkProfileView, # NEW
    ResetRejectedClaimView,
    ResidentApprovalViewSet,
    
    # Profile Corrections
    CreateProfileUpdateRequestView,
    StaffProfileUpdateListView,
    StaffProfileUpdateActionView,

    # Core Features (User Facing)
    CertificateRequestView,
    PermitRequestView,
    AiAssistantView,
    DashboardStatsView,
    calendar_feed,
    
    # Core Features (Routers)
    CertificateRequestManagerViewSet,
    PermitRequestManagerViewSet,
    AnnouncementViewSet,
    HouseholdViewSet,
    ResidentViewSet,
    ReservationViewSet,
    FacilityViewSet,
    EquipmentViewSet,
    EventViewSet,
    OfficialDocumentViewSet,
    IncidentReportViewSet, # NEW

    # Admin Hub & Audit Logs
    AdminAuditLogAPIView,
    StaffManagementAPIView,

)

# --- ViewSet Routers ---
router = DefaultRouter()
router.register(r'manager/certificates', CertificateRequestManagerViewSet, basename='manager-certificates')
router.register(r'manager/permits', PermitRequestManagerViewSet, basename='manager-permits')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'households', HouseholdViewSet, basename='households')
router.register(r'residents', ResidentViewSet, basename='residents')
router.register(r'resident-approvals', ResidentApprovalViewSet, basename='resident-approvals')
router.register(r'reservations', ReservationViewSet, basename='reservations')
router.register(r'facilities', FacilityViewSet, basename='facilities')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'events', EventViewSet, basename='events')
router.register(r'official-documents', OfficialDocumentViewSet, basename='official-documents')
router.register(r'incident-reports', IncidentReportViewSet, basename='incident-reports') # NEW

urlpatterns = [
    # --- Authentication & Registration ---
    path('api/auth/register/', RegisterWithEmailView.as_view(), name='register_email'),
    path('api/auth/verify-otp/', VerifyEmailOTPView.as_view(), name='verify_otp'),
    path('api/auth/resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', CreateUserView.as_view(), name='register'),
    
    # --- Profile & Identity ---
    path('api/user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('api/claim-profile/', ClaimResidentProfileView.as_view(), name='claim-profile'),
    path('api/submit-resident-application/', SubmitResidentApplicationView.as_view(), name='submit-resident-application'), # NEW
    path('api/unlink-profile/', UnlinkProfileView.as_view(), name='unlink-profile'), # NEW
    path('api/reset-rejected-claim/', ResetRejectedClaimView.as_view(), name='reset-rejected-claim'),
    
    # --- Profile Corrections ---
    path('api/profile-update-request/', CreateProfileUpdateRequestView.as_view(), name='create-profile-update'),
    path('api/staff/profile-updates/', StaffProfileUpdateListView.as_view(), name='staff-profile-updates-list'),
    path('api/staff/profile-updates/<int:pk>/', StaffProfileUpdateActionView.as_view(), name='staff-profile-updates-action'),

    # --- Requests (User Facing) ---
    path('api/certificates/', CertificateRequestView.as_view(), name='certificate-list-create'),
    path('api/permits/', PermitRequestView.as_view(), name='permit-list-create'),

    # --- Utility & Dashboards ---
    path('api/ai-assistant/', AiAssistantView.as_view(), name='ai-assistant'),
    path('api/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/calendar-feed/', calendar_feed, name='calendar-feed'),
    path('api/system/settings/', SystemSettingsView.as_view(), name='system-settings'),

    # --- Admin Hub & Audit Logs ---
    path('api/admin/audit-logs/', AdminAuditLogAPIView.as_view(), name='audit-logs'),
    path('api/admin/staff-management/', StaffManagementAPIView.as_view(), name='staff-management'),

    # --- Router Includes ---
    path('api/', include(router.urls)),

    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
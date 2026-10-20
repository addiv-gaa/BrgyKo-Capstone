from django.urls import path, include
from django.contrib import admin 
from rest_framework.routers import DefaultRouter
from django.conf import settings             # 1. Import settings
from django.conf.urls.static import static   # 2. Import static
from api.views import (
    ForgotPasswordView,
    ResetPasswordView,
    ChangeTemporaryPasswordView,
    # Authentication & User Management
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    CurrentUserView,
    CreateUserView,
    RegisterWithEmailView,
    VerifyEmailOTPView,
    ResendOTPView,
    SystemSettingsView,
    
    # User Profile & Approvals
    UserProfileView,
    
    # Profile Corrections

    # Core Features (User Facing)
    AiAssistantView,
    DashboardStatsView,
    calendar_feed,
    
    # Core Features (Routers)
    AnnouncementViewSet,
    HouseholdViewSet,
    ResidentViewSet,
    EventViewSet,
    OfficialDocumentViewSet,
    EmergencyContactViewSet, BarangayOfficialViewSet,
    OfficialTabViewSet,
    BarangayFAQViewSet,
    StaffDemographicsAiView,

    # Admin Hub & Audit Logs
    AdminAuditLogAPIView,
    StaffManagementAPIView,
    ForceDemographicSnapshotView,
    AiQueryStatisticViewSet,
    ProtectedMediaView,
)
from api.reports import RBIFormCReportView, RBIFormCDownloadView

# --- ViewSet Routers ---
router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'households', HouseholdViewSet, basename='households')
router.register(r'residents', ResidentViewSet, basename='residents')
router.register(r'events', EventViewSet, basename='events')
router.register(r'official-documents', OfficialDocumentViewSet, basename='official-documents')
router.register(r'emergency-contacts', EmergencyContactViewSet, basename='emergency-contacts')
router.register(r'official-tabs', OfficialTabViewSet, basename='official-tabs')
router.register(r'barangay-officials', BarangayOfficialViewSet, basename='barangay-officials')
router.register(r'faqs', BarangayFAQViewSet, basename='faqs')

urlpatterns = [
    # --- Authentication & Registration ---
    path('api/auth/register/', RegisterWithEmailView.as_view(), name='register_email'),
    path('api/auth/verify-otp/', VerifyEmailOTPView.as_view(), name='verify_otp'),
    path('api/auth/resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('api/auth/change-temporary-password/', ChangeTemporaryPasswordView.as_view(), name='change_temporary_password'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', CreateUserView.as_view(), name='register'),
    
    # --- Profile & Identity ---
    path('api/user/profile/', UserProfileView.as_view(), name='user-profile'),
                    
    # --- Profile Corrections ---
            
    # --- Requests (User Facing) ---
        
    # --- Utility & Dashboards ---
    path('api/ai-assistant/', AiAssistantView.as_view(), name='ai-assistant'),
    path('api/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/calendar-feed/', calendar_feed, name='calendar-feed'),
    path('api/system/settings/', SystemSettingsView.as_view(), name='system-settings'),
    path('api/reports/demographics-ai/', StaffDemographicsAiView.as_view(), name='demographics-ai'),
    path('api/reports/rbi-form-c/', RBIFormCReportView.as_view(), name='rbi-form-c'),
    path('api/reports/rbi-form-c/download/', RBIFormCDownloadView.as_view(), name='rbi-form-c-download'),

    # --- Admin Hub & Audit Logs ---
    path('api/admin/audit-logs/', AdminAuditLogAPIView.as_view(), name='audit-logs'),
    path('api/admin/staff-management/', StaffManagementAPIView.as_view(), name='staff-management'),
    path('api/admin/force-snapshot/', ForceDemographicSnapshotView.as_view(), name='force-snapshot'),

    # --- Router Includes ---
    path('api/', include(router.urls)),

    # --- Protected Media Serving (F-003) ---
    path('media/<path:file_path>', ProtectedMediaView.as_view(), name='protected_media'),

    path('admin/', admin.site.urls),
]

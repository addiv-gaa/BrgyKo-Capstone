from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUser(BasePermission):
    """Full access (must have ADMIN role)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return str(request.user.otp_profile.role).upper() == 'ADMIN'
        except Exception:
            return False

class IsStaffUser(BasePermission):
    """Staff, Captain, or Admin access."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            role = str(request.user.otp_profile.role).upper()
            return role in ['ADMIN', 'STAFF', 'CAPTAIN']
        except Exception:
            return False

class IsCaptainUser(BasePermission):
    """Captain or Admin access."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            role = str(request.user.otp_profile.role).upper()
            return role in ['ADMIN', 'CAPTAIN']
        except Exception:
            return False

class IsInternalUser(BasePermission):
    """Internal barangay workforce: Admin, Staff, or Captain."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            role = str(request.user.otp_profile.role).upper()
            return role in ['ADMIN', 'STAFF', 'CAPTAIN']
        except Exception:
            return False

class IsResidentOrReadOnly(BasePermission):
    """Allow unauthenticated GET access for public-facing endpoints."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return False
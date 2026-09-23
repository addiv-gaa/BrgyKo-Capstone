from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUser(BasePermission):
    """Full access (must have ADMIN role)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            print(f"IsAdminUser check for {request.user.username}: {request.user.otp_profile.role}")
            return request.user.otp_profile.role == 'ADMIN'
        except Exception as e:
            print(f"IsAdminUser Exception: {e}")
            return False

class IsStaffUser(BasePermission):
    """Can perform POST, PUT, PATCH, DELETE (must have STAFF or ADMIN role)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.otp_profile.role in ['ADMIN', 'STAFF']
        except Exception:
            return False

class IsCaptainUser(BasePermission):
    """Restricted to GET (view-only) access (must have CAPTAIN role)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            if request.user.otp_profile.role == 'CAPTAIN':
                return True
            return False
        except Exception:
            return False

class IsInternalUser(BasePermission):
    """Admin, Staff, or Captain. Handles Captain's read-only logic."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            role = request.user.otp_profile.role
            if role in ['ADMIN', 'STAFF']:
                return True
            if role == 'CAPTAIN':
                # Captains can only do safe methods
                if request.method in SAFE_METHODS:
                    return True
            return False
        except Exception:
            return False

class IsResidentOrReadOnly(BasePermission):
    """Allow unauthenticated GET access for public-facing endpoints."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return False
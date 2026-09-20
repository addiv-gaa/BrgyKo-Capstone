from rest_framework.permissions import BasePermission

class IsAdminGroup(BasePermission):
    """Allows access only to users in the 'Admin' group or Superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_superuser or request.user.groups.filter(name='admin').exists())
        )

class IsStaffGroup(BasePermission):
    """Allows access to users in the 'staff' group, admins, or users with a non-RESIDENT role in their profile."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check standard Django groups
        if request.user.groups.filter(name__in=['staff', 'admin']).exists():
            return True
            
        # Check new RBAC role system
        try:
            if hasattr(request.user, 'otp_profile') and request.user.otp_profile.role.upper() != 'RESIDENT':
                return True
        except Exception:
            pass
            
        return False
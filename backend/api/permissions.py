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
    """Allows access to users in the 'staff' group (and admins, so you don't lock yourself out)."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.groups.filter(name__in=['staff', 'admin']).exists()
        )
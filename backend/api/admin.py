from django.contrib import admin
from django.contrib.auth.models import User
from .models import UserProfile

# 1. Create an inline configuration for UserProfile
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile & Role'
    # Specify the fields you want visible in the admin panel
    fields = ('role', 'email_otp', 'otp_attempts') 

# 2. Unregister the default User admin
admin.site.unregister(User)

# 3. Register a custom UserAdmin that includes the profile inline
@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_active')
    inlines = (UserProfileInline,)
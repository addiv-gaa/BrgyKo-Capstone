from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from an HttpOnly cookie
    instead of the Authorization header. Falls back to the header if no cookie is present.
    """
    def authenticate(self, request):
        print(f"DEBUG AUTHENTICATION COOKIES: {request.COOKIES}")
        # Try to get the token from the HttpOnly cookie first
        raw_token = request.COOKIES.get('access_token')

        if raw_token is None:
            # Fallback to the standard Authorization header (for admin, scripts, etc.)
            return super().authenticate(request)

        # Validate the token using SimpleJWT's built-in validation
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

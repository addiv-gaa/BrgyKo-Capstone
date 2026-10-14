from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from an HttpOnly cookie
    instead of the Authorization header. Falls back to the header if no cookie is present.
    """
    def authenticate(self, request):
        # 1. Check for standard Authorization: Bearer <token> header first
        header_auth = super().authenticate(request)
        if header_auth is not None:
            return header_auth

        # 2. Fall back to the HttpOnly cookie
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        # Validate the cookie token using SimpleJWT's built-in validation
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

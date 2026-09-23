import re

with open(r'c:\VSCode Projects\Capstone Project\backend\api\permissions.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    """        try:
            return request.user.otp_profile.role == 'ADMIN'
        except Exception:
            return False""",
    """        try:
            print(f"IsAdminUser check for {request.user.username}: {request.user.otp_profile.role}")
            return request.user.otp_profile.role == 'ADMIN'
        except Exception as e:
            print(f"IsAdminUser Exception: {e}")
            return False"""
)

with open(r'c:\VSCode Projects\Capstone Project\backend\api\permissions.py', 'w', encoding='utf-8') as f:
    f.write(content)

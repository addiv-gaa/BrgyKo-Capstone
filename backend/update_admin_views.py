import re

with open(r'c:\VSCode Projects\Capstone Project\backend\api\views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix AdminAuditLogAPIView
content = re.sub(
    r'class AdminAuditLogAPIView\(APIView\):\n\s+permission_classes = \[IsAuthenticated\]\n\n\s+def get\(self, request\):\n\s+try:\n\s+role = request\.user\.otp_profile\.role\.upper\(\)\n\s+except Exception:\n\s+raise PermissionDenied\("User profile not found\."\)\n\s+if role not in \[\'CAPTAIN\', \'SECRETARY\'\]:\n\s+raise PermissionDenied\("Only Captains and Secretaries can view audit logs\."\)',
    'class AdminAuditLogAPIView(APIView):\n    permission_classes = [IsAdminUser]\n\n    def get(self, request):',
    content
)

# Fix StaffManagementAPIView
content = re.sub(
    r'class StaffManagementAPIView\(APIView\):\n\s+permission_classes = \[IsAuthenticated\]\n\n\s+def get_permissions_check\(self, request\):\n\s+try:\n\s+role = request\.user\.otp_profile\.role\.upper\(\)\n\s+except Exception:\n\s+raise PermissionDenied\("User profile not found\."\)\n\s+if role not in \[\'CAPTAIN\', \'SECRETARY\'\]:\n\s+raise PermissionDenied\("Only Captains and Secretaries can manage staff accounts\."\)\n\n\s+def get\(self, request\):\n\s+self\.get_permissions_check\(request\)',
    'class StaffManagementAPIView(APIView):\n    permission_classes = [IsAdminUser]\n\n    def get(self, request):',
    content
)

content = re.sub(
    r'def post\(self, request\):\n\s+self\.get_permissions_check\(request\)',
    'def post(self, request):',
    content
)

content = re.sub(
    r'def put\(self, request, pk\):\n\s+self\.get_permissions_check\(request\)',
    'def put(self, request, pk):',
    content
)

content = re.sub(
    r'def delete\(self, request, pk\):\n\s+self\.get_permissions_check\(request\)',
    'def delete(self, request, pk):',
    content
)


with open(r'c:\VSCode Projects\Capstone Project\backend\api\views.py', 'w', encoding='utf-8') as f:
    f.write(content)

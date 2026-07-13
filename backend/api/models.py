from django.contrib.gis.db import models
from django.contrib.auth.models import User

class CertificateRequest(models.Model):
    # --- Dropdown Choices ---
    CERTIFICATE_TYPES = [
        ('CLEARANCE', 'Barangay Clearance'),
        ('RESIDENCY', 'Certificate of Residency'),
        ('INDIGENCY', 'Certificate of Indigency'),
    ]

    CIVIL_STATUSES = [
        ('SINGLE', 'Single'),
        ('MARRIED', 'Married'),
        ('WIDOWED', 'Widowed'),
        ('SEPARATED', 'Legally Separated'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('RELEASED', 'Released'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='certificate_requests'
    )

    # --- Form Fields ---
    certificate_type = models.CharField(max_length=20, choices=CERTIFICATE_TYPES)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    civil_status = models.CharField(max_length=20, choices=CIVIL_STATUSES)
    purpose = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=15) 

    # --- Tracking Fields ---
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_requested = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date_requested']

    def __str__(self):
        return f"{self.full_name} - {self.get_certificate_type_display()}"
    

class PermitRequest(models.Model):
    # --- Dropdown Choices ---
    PERMIT_TYPES = [
        ('BUSINESS', 'Business Permit'),
        ('CONSTRUCTION', 'Construction Permit'),
        ('EVENT', 'Event/Activity Permit'),
        ('ZONING', 'Zoning Clearance'),
    ]


    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('RELEASED', 'Released'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='permit_requests'
    )

    # --- Form Fields ---
    permit_type = models.CharField(max_length=20, choices=PERMIT_TYPES)
    applicant_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, default='')
    date_needed = models.DateField()
    nature = models.CharField(max_length=255)
    supporting_documents = models.TextField()

    # --- Tracking Fields ---
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_requested = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date_requested']

    def __str__(self):
        return f"{self.applicant_name} - {self.get_permit_type_display()}"
    
class AiQueryStatistic(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    prompt = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Query by {self.user} at {self.created_at}"
    
class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Borrowed', 'Borrowed'),
        ('For Repair', 'For Repair'),
    ]

    CATEGORY_CHOICES = [
        ('Emergency', 'Emergency'),
        ('Equipment', 'Equipment'),
        ('Supplies', 'Supplies'),
        ('Office', 'Office'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    quantity = models.IntegerField(default=1)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Available')
    
    borrower = models.CharField(max_length=255, blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('Emergency', 'Emergency'),
        ('Event', 'Event'),
        ('Welfare', 'Welfare'),
        ('Services', 'Services'),
        ('SK', 'SK'),
    ]
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ['-created_at']

class ReadAnnouncement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'announcement') # Prevents duplicate "read" entries

class Household(models.Model):
    HOUSING_CHOICES = [
        ('Owned', 'Owned'),
        ('Rented', 'Rented'),
        ('Informal Settler', 'Informal Settler'),
        ('Caretaker', 'Caretaker'),
    ]
    
    DWELLING_CHOICES = [
        ('Concrete', 'Concrete'),
        ('Semi-Concrete', 'Semi-Concrete'),
        ('Light Materials', 'Light Materials (Wood/Nipa)'),
    ]

    # --- Basic Info ---
    head_of_household = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField()
    member_count = models.IntegerField()

    # --- Vulnerability & Welfare Flags ---
    is_4ps_beneficiary = models.BooleanField(default=False)
    has_senior_citizen = models.BooleanField(default=False)
    has_pwd = models.BooleanField(default=False)
    has_solo_parent = models.BooleanField(default=False)

    # --- Disaster Risk & Socio-Economic ---
    housing_status = models.CharField(max_length=50, choices=HOUSING_CHOICES, blank=True, null=True)
    dwelling_type = models.CharField(max_length=50, choices=DWELLING_CHOICES, blank=True, null=True)

    # --- Geo-Mapping (The GIS Upgrade) ---
    # Replaces latitude/longitude. SRID 4326 is the standard GPS coordinate system (WGS 84)
    location = models.PointField(srid=4326) 

    # --- Audit Trail ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Household: {self.head_of_household} ({self.address})"
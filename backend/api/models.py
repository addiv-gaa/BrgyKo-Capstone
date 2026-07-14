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

    # --- Physical Location Info ---
    address = models.TextField()
    
    # --- Geo-Mapping (The GIS Upgrade) ---
    location = models.PointField(srid=4326, blank=True, null=True) 

    # --- Disaster Risk & Socio-Economic ---
    housing_status = models.CharField(max_length=50, choices=HOUSING_CHOICES, blank=True, null=True)
    dwelling_type = models.CharField(max_length=50, choices=DWELLING_CHOICES, blank=True, null=True)

    # --- Audit Trail ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ❌ REMOVED: head_of_household (Derived from Resident where relationship='Head')
    # ❌ REMOVED: contact_number (Moved to Resident, usually belongs to a person, not a house)
    # ❌ REMOVED: member_count (Calculated dynamically via obj.residents.count())
    # ❌ REMOVED: Vulnerability Flags (4Ps, Senior, PWD, Solo Parent are now on the Resident)

    def __str__(self):
        # Updated string representation since head_of_household is gone
        return f"Household: {self.address[:30]}..."
    
class Resident(models.Model):
    RELATIONSHIP_CHOICES = [
        ('Head', 'Head of Household'),
        ('Spouse', 'Spouse'),
        ('Child', 'Child'),
        ('Parent', 'Parent'),
        ('Sibling', 'Sibling'),
        ('Other', 'Other Relative / Non-Relative'),
    ]

    # --- Basic Info ---
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField(null=True, blank=True)
    civil_status = models.CharField(max_length=50, default='Single')
    
    # ⬆️ MOVED FROM HOUSEHOLD: Contact number belongs to the individual
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    purok = models.CharField(max_length=50)
    
    # --- The Database Link ---
    household = models.ForeignKey(
        Household, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='residents'
    )
    
    # ⬆️ REPLACES 'head_of_household' string:
    relationship_to_head = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='Head')

    # --- ⬆️ MOVED FROM HOUSEHOLD: Vulnerability & Welfare Flags ---
    is_4ps_beneficiary = models.BooleanField(default=False)
    has_senior_citizen = models.BooleanField(default=False)
    has_pwd = models.BooleanField(default=False)
    has_solo_parent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
from django.db import models
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
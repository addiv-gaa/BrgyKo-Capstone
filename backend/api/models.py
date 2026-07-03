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
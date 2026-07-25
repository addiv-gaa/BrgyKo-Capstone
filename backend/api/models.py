from django.contrib.gis.db import models
from django.contrib.auth.models import User
from django.conf import settings
from simple_history.models import HistoricalRecords

class UserProfile(models.Model):
    # --- NEW: User Roles for RBAC ---
    ROLE_CHOICES = [
        ('RESIDENT', 'Resident'),
        ('SECRETARY', 'Secretary (Admin)'),
        ('CAPTAIN', 'Barangay Captain (Admin)'),
        ('COUNCIL', 'Barangay Council / Konsehal'),
        ('TREASURER', 'Treasurer'),
        ('TANOD', 'Tanod'),
        ('SK', 'SK (Sangguniang Kabataan)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RESIDENT') # New Role Field
    email_otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_attempts = models.IntegerField(default=0)
    
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.user.email} - {self.get_role_display()}"


class CertificateRequest(models.Model):
    # --- Expanded Dropdown Choices ---
    CERTIFICATE_TYPES = [
        ('CLEARANCE', 'Barangay Clearance'),
        ('RESIDENCY', 'Certificate of Residency'),
        ('INDIGENCY', 'Certificate of Indigency'),
        ('GOOD_MORAL', 'Certificate of Good Moral Character'),
        ('LOW_INCOME', 'Certificate of Low Income'),
        ('SOLO_PARENT', 'Solo Parent Certification'),
        ('JOB_SEEKER', 'First Time Job Seeker'),
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
    
    REQUEST_FOR_CHOICES = [
        ('SELF', 'For Myself'),
        ('OTHER', 'For Someone Else'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificate_requests')

    # --- NEW: Request Type & Authorization ---
    request_for = models.CharField(max_length=10, choices=REQUEST_FOR_CHOICES, default='SELF')
    relationship_to_document_owner = models.CharField(max_length=100, blank=True, null=True, help_text="Required if requesting for someone else")

    # --- Form Fields ---
    certificate_type = models.CharField(max_length=20, choices=CERTIFICATE_TYPES)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    civil_status = models.CharField(max_length=20, choices=CIVIL_STATUSES)
    purpose = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=15) 

    # --- Tracking & Auditing ---
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejecting the request") # NEW
    date_requested = models.DateField(auto_now_add=True)
    
    history = HistoricalRecords()

    class Meta:
        ordering = ['-date_requested']

    def __str__(self):
        return f"{self.full_name} - {self.get_certificate_type_display()}"


class PermitRequest(models.Model):
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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permit_requests')

    permit_type = models.CharField(max_length=20, choices=PERMIT_TYPES)
    applicant_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, default='')
    date_needed = models.DateField()
    nature = models.CharField(max_length=255)
    supporting_documents = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True) # NEW
    date_requested = models.DateField(auto_now_add=True)
    
    history = HistoricalRecords()

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


class Facility(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Maintenance', 'Maintenance'),
        ('Unavailable', 'Unavailable'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, help_text="Specific area in the barangay")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Available')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.status})"


class Equipment(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Maintenance', 'Maintenance'),
        ('Out of Stock', 'Out of Stock'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    total_quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Available')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - Total: {self.total_quantity}"


# --- REFACTORED: Event Post (Separated from simple calendar blocking) ---
class Event(models.Model):
    TAG_CHOICES = [
        ('GENERAL', 'General'),
        ('SK', 'Sangguniang Kabataan'),
        ('HEALTH', 'Health & Medical'),
        ('SENIOR', 'Senior Citizens'),
        ('WELFARE', 'Social Welfare'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=[('ACTIVITY', 'Barangay Activity'), ('ABSENCE', 'Official Absence')], default='ACTIVITY') 
    
    # NEW FIELDS
    tags = models.CharField(max_length=20, choices=TAG_CHOICES, default='GENERAL')
    image_banner = models.ImageField(upload_to='event_banners/', blank=True, null=True)
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    organizer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.get_tags_display()}] {self.title}"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, null=True, blank=True)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, null=True, blank=True)
    equipment_quantity = models.PositiveIntegerField(default=0, blank=True, null=True)
    
    purpose = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True) # NEW
    date_requested = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        item_name = self.facility.name if self.facility else getattr(self.equipment, 'name', 'Multiple Items')
        return f"[{self.status}] {self.user.username} - {item_name}"


# --- NEW: Incident Report Model ---
class IncidentReport(models.Model):
    CATEGORY_CHOICES = [
        ('DISTURBANCE', 'Noise / Disturbance'),
        ('INFRASTRUCTURE', 'Broken Infrastructure (Lights, Roads)'),
        ('CLEANLINESS', 'Garbage / Cleanliness'),
        ('SECURITY', 'Theft / Security Issue'),
        ('EMERGENCY', 'Health / Fire Emergency'),
        ('OTHER', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('INVESTIGATING', 'Investigating (Tanod Dispatched)'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected / Invalid'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incident_reports')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    location_details = models.CharField(max_length=255, help_text="Specific landmark or purok")
    photo_attachment = models.ImageField(upload_to='incident_reports/', blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    resolution_notes = models.TextField(blank=True, null=True, help_text="Notes from Tanod/Admin after investigation")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    history = HistoricalRecords()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_category_display()} - {self.status} ({self.created_at.date()})"


class Announcement(models.Model):
    # These choices will be used by the frontend to generate checkboxes/multi-selects
    CATEGORY_CHOICES = [
        ('Announcement', 'Announcement'),
        ('Emergency', 'Emergency'),
        ('Event', 'Event'),
        ('Welfare', 'Welfare'),
        ('Services', 'Services'),
        ('SK', 'SK'),
        ('PWD', 'PWD'), # NEW: Added PWD
    ]
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    
    # UPDATED: Changed to JSONField to support arrays (e.g., ["Event", "PWD"])
    # We renamed it to 'categories' (plural) to reflect that it holds multiple values.
    categories = models.JSONField(default=list, help_text="Stores multiple categories as an array")
    
    # --- Rich Features ---
    is_urgent = models.BooleanField(default=False, help_text="Will highlight the announcement in red on the feed")
    tags = models.CharField(max_length=255, blank=True, null=True, help_text="Comma-separated tags (e.g., Water Interruption, Relief)")
    attachment = models.FileField(upload_to='announcement_media/', blank=True, null=True)
    
    # YES: This links directly to your existing Event model for the Calendar!
    linked_event = models.ForeignKey(
        Event, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='announcements',
        help_text="Optional: Link this announcement to a specific calendar event"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        urgent_flag = "[URGENT] " if self.is_urgent else ""
        return f"{urgent_flag}{self.title}"


class ReadAnnouncement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'announcement')


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

    address = models.TextField()
    location = models.PointField(srid=4326, blank=True, null=True) 
    housing_status = models.CharField(max_length=50, choices=HOUSING_CHOICES, blank=True, null=True)
    dwelling_type = models.CharField(max_length=50, choices=DWELLING_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    history = HistoricalRecords()

    def __str__(self):
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

    SEX_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
    ]

    # Links to the auth account (Only verified users get linked here)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resident_profile')
    
    # --- Basic Info ---
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    suffix = models.CharField(max_length=10, blank=True, null=True, help_text="e.g., Jr., Sr., III")
    
    birth_date = models.DateField(null=True, blank=True)
    civil_status = models.CharField(max_length=50, default='Single')
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default='Male')
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    purok = models.CharField(max_length=50)
    occupation = models.CharField(max_length=100, blank=True, null=True)
    
    household = models.ForeignKey(Household, on_delete=models.SET_NULL, null=True, blank=True, related_name='residents')
    relationship_to_head = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='Head')

    # --- Official Records ---
    id_picture = models.ImageField(upload_to='residents/ids/', blank=True, null=True)

    # --- Vulnerability & Welfare Flags ---
    is_4ps_beneficiary = models.BooleanField(default=False)
    is_senior_citizen = models.BooleanField(default=False)
    is_pwd = models.BooleanField(default=False)
    is_solo_parent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    history = HistoricalRecords()

    def __str__(self):
        name = f"{self.first_name} {self.last_name}"
        if self.suffix:
            name += f" {self.suffix}"
        return name


class ResidentApplication(models.Model):
    """ Staging table for unverified users requesting a Resident profile """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resident_applications')
    
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    suffix = models.CharField(max_length=10, blank=True, null=True)
    
    birth_date = models.DateField()
    sex = models.CharField(max_length=10, choices=Resident.SEX_CHOICES, default='Male')
    civil_status = models.CharField(max_length=50, default='Single')
    purok = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=20)
    occupation = models.CharField(max_length=100, blank=True, null=True)
    
    id_picture = models.ImageField(upload_to='applications/ids/')
    
    # Approval Tracking
    STATUS_CHOICES = [
        ('PENDING', 'Pending'), 
        ('APPROVED', 'Approved'), 
        ('REJECTED', 'Rejected')
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Application: {self.first_name} {self.last_name}"
    

class OfficialDocument(models.Model):
    DOCUMENT_TYPES = [
        ('Ordinance', 'Ordinances (Mga Ordinansa)'),
        ('Resolution', 'Resolutions (Mga Resolusyon)'),
        ('EO', 'Executive Orders (EO)'),
        ('Memo', 'Memorandums'),
        ('Minutes', 'Meeting Minutes'),
        ('Financial', 'Financial & Procurement'),
        ('Template', 'Templates & Forms'),
        ('Others', 'Others'),
    ]

    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='official_documents/')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_archived = models.BooleanField(default=False)
    
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.title} ({self.document_type})"


class ProfileUpdateRequest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile_updates')
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='update_requests')
    
    requested_first_name = models.CharField(max_length=100, blank=True, null=True)
    requested_last_name = models.CharField(max_length=100, blank=True, null=True)
    requested_birth_date = models.DateField(blank=True, null=True)
    requested_civil_status = models.CharField(max_length=50, blank=True, null=True)
    reason = models.TextField(help_text="Reason for update (e.g., bedridden, PWD)")

    id_picture = models.ImageField(upload_to='profile_corrections_ids/', blank=True, null=True)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True) # NEW
    created_at = models.DateTimeField(auto_now_add=True)
    
    history = HistoricalRecords()

    def __str__(self):
        return f"Update Request for {self.resident} - {self.status}"

class BarangaySettings(models.Model):
    barangay_name = models.CharField(max_length=255, default="Barangay Magsaysay")
    captain_name = models.CharField(max_length=255, default="Juan Dela Cruz")
    emergency_hotline = models.CharField(max_length=50, default="911")
    police_hotline = models.CharField(max_length=50, default="117")
    fire_hotline = models.CharField(max_length=50, default="112")
    ai_chatbot_enabled = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.pk = 1  # Forces this model to only ever have one row (ID 1)
        super(BarangaySettings, self).save(*args, **kwargs)
        
    def __str__(self):
        return f"Settings for {self.barangay_name}"

class BarangaySettings(models.Model):
    # Barangay Identity & Metadata
    barangay_name = models.CharField(max_length=255, default="Barangay Magsaysay")
    captain_name = models.CharField(max_length=255, default="Juan Dela Cruz")
    barangay_hall_address = models.CharField(max_length=255, default="Barangay Hall, Main St.")
    official_contact_email = models.EmailField(default="official@magsaysay.gov.ph")
    official_contact_number = models.CharField(max_length=50, default="09123456789")
    barangay_seal_url = models.CharField(max_length=500, blank=True, null=True)

    # Emergency Hotlines
    emergency_hotline = models.CharField(max_length=50, default="911")
    police_hotline = models.CharField(max_length=50, default="117")
    fire_hotline = models.CharField(max_length=50, default="112")

    # Feature Toggles & Kill-Switches
    ai_chatbot_enabled = models.BooleanField(default=True)
    accept_permit_requests = models.BooleanField(default=True)
    accept_reservations = models.BooleanField(default=True)
    maintenance_mode = models.BooleanField(default=False)

    # Workflow & Policy Limits
    max_pending_requests_per_user = models.IntegerField(default=3)
    reservation_lead_time_days = models.IntegerField(default=2)

    def save(self, *args, **kwargs):
        self.pk = 1  # Forces this model to only ever have a single row (ID 1)
        super(BarangaySettings, self).save(*args, **kwargs)
        
    def __str__(self):
        return f"Settings for {self.barangay_name}"

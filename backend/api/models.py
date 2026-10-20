from django.contrib.gis.db import models
from django.contrib.auth.models import User
from django.conf import settings
from simple_history.models import HistoricalRecords
from datetime import date

class UserProfile(models.Model):
    # --- NEW: User Roles for RBAC ---
    ROLE_CHOICES = [
        ('RESIDENT', 'Resident'),
        ('STAFF', 'Staff'),
        ('ADMIN', 'Admin'),
        ('CAPTAIN', 'Captain'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RESIDENT') # New Role Field
    email_otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_attempts = models.IntegerField(default=0)
    must_change_password = models.BooleanField(default=False)
    
    history = HistoricalRecords(excluded_fields=['email_otp'])

    def __str__(self):
        return f"{self.user.email} - {self.get_role_display()}"


class AiQueryStatistic(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    prompt = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"Query by {self.user} at {self.created_at}"


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
    event_type = models.CharField(max_length=20, choices=[('ACTIVITY', 'Barangay Activity'), ('ABSENCE', 'Official Absence'), ('AGENDA', 'Barangay Official Events / Agenda')], default='ACTIVITY') 
    
    # NEW FIELDS
    tags = models.CharField(max_length=20, choices=TAG_CHOICES, default='GENERAL')
    image_banner = models.ImageField(upload_to='event_banners/', blank=True, null=True)
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    organizer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"[{self.get_tags_display()}] {self.title}"


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
    is_archived = models.BooleanField(default=False)
    history = HistoricalRecords()

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
    inhabitant_type = models.CharField(max_length=50, default='NON-MIGRANT', help_text="e.g., NON-MIGRANT, MIGRANT, TRANSIENT")
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    suffix = models.CharField(max_length=10, blank=True, null=True, help_text="e.g., Jr., Sr., III")
    
    birth_date = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=255, blank=True, null=True)
    civil_status = models.CharField(max_length=50, default='Single')
    citizenship = models.CharField(max_length=100, default='Filipino')
    is_registered_voter = models.BooleanField(default=False)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, default='Male')
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    purok = models.CharField(max_length=50)
    occupation = models.CharField(max_length=100, blank=True, null=True)
    EMPLOYMENT_STATUS_CHOICES = [
        ('Employed', 'Employed'),
        ('Unemployed', 'Unemployed'),
        ('Not in Labor Force', 'Not in Labor Force'),
    ]
    employment_status = models.CharField(max_length=50, choices=EMPLOYMENT_STATUS_CHOICES, blank=True, null=True)

    # --- Approval Queue Logic ---
    is_approved = models.BooleanField(default=True)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_residents')

    email_address= models.EmailField(blank=True, null=True)
    highest_education = models.CharField(max_length=100, blank=True, null=True)
    mothers_first_name = models.CharField(max_length=100, blank=True, null=True)
    mothers_middle_name = models.CharField(max_length=100, blank=True, null=True)
    mothers_last_name = models.CharField(max_length=100, blank=True, null=True)
    
    household = models.ForeignKey(Household, on_delete=models.SET_NULL, null=True, blank=True, related_name='residents')
    relationship_to_head = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='Head')

    # --- Official Records ---
    id_picture = models.ImageField(upload_to='residents/ids/', blank=True, null=True)

    # --- Vulnerability & Welfare Flags ---
    is_4ps_beneficiary = models.BooleanField(default=False)
    is_senior_citizen = models.BooleanField(default=False)
    is_pwd = models.BooleanField(default=False)
    is_solo_parent = models.BooleanField(default=False)
    is_indigenous = models.BooleanField(default=False)
    is_ofw = models.BooleanField(default=False)
    is_out_of_school = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    history = HistoricalRecords()

    def __str__(self):
        name = f"{self.first_name} {self.last_name}"
        if self.suffix:
            name += f" {self.suffix}"
        return name


class OfficialDocument(models.Model):
    DOCUMENT_TYPES = [
        ('Ordinance', 'Ordinances (Mga Ordinansa)'),
        ('Resolution', 'Resolutions (Mga Resolusyon)'),
        ('EO', 'Executive Orders (EO)'),
        ('Memo', 'Memorandums'),
        ('Minutes', 'Meeting Minutes'),
        ('Financial', 'Financial & Procurement'),
        ('Report', 'Official Reports (Mga Ulat)'),
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


class BarangaySettings(models.Model):
    # Barangay Identity & Metadata
    barangay_name = models.CharField(max_length=255, default="Barangay Magsaysay")
    captain_name = models.CharField(max_length=255, default="Juan Dela Cruz")
    secretary_name = models.CharField(max_length=255, default="Maica Ann M. Mendoza", blank=True)
    barangay_hall_address = models.CharField(max_length=255, default="Barangay Hall, Main St.")
    official_contact_email = models.EmailField(default="official@magsaysay.gov.ph")
    official_contact_number = models.CharField(max_length=50, default="09123456789")
    barangay_seal_url = models.CharField(max_length=500, blank=True, null=True)
    barangay_seal = models.ImageField(upload_to='settings/', blank=True, null=True)

    # Emergency Hotlines
    emergency_hotline = models.CharField(max_length=50, default="911")
    police_hotline = models.CharField(max_length=50, default="117")
    fire_hotline = models.CharField(max_length=50, default="112")

    # Operating Hours & Emergency Advisory
    operating_hours = models.CharField(max_length=255, default="Monday – Friday: 8:00 AM – 5:00 PM")
    show_advisory_banner = models.BooleanField(default=False)
    advisory_banner_text = models.CharField(max_length=500, blank=True, default="")

    # Homepage Content
    captain_image = models.FileField(upload_to='settings/', blank=True, null=True)
    captain_message = models.TextField(default="Mabuhay at maligayang pagdating sa opisyal na pahina ng Barangay! Ang aming layunin ay magbigay ng mabilis, tapat, at mapagkakatiwalaang serbisyo sa bawat residente.")
    
    barangay_classification = models.CharField(max_length=100, default="Urban Barangay")
    barangay_city = models.CharField(max_length=100, default="City of General Trias")
    barangay_province = models.CharField(max_length=100, default="Cavite")
    barangay_region = models.CharField(max_length=100, default="IV-A CALABARZON")
    number_of_puroks = models.CharField(max_length=50, default="4 Puroks")
    
    history_text = models.TextField(default="Barangay San Gabriel is one of the barangays comprising the City...")
    location_geography_text = models.TextField(default="Situated within the city...")
    community_culture_text = models.TextField(default="Residents are known for their deep faith...")
    services_facilities_text = models.TextField(default="The Barangay Hall provides a full range of community services...")

    # Feature Toggles & Kill-Switches
    ai_chatbot_enabled = models.BooleanField(default=True)
    accept_permit_requests = models.BooleanField(default=True)
    accept_reservations = models.BooleanField(default=True)
    maintenance_mode = models.BooleanField(default=False)
    history = HistoricalRecords()

    # Workflow & Policy Limits
    max_pending_requests_per_user = models.IntegerField(default=3)
    reservation_lead_time_days = models.IntegerField(default=2)

    def save(self, *args, **kwargs):
        self.pk = 1  # Forces this model to only ever have a single row (ID 1)
        super(BarangaySettings, self).save(*args, **kwargs)
        
    def __str__(self):
        return f"Settings for {self.barangay_name}"


class BarangayFAQ(models.Model):
    CATEGORY_CHOICES = [
        ('FEES', 'Certificates, Permits & Fees'),
        ('SERVICES', 'Barangay Services & Requirements'),
        ('EMERGENCY', 'Disaster & Emergency'),
        ('SANITATION', 'Waste, Health & Sanitation'),
        ('GENERAL', 'General Information & Inquiries'),
    ]

    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='FEES')
    order = models.IntegerField(default=0, help_text="Sort order for display")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Barangay FAQ'
        verbose_name_plural = 'Barangay FAQs'

    def __str__(self):
        return f"[{self.category}] {self.question}"

class EmergencyContact(models.Model):
    CATEGORY_CHOICES = [
        ('Barangay', 'Barangay Contacts'),
        ('Municipal', 'Municipal / City Contacts'),
        ('National', 'National Hotlines'),
    ]
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Barangay')
    phone = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='phone')
    order = models.IntegerField(default=0)
    history = HistoricalRecords()
    
    def __str__(self):
        return f"{self.name} - {self.phone}"

class OfficialTab(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class BarangayOfficial(models.Model):
    tab = models.ForeignKey(OfficialTab, on_delete=models.SET_NULL, null=True, blank=True, related_name='officials')
    name = models.CharField(max_length=255)
    position = models.CharField(max_length=100)
    committee = models.CharField(max_length=255, blank=True, null=True)
    contact_number = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='officials/', blank=True, null=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    history = HistoricalRecords()

    def __str__(self):
        return f'{self.name} - {self.position}'



class DemographicSnapshot(models.Model):
    snapshot_date = models.DateField(unique=True)
    total_residents = models.IntegerField(default=0)
    
    # Age Brackets
    children = models.IntegerField(default=0)
    youth = models.IntegerField(default=0)
    adults = models.IntegerField(default=0)
    seniors = models.IntegerField(default=0)
    
    # Sectors
    four_ps = models.IntegerField(default=0)
    pwd = models.IntegerField(default=0)
    solo_parents = models.IntegerField(default=0)
    indigenous = models.IntegerField(default=0)
    ofw = models.IntegerField(default=0)
    out_of_school = models.IntegerField(default=0)
    registered_voters = models.IntegerField(default=0)
    
    # Gender
    male = models.IntegerField(default=0)
    female = models.IntegerField(default=0)

    purok_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-snapshot_date']

    def __str__(self):
        return f"Snapshot - {self.snapshot_date.strftime('%B %Y')}"


class SessionLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    history_date = models.DateTimeField(auto_now_add=True)
    
    @property
    def history_id(self):
        return f"sess-{self.id}"
        
    @property
    def history_user(self):
        return self.user
        
    @property
    def history_type(self):
        return '*'

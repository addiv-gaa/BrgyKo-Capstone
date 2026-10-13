import os
import django
from datetime import date
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import DemographicSnapshot

months = [
    date(2025, 12, 31),
    date(2026, 1, 31),
    date(2026, 2, 28),
    date(2026, 3, 31),
    date(2026, 4, 30),
    date(2026, 5, 31),
    date(2026, 6, 30),
    date(2026, 7, 31),
    date(2026, 8, 31),
    date(2026, 9, 30),
]

base_pop = 1900
for m in months:
    base_pop += random.randint(10, 35)
    DemographicSnapshot.objects.update_or_create(
        snapshot_date=m,
        defaults={
            'total_residents': base_pop,
            'children': int(base_pop * 0.2),
            'youth': int(base_pop * 0.25),
            'adults': int(base_pop * 0.4),
            'seniors': int(base_pop * 0.15),
            'four_ps': int(base_pop * 0.1),
            'pwd': int(base_pop * 0.05),
            'solo_parents': int(base_pop * 0.08),
            'indigenous': int(base_pop * 0.02),
            'ofw': int(base_pop * 0.12),
            'out_of_school': int(base_pop * 0.03),
            'registered_voters': int(base_pop * 0.7),
            'male': int(base_pop * 0.49),
            'female': int(base_pop * 0.51),
            'purok_data': {"Purok 1": int(base_pop * 0.25), "Purok 2": int(base_pop * 0.25), "Purok 3": int(base_pop * 0.25), "Purok 4": int(base_pop * 0.25)}
        }
    )
print("Mock historical snapshot data generated successfully.")

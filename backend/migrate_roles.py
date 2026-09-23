import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import UserProfile

def run():
    admin_updates = UserProfile.objects.filter(role='SECRETARY').update(role='ADMIN')
    staff_updates = UserProfile.objects.filter(role__in=['COUNCIL', 'TREASURER', 'TANOD', 'SK']).update(role='STAFF')
    
    print(f"Migrated {admin_updates} profiles to ADMIN.")
    print(f"Migrated {staff_updates} profiles to STAFF.")

if __name__ == '__main__':
    run()

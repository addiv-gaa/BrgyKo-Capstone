from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django.utils import timezone
from datetime import date
import logging

logger = logging.getLogger(__name__)

def generate_monthly_snapshot():
    try:
        from api.models import DemographicSnapshot, Resident
        from django.db.models import Count, Q
        
        today = date.today()
        
        total_residents = Resident.objects.filter(is_approved=True).count()
        if total_residents == 0:
            logger.info("No approved residents found. Skipping snapshot.")
            return False

        children = Resident.objects.filter(is_approved=True, birth_date__gt=today.replace(year=today.year - 15)).count()
        youth = Resident.objects.filter(
            is_approved=True,
            birth_date__lte=today.replace(year=today.year - 15),
            birth_date__gt=today.replace(year=today.year - 31)
        ).count()
        seniors = Resident.objects.filter(is_approved=True, birth_date__lte=today.replace(year=today.year - 60)).count()
        adults = max(total_residents - (children + youth + seniors), 0)

        status_stats = Resident.objects.filter(is_approved=True).aggregate(
            four_ps=Count('id', filter=Q(is_4ps_beneficiary=True)),
            pwd=Count('id', filter=Q(is_pwd=True)),
            solo_parents=Count('id', filter=Q(is_solo_parent=True)),
            indigenous=Count('id', filter=Q(is_indigenous=True)),
            ofw=Count('id', filter=Q(is_ofw=True)),
            out_of_school=Count('id', filter=Q(is_out_of_school=True)),
            registered_voters=Count('id', filter=Q(is_registered_voter=True)),
        )

        male_count = Resident.objects.filter(is_approved=True, sex='Male').count()
        female_count = Resident.objects.filter(is_approved=True, sex='Female').count()

        purok_counts = dict(Resident.objects.filter(is_approved=True).values_list('purok').annotate(count=Count('id')))

        # Look for an existing snapshot for the current month and year
        existing_snapshot = DemographicSnapshot.objects.filter(
            snapshot_date__year=today.year,
            snapshot_date__month=today.month
        ).first()

        if existing_snapshot:
            # Overwrite existing month's snapshot with today's date and new data
            existing_snapshot.snapshot_date = today
            existing_snapshot.total_residents = total_residents
            existing_snapshot.children = children
            existing_snapshot.youth = youth
            existing_snapshot.adults = adults
            existing_snapshot.seniors = seniors
            existing_snapshot.four_ps = status_stats['four_ps']
            existing_snapshot.pwd = status_stats['pwd']
            existing_snapshot.solo_parents = status_stats['solo_parents']
            existing_snapshot.indigenous = status_stats['indigenous']
            existing_snapshot.ofw = status_stats['ofw']
            existing_snapshot.out_of_school = status_stats['out_of_school']
            existing_snapshot.registered_voters = status_stats['registered_voters']
            existing_snapshot.male = male_count
            existing_snapshot.female = female_count
            existing_snapshot.purok_data = purok_counts
            existing_snapshot.save()
            logger.info(f"Updated existing month's snapshot to {today}")
        else:
            # Create a brand new snapshot for this month
            DemographicSnapshot.objects.create(
                snapshot_date=today,
                total_residents=total_residents,
                children=children,
                youth=youth,
                adults=adults,
                seniors=seniors,
                four_ps=status_stats['four_ps'],
                pwd=status_stats['pwd'],
                solo_parents=status_stats['solo_parents'],
                indigenous=status_stats['indigenous'],
                ofw=status_stats['ofw'],
                out_of_school=status_stats['out_of_school'],
                registered_voters=status_stats['registered_voters'],
                male=male_count,
                female=female_count,
                purok_data=purok_counts
            )
            logger.info(f"Created new Demographic Snapshot for {today}")
        logger.info(f"Successfully generated Demographic Snapshot for {today}")
        return True
    except Exception as e:
        logger.error(f"Error generating demographic snapshot: {e}")
        return False

def start():
    scheduler = BackgroundScheduler()
    # Trigger on the last day of every month at 23:59
    scheduler.add_job(generate_monthly_snapshot, CronTrigger(day='last', hour=23, minute=59))
    scheduler.start()
    logger.info("Demographic Snapshot Scheduler started.")

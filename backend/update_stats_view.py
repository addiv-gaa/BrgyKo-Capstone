import re

with open('api/views.py', 'r') as f:
    content = f.read()

new_view = '''class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        from datetime import date
        today = date.today()
        
        def sub_years(d, years):
            try:
                return d.replace(year=d.year - years)
            except ValueError:
                return d.replace(year=d.year - years, day=d.day - 1)

        age_15_date = sub_years(today, 15)
        age_30_date = sub_years(today, 30)
        age_60_date = sub_years(today, 60)

        # 1. Base Querysets
        residents = Resident.objects.all()
        households = Household.objects.all()

        total_residents = residents.count()

        # 2. Card Metrics
        welfare_count = residents.filter(
            Q(is_4ps_beneficiary=True) | 
            Q(is_senior_citizen=True) | 
            Q(is_pwd=True) | 
            Q(is_solo_parent=True)
        ).count()

        registered_voters = residents.filter(is_registered_voter=True).count()
        
        # Youth: age between 15 (inclusive) and 30 (inclusive)
        # That means birth_date <= date 15 years ago AND birth_date >= date 31 years ago
        age_31_date = sub_years(today, 31)
        youth_residents = residents.filter(birth_date__lte=age_15_date, birth_date__gt=age_31_date).count()

        # 3. Chart Data (Aggregated Server-Side)
        
        # Gender
        gender_data = list(residents.values('sex').annotate(value=Count('id')))
        # rename 'sex' to 'name'
        for g in gender_data:
            g['name'] = g.pop('sex')

        # Welfare
        welfare_data = [
            {"name": "4Ps", "value": residents.filter(is_4ps_beneficiary=True).count()},
            {"name": "PWD", "value": residents.filter(is_pwd=True).count()},
            {"name": "Solo Parent", "value": residents.filter(is_solo_parent=True).count()},
            {"name": "Senior", "value": residents.filter(is_senior_citizen=True).count()},
        ]

        # Voter
        voter_data = [
            {"name": "Registered", "value": registered_voters},
            {"name": "Not Registered", "value": total_residents - registered_voters},
        ]

        # Age Brackets
        children = residents.filter(birth_date__gt=age_15_date).count()
        seniors_age = residents.filter(birth_date__lte=age_60_date).count()
        adults = total_residents - (children + youth_residents + seniors_age)
        age_data = [
            {"name": "0-14 (Children)", "value": children},
            {"name": "15-30 (Youth)", "value": youth_residents},
            {"name": "31-59 (Adults)", "value": adults},
            {"name": "60+ (Seniors)", "value": seniors_age},
        ]

        # Purok
        purok_data = list(residents.values('purok').annotate(value=Count('id')))
        for p in purok_data:
            p['name'] = p.pop('purok') or 'Unknown'

        # Civil Status
        civil_data = list(residents.values('civil_status').annotate(value=Count('id')))
        for c in civil_data:
            c['name'] = c.pop('civil_status') or 'Unknown'

        # Housing Status
        housing_data = list(households.values('housing_status').annotate(value=Count('id')))
        for h in housing_data:
            h['name'] = h.pop('housing_status') or 'Unknown'

        stats = {
            # Cards
            "total_residents": total_residents,
            "welfare_beneficiaries": welfare_count, 
            "registered_voters": registered_voters,
            "youth_residents": youth_residents,
            
            # Additional Dashboard metrics
            "certs_this_month": CertificateRequest.objects.count(),
            "pending_reservations": Reservation.objects.filter(status='PENDING').count(), 
            "pending_documents": CertificateRequest.objects.filter(status='PENDING').count(),
            "chatbot_queries": AiQueryStatistic.objects.count(),

            # Charts
            "charts": {
                "gender": gender_data,
                "welfare": welfare_data,
                "voter": voter_data,
                "age": age_data,
                "purok": purok_data,
                "civil_status": civil_data,
                "housing_status": housing_data
            }
        }
        return Response(stats)'''

pattern = r'class DashboardStatsView\(APIView\):.*?return Response\(stats\)'

new_content = re.sub(pattern, new_view, content, flags=re.DOTALL)

with open('api/views.py', 'w') as f:
    f.write(new_content)

print("Updated DashboardStatsView successfully!")

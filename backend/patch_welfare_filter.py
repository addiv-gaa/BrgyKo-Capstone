import re

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove welfare fields from filterset_fields
filterset_pattern = r'''filterset_fields = \[
        'purok', 
        'household', 
        'relationship_to_head',
        'is_4ps_beneficiary', 
        'is_senior_citizen', 
        'is_pwd', 
        'is_solo_parent',
        'is_registered_voter',
        'sex',
        'civil_status',
        'inhabitant_type'
    \]'''

new_filterset = '''filterset_fields = [
        'purok', 
        'household', 
        'relationship_to_head',
        'is_registered_voter',
        'sex',
        'civil_status',
        'inhabitant_type'
    ]'''

content = re.sub(filterset_pattern, new_filterset, content, flags=re.DOTALL)

# 2. Update get_queryset with OR logic
get_qs_pattern = r'''    def get_queryset\(self\):
        qs = super\(\)\.get_queryset\(\)
        is_youth = self\.request\.query_params\.get\('is_youth'\)
        if is_youth == 'true':
            from datetime import date
            today = date\.today\(\)
            def sub_years\(d, years\):
                try: return d\.replace\(year=d\.year - years\)
                except ValueError: return d\.replace\(year=d\.year - years, day=d\.day - 1\)
            age_15 = sub_years\(today, 15\)
            age_31 = sub_years\(today, 31\)
            qs = qs\.filter\(birth_date__lte=age_15, birth_date__gt=age_31\)
        return qs'''

new_get_qs = '''    def get_queryset(self):
        qs = super().get_queryset()
        
        # 1. Youth Filter
        is_youth = self.request.query_params.get('is_youth')
        if is_youth == 'true':
            from datetime import date
            today = date.today()
            def sub_years(d, years):
                try: return d.replace(year=d.year - years)
                except ValueError: return d.replace(year=d.year - years, day=d.day - 1)
            age_15 = sub_years(today, 15)
            age_31 = sub_years(today, 31)
            qs = qs.filter(birth_date__lte=age_15, birth_date__gt=age_31)
            
        # 2. Welfare 'OR' Filter
        from django.db.models import Q
        welfare_q = Q()
        has_welfare = False
        
        if self.request.query_params.get('is_pwd') in ['True', 'true', '1']:
            welfare_q |= Q(is_pwd=True)
            has_welfare = True
        if self.request.query_params.get('is_senior_citizen') in ['True', 'true', '1']:
            welfare_q |= Q(is_senior_citizen=True)
            has_welfare = True
        if self.request.query_params.get('is_solo_parent') in ['True', 'true', '1']:
            welfare_q |= Q(is_solo_parent=True)
            has_welfare = True
        if self.request.query_params.get('is_4ps_beneficiary') in ['True', 'true', '1']:
            welfare_q |= Q(is_4ps_beneficiary=True)
            has_welfare = True
            
        if has_welfare:
            qs = qs.filter(welfare_q)
            
        return qs'''

content = re.sub(get_qs_pattern, new_get_qs, content, flags=re.DOTALL)

with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend patched for OR logic!")

import re

with open('api/views.py', 'r') as f:
    content = f.read()

new_view = '''class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.select_related('household').all()
    serializer_class = ResidentSerializer
    pagination_class = ResidentPagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'purok']
    filterset_fields = [
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
    ]
    ordering_fields = ['first_name', 'last_name', 'purok', 'birth_date', 'id']
    ordering = ['-id']

    def get_queryset(self):
        qs = super().get_queryset()
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
        return qs'''

pattern = r'class ResidentViewSet\(viewsets\.ModelViewSet\):.*?ordering = \[\'-id\'\]'

new_content = re.sub(pattern, new_view, content, flags=re.DOTALL)

with open('api/views.py', 'w') as f:
    f.write(new_content)

print("Updated ResidentViewSet successfully!")

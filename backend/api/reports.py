from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Resident, Household
from .permissions import IsInternalUser

class RBIFormCReportView(APIView):
    permission_classes = [IsAuthenticated, IsInternalUser]

import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side
from django.http import HttpResponse

def get_rbi_form_c_data():
    residents = Resident.objects.filter(is_approved=True)
    res_data = residents.values(
        'birth_date', 'sex', 'is_indigenous', 'is_out_of_school', 'is_pwd', 'is_ofw', 'is_solo_parent', 'is_senior_citizen', 'employment_status', 'civil_status', 'citizenship', 'occupation'
    )

    today = date.today()

    def init_sector():
        return {'male': 0, 'female': 0, 'total': 0}
    
    def init_age_brackets():
        keys = [
            '0-12 months', '13-23 months', '24-59 months', '5-9 years', '10-14 years',
            '15-19 years', '20-24 years', '25-29 years', '30-34 years', '35-39 years',
            '40-44 years', '45-49 years', '50-54 years', '55-59 years', '60-64 years',
            '65-69 years', '70-74 years', '75-79 years', '80 years and over'
        ]
        return {k: init_sector() for k in keys}

    age_brackets = init_age_brackets()
    sectors = {
        'labor_force': init_sector(),
        'unemployed': init_sector(),
        'osc': init_sector(),
        'osy': init_sector(),
        'pwd': init_sector(),
        'ofw': init_sector(),
        'solo_parent': init_sector(),
        'vulnerable': init_sector(),
        'indigenous': init_sector()
    }
    civil_status = {'single': init_sector(), 'married': init_sector()}
    citizenship = {'filipino': init_sector(), 'foreigner': init_sector()}

    for r in res_data:
        sex = 'male' if r['sex'] == 'Male' else 'female'
        
        # AGE CALCULATION
        months = 0
        years = 0
        bdate = r['birth_date']
        if bdate:
            years = today.year - bdate.year
            months = years * 12 + today.month - bdate.month
            if today.day < bdate.day:
                months -= 1
                if months % 12 == 11: # We dropped below a year boundary
                    years -= 1
        
        # Age Brackets Mapping
        bracket = None
        if months <= 12: bracket = '0-12 months'
        elif months <= 23: bracket = '13-23 months'
        elif months <= 59: bracket = '24-59 months'
        elif years <= 9: bracket = '5-9 years'
        elif years <= 14: bracket = '10-14 years'
        elif years <= 19: bracket = '15-19 years'
        elif years <= 24: bracket = '20-24 years'
        elif years <= 29: bracket = '25-29 years'
        elif years <= 34: bracket = '30-34 years'
        elif years <= 39: bracket = '35-39 years'
        elif years <= 44: bracket = '40-44 years'
        elif years <= 49: bracket = '45-49 years'
        elif years <= 54: bracket = '50-54 years'
        elif years <= 59: bracket = '55-59 years'
        elif years <= 64: bracket = '60-64 years'
        elif years <= 69: bracket = '65-69 years'
        elif years <= 74: bracket = '70-74 years'
        elif years <= 79: bracket = '75-79 years'
        else: bracket = '80 years and over'

        age_brackets[bracket][sex] += 1
        age_brackets[bracket]['total'] += 1

        # --- FALLBACK LOGIC FOR EXISTING DATA ---
        emp_status = r['employment_status']
        occ = (r['occupation'] or '').strip().lower()
        
        if not emp_status and occ:
            if occ in ['none', 'n/a', 'unemployed', 'wala']:
                emp_status = 'Unemployed'
            elif occ == 'student':
                emp_status = 'Not in Labor Force'
            else:
                emp_status = 'Employed'

        is_ofw = r['is_ofw'] or ('ofw' in occ or 'overseas' in occ)

        # SECTORS
        # Labor Force: 15+, Employed or Unemployed
        if years >= 15 and emp_status in ['Employed', 'Unemployed']:
            sectors['labor_force'][sex] += 1
            sectors['labor_force']['total'] += 1
        
        # Unemployed: 15+, Unemployed
        if years >= 15 and emp_status == 'Unemployed':
            sectors['unemployed'][sex] += 1
            sectors['unemployed']['total'] += 1
        
        # OSC: 6-14, out of school
        if 6 <= years <= 14 and r['is_out_of_school']:
            sectors['osc'][sex] += 1
            sectors['osc']['total'] += 1
            
        # OSY: 15-24, out of school
        if 15 <= years <= 24 and r['is_out_of_school']:
            sectors['osy'][sex] += 1
            sectors['osy']['total'] += 1
        
        if r['is_pwd']:
            sectors['pwd'][sex] += 1
            sectors['pwd']['total'] += 1
            
        if is_ofw:
            sectors['ofw'][sex] += 1
            sectors['ofw']['total'] += 1
            
        if r['is_solo_parent']:
            sectors['solo_parent'][sex] += 1
            sectors['solo_parent']['total'] += 1
            
        if r['is_indigenous']:
            sectors['indigenous'][sex] += 1
            sectors['indigenous']['total'] += 1
            
        # Vulnerable: Children (<18), Senior (60+ or is_senior_citizen), PWD
        if years < 18 or years >= 60 or r['is_senior_citizen'] or r['is_pwd']:
            sectors['vulnerable'][sex] += 1
            sectors['vulnerable']['total'] += 1
            
        # CIVIL STATUS
        cstat = r['civil_status'].lower()
        if cstat == 'married':
            civil_status['married'][sex] += 1
            civil_status['married']['total'] += 1
        else:
            # Lump Single, Widowed, Separated, etc. into 'Single' to match template strictness
            civil_status['single'][sex] += 1
            civil_status['single']['total'] += 1
            
        # CITIZENSHIP
        cit = r['citizenship'].lower()
        if 'filipino' in cit:
            citizenship['filipino'][sex] += 1
            citizenship['filipino']['total'] += 1
        else:
            citizenship['foreigner'][sex] += 1
            citizenship['foreigner']['total'] += 1

    return {
        'metadata': {
            'region': 'IV-A',
            'province': 'CAVITE',
            'city': 'GENERAL TRIAS',
            'barangay': 'SAN GABRIEL',
            'semester': '2nd Semester of CY ' + str(today.year),
        },
        'totals': {
            'inhabitants': len(res_data),
            'households': Household.objects.count(),
            'families': Household.objects.count() # Approximated
        },
        'age_brackets': age_brackets,
        'sectors': sectors,
        'civil_status': civil_status,
        'citizenship': citizenship
    }

class RBIFormCReportView(APIView):
    permission_classes = [IsAuthenticated, IsInternalUser]

    def get(self, request):
        return Response(get_rbi_form_c_data())

class RBIFormCDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsInternalUser]

    def get(self, request):
        import os
        from django.conf import settings
        
        data = get_rbi_form_c_data()
        # Load the user's template
        template_path = os.path.join(settings.BASE_DIR, 'RBI_Form_C_Template.xlsx')
        wb = openpyxl.load_workbook(template_path)
        ws = wb.active

        # Inject Header Data
        ws['A3'] = f"for {data['metadata']['semester']}"

        from openpyxl.styles import Alignment, Font
        center_align = Alignment(horizontal='center', vertical='center')
        bold_font = Font(bold=True)

        ws['B10'] = data['totals']['inhabitants']
        ws['B11'] = data['totals']['households']
        ws['B12'] = data['totals']['families']
        
        # Style B10-B12
        for r in [10, 11, 12]:
            ws[f'B{r}'].alignment = center_align
            ws[f'B{r}'].font = bold_font

        # Helper to inject row data and style it
        def inject_row(row_idx, row_data):
            cell_m = ws[f'B{row_idx}']
            cell_f = ws[f'C{row_idx}']
            cell_t = ws[f'D{row_idx}']
            
            cell_m.value = row_data['male']
            cell_f.value = row_data['female']
            cell_t.value = row_data['total']
            
            # Apply centering to all
            cell_m.alignment = center_align
            cell_f.alignment = center_align
            cell_t.alignment = center_align
            
            # Make TOTAL bold
            cell_t.font = bold_font

        # Age Brackets (Rows 16-34)
        age_keys = ['0-12 months', '13-23 months', '24-59 months', '5-9 years', '10-14 years', '15-19 years', '20-24 years', '25-29 years', '30-34 years', '35-39 years', '40-44 years', '45-49 years', '50-54 years', '55-59 years', '60-64 years', '65-69 years', '70-74 years', '75-79 years', '80 years and over']
        for i, key in enumerate(age_keys, start=16):
            inject_row(i, data['age_brackets'][key])

        # Sectors (Rows 36-44)
        sectors_keys = ['labor_force', 'unemployed', 'osc', 'osy', 'pwd', 'ofw', 'solo_parent', 'vulnerable', 'indigenous']
        for i, key in enumerate(sectors_keys, start=36):
            inject_row(i, data['sectors'][key])

        # Civil Status
        inject_row(45, data['civil_status']['single'])
        inject_row(46, data['civil_status']['married'])
        
        # Citizenship
        inject_row(47, data['citizenship']['filipino'])
        inject_row(48, data['citizenship']['foreigner'])

        # HTTP Response
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="RBI_Form_C_Styled.xlsx"'
        wb.save(response)
        return response


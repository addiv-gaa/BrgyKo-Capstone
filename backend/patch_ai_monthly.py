import re

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'"charts": \{(.*?)"gender": gender_data,'

replacement = '''"charts": {
                "monthly_ai": list(AiQueryStatistic.objects.filter(created_at__year=today.year).values('created_at__month').annotate(ai=Count('id')).order_by('created_at__month')),
                "gender": gender_data,'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Backend patched for monthly AI queries!")

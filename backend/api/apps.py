import os
from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'
    
    def ready(self):
        if os.environ.get('RUN_MAIN', None) != 'true':
            try:
                from . import scheduler
                scheduler.start()
            except ImportError:
                pass

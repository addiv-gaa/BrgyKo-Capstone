import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const API_URL = import.meta.env.VITE_API_URL;

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

export default function BarangayCalendar() {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month'); 

  useEffect(() => {
    const fetchCalendar = async () => {
      const token = localStorage.getItem('access');
      
      if (!token) {
          console.error("No token found. Please log in.");
          return;
      }

      try {
          const response = await fetch(`${API_URL}/api/calendar-feed/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await response.json();

          // SAFETY CHECK: Ensure response is OK and data is actually an array
          if (response.ok && Array.isArray(data)) {
            const formattedData = data.map((item: any) => ({
              ...item,
              start: new Date(item.start),
              end: new Date(item.end)
            }));
            setScheduleData(formattedData);
          } else {
            console.error("Failed to load calendar. Backend returned:", data);
          }
      } catch (error) {
          console.error("Network error fetching calendar:", error);
      }
    };
    
    fetchCalendar();
  }, []);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#1c4ed8'; 
    if (event.type === 'RESERVATION') backgroundColor = '#16a34a'; 
    if (event.type === 'ABSENCE') backgroundColor = '#dc2626'; 

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm h-200">
      <h2 className="text-2xl font-bold mb-4">Barangay Schedule</h2>
      
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#1c4ed8]"></span>
            <span className="text-sm font-medium">Activity</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#16a34a]"></span>
            <span className="text-sm font-medium">Reservation</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#dc2626]"></span>
            <span className="text-sm font-medium">Absence</span>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={scheduleData}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100% - 80px)' }}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        date={currentDate}
        view={currentView}
        onNavigate={(newDate) => setCurrentDate(newDate)}
        onView={(newView) => setCurrentView(newView)}
      />
    </div>
  );
}
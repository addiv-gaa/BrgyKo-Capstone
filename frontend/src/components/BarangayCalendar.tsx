import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const API_URL = import.meta.env.VITE_API_URL;

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

interface BarangayCalendarProps {
    onEventClick?: (event: any) => void;
    refreshTrigger?: number;
}

export default function BarangayCalendar({ onEventClick, refreshTrigger = 0 }: BarangayCalendarProps) {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month'); 

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
          const response = await api.get('/api/calendar-feed/');
          const data = response.data;

          // SAFETY CHECK: Ensure response is OK and data is actually an array
          if (response.status === 200 && Array.isArray(data)) {
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
  }, [refreshTrigger]);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#16a34a'; 
    if (event.type === 'RESERVATION') backgroundColor = '#16a34a'; 
    if (event.type === 'ABSENCE') backgroundColor = '#dc2626'; 
    if (event.type === 'AGENDA') backgroundColor = '#f59e0b'; // yellow-orange / amber

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
            <span className="w-3 h-3 rounded-full bg-[#16a34a]"></span>
            <span className="text-sm font-medium">Activity</span>
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
        onSelectEvent={onEventClick}
        components={{
            event: (props: any) => {
                const [hover, setHover] = useState(false);
                const [coords, setCoords] = useState({x: 0, y: 0});

                return (
                    <div 
                        className="w-full h-full truncate"
                        onMouseEnter={(e) => {
                            setHover(true);
                            setCoords({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHover(false)}
                        onMouseMove={(e) => {
                            if (hover) setCoords({ x: e.clientX, y: e.clientY });
                        }}
                    >
                        {props.title}
                        {hover && document.body && createPortal(
                            <div 
                                className="fixed z-[9999] bg-white border border-gray-200 shadow-sm p-3 pointer-events-none min-w-[150px] opacity-95"
                                style={{ top: coords.y + 15, left: coords.x + 15 }}
                            >
                                <div className="text-gray-600 text-[13px] mb-1.5">{props.event.title}</div>
                                <div className="text-gray-900 text-[13px]">{props.event.description || 'No additional details'}</div>
                            </div>,
                            document.body
                        )}
                    </div>
                );
            }
        }}
      />
    </div>
  );
}
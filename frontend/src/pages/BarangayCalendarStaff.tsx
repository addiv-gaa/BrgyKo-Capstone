import React, { useState } from 'react';
import BarangayCalendar from "../components/BarangayCalendar";
import { AlertTriangle, Save, CalendarPlus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function StaffSchedulePage() {
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'ACTIVITY',
        description: '',
        start_time: '',
        end_time: ''
    });

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [editEventData, setEditEventData] = useState<any>(null);
    const [isConfirmingAdd, setIsConfirmingAdd] = useState(false);
    const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<any>(null);

    const getNowDateTimeString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.start_time || !formData.end_time) {
            alert("Please select both start and end date/time.");
            return;
        }
        const start = new Date(formData.start_time);
        const end = new Date(formData.end_time);
        const now = new Date();
        if (start < new Date(now.getTime() - 5 * 60 * 1000)) {
            alert("Event start time cannot be in the past.");
            return;
        }
        if (end < start) {
            alert("Event end time cannot be before the start time.");
            return;
        }
        setIsConfirmingAdd(true);
    };

    // F-028: Extract friendly error messages instead of raw text
    const getFriendlyError = async (res: Response, fallback: string) => {
        try {
            const data = await res.json();
            return data?.error || data?.detail || 
                (typeof data === 'object' && Object.values(data)[0] ? (Array.isArray(Object.values(data)[0]) ? (Object.values(data)[0] as string[])[0] : Object.values(data)[0]) : null) || 
                fallback;
        } catch {
            return fallback;
        }
    };

    const executeAdd = async () => {
        try {
            const response = await fetch(`${API_URL}/api/events/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setRefreshTrigger(prev => prev + 1);
                setFormData({ title: '', event_type: 'ACTIVITY', description: '', start_time: '', end_time: '' });
                setIsConfirmingAdd(false);
            } else {
                const msg = await getFriendlyError(response, "Failed to create event. Please verify required fields.");
                alert(msg);
                setIsConfirmingAdd(false);
            }
        } catch (error) {
            console.error("Error adding event:", error);
        }
    };

    const handleEventClick = (event: any) => {
        if (!event.raw_id) {
            alert(`Cannot edit this specific event from here.\n\nTitle: ${event.title}`);
            return;
        }
        setEditEventData({
            raw_id: event.raw_id,
            title: event.title,
            description: event.description || '',
            event_type: event.type
        });
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsConfirmingEdit(true);
    };

    const executeEdit = async () => {
        try {
            const response = await fetch(`${API_URL}/api/events/${editEventData.raw_id}/`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editEventData.title,
                    description: editEventData.description,
                    event_type: editEventData.event_type
                })
            });
            if (response.ok) {
                setRefreshTrigger(prev => prev + 1);
                setIsConfirmingEdit(false);
                setEditEventData(null);
            } else {
                const msg = await getFriendlyError(response, "Failed to update event. Please verify required fields.");
                alert(msg);
                setIsConfirmingEdit(false);
            }
        } catch (error) {
            console.error("Error updating event:", error);
        }
    };

    const handleEditDelete = () => {
        setEventToDelete(editEventData);
    };

    const executeDelete = async () => {
        if (!eventToDelete) return;
        try {
            const response = await fetch(`${API_URL}/api/events/${eventToDelete.raw_id}/`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                setRefreshTrigger(prev => prev + 1);
                setEventToDelete(null);
                setEditEventData(null);
            } else {
                const msg = await getFriendlyError(response, "Failed to delete event.");
                alert(msg);
                setEventToDelete(null);
            }
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f4f7fa]">
                    <div className="w-full h-full"> 
                        
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Barangay Schedule</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage official events and absences.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
                            <div className="xl:col-span-3">
                                <BarangayCalendar onEventClick={handleEventClick} refreshTrigger={refreshTrigger} />
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                                <h1 className="text-2xl font-bold mb-6">Manage Events</h1>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
                                        <select 
                                            value={formData.event_type}
                                            onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                        >
                                            <option value="ACTIVITY">Barangay Activity</option>
                                            <option value="ABSENCE">Official Absence</option>
                                            <option value="AGENDA">Barangay Official Events / Agenda</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title</label>
                                        <input 
                                            type="text" required
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            placeholder="e.g. Kapitan on Leave"
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Details / Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            placeholder="Optional event details..."
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600 min-h-[80px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Start Date & Time</label>
                                        <input 
                                            type="datetime-local" required
                                            min={getNowDateTimeString()}
                                            value={formData.start_time}
                                            onChange={(e) => {
                                                const newStart = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    start_time: newStart,
                                                    end_time: prev.end_time && prev.end_time < newStart ? newStart : prev.end_time
                                                }));
                                            }}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">End Date & Time</label>
                                        <input 
                                            type="datetime-local" required
                                            min={formData.start_time || getNowDateTimeString()}
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        Save to Calendar
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* Edit Event Modal */}
            {editEventData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-5 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">Edit Event</h2>
                            <button onClick={() => setEditEventData(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md border border-gray-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleEditSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
                                <select 
                                    value={editEventData.event_type}
                                    onChange={(e) => setEditEventData({...editEventData, event_type: e.target.value})}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                >
                                    <option value="ACTIVITY">Barangay Activity</option>
                                    <option value="ABSENCE">Official Absence</option>
                                    <option value="AGENDA">Barangay Official Events / Agenda</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title</label>
                                <input 
                                    type="text" required
                                    value={editEventData.title}
                                    onChange={(e) => setEditEventData({...editEventData, title: e.target.value})}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Details / Description</label>
                                <textarea
                                    value={editEventData.description}
                                    onChange={(e) => setEditEventData({...editEventData, description: e.target.value})}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-green-600 min-h-[80px]"
                                />
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button type="button" onClick={handleEditDelete} className="text-red-600 hover:text-red-800 text-sm font-bold transition-colors">
                                    Delete Event
                                </button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditEventData(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-colors shadow-sm">Save Changes</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Confirmation Modal */}
            {isConfirmingAdd && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                                <CalendarPlus className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Create New Event?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to add <strong>{formData.title}</strong> to the official barangay calendar?
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsConfirmingAdd(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={executeAdd} className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                    Yes, Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Confirmation Modal */}
            {isConfirmingEdit && editEventData && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-green-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                                <Save className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Save Changes?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to save the new details for <strong>{editEventData.title}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsConfirmingEdit(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={executeEdit} className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                                    Yes, Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {eventToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Event?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to completely remove <strong>{eventToDelete.title}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEventToDelete(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={executeDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

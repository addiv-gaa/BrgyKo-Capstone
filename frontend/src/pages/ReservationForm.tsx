import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

interface Facility {
    id: number;
    name: string;
    status: string;
}

interface Equipment {
    id: number;
    name: string;
    total_quantity: number;
    status: string;
}

export default function ReservationForm() {
    const navigate = useNavigate();
    
    const [reservationType, setReservationType] = useState<'facility' | 'equipment'>('facility');
    
    // Lists fetched from the database
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [formData, setFormData] = useState({
        facility: '',
        equipment: '',
        equipment_quantity: 1,
        start_time: '',
        end_time: '',
        purpose: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('access');
            if (!token) return;

            try {
                const [facRes, eqRes] = await Promise.all([
                    fetch(`${API_URL}/api/facilities/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/equipment/`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (facRes.ok) setFacilities(await facRes.json());
                if (eqRes.ok) setEquipment(await eqRes.json());
            } catch (error) {
                console.error("Error fetching reservation items:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        // Basic validation
        if (new Date(formData.end_time) <= new Date(formData.start_time)) {
            setErrorMessage("End time must be after the start time.");
            return;
        }

        if (reservationType === 'facility' && !formData.facility) {
            setErrorMessage("Please select a facility.");
            return;
        }
        if (reservationType === 'equipment' && !formData.equipment) {
            setErrorMessage("Please select equipment.");
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('access');

        // Clean up payload based on type
        const payload = {
            start_time: formData.start_time,
            end_time: formData.end_time,
            purpose: formData.purpose,
            ...(reservationType === 'facility' 
                ? { facility: formData.facility } 
                : { equipment: formData.equipment, equipment_quantity: formData.equipment_quantity })
        };

        try {
            const response = await fetch(`${API_URL}/api/reservations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Reservation requested successfully! Waiting for staff approval.");
                navigate('/resident/schedule'); // Send them back to their calendar view
            } else {
                const errorData = await response.json();
                // Check for the custom overlap errors we wrote in Django
                if (errorData.error) {
                    setErrorMessage(errorData.error);
                } else {
                    setErrorMessage("Failed to submit request. Please check your inputs.");
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            setErrorMessage("A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter out items that are under maintenance or out of stock
    const availableFacilities = facilities.filter(f => f.status === 'AVAILABLE' || f.status === 'Available');
    const availableEquipment = equipment.filter(e => e.status === 'AVAILABLE' || e.status === 'Available');

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200 mt-6">
                        <div className="mb-8">
                            <button 
                                onClick={() => navigate('/resident/schedule')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-4 inline-block"
                            >
                                &larr; Back to Calendar
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Request a Reservation</h1>
                            <p className="text-gray-500 mt-1">Book a barangay facility or borrow equipment for your activities.</p>
                        </div>

                        {errorMessage && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md text-sm font-medium">
                                {errorMessage}
                            </div>
                        )}

                        {/* Type Toggle */}
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg mb-6 w-full">
                            <button
                                type="button"
                                onClick={() => setReservationType('facility')}
                                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
                                    reservationType === 'facility' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Book a Facility
                            </button>
                            <button
                                type="button"
                                onClick={() => setReservationType('equipment')}
                                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
                                    reservationType === 'equipment' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Borrow Equipment
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Conditional Input based on Type */}
                            {reservationType === 'facility' ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Facility</label>
                                    <select 
                                        className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.facility}
                                        onChange={(e) => setFormData({...formData, facility: e.target.value})}
                                        disabled={isLoading}
                                    >
                                        <option value="">-- Choose a Facility --</option>
                                        {availableFacilities.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                    {availableFacilities.length === 0 && !isLoading && (
                                        <p className="text-xs text-red-500 mt-1">No facilities currently available.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Select Equipment</label>
                                        <select 
                                            className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.equipment}
                                            onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                                            disabled={isLoading}
                                        >
                                            <option value="">-- Choose Equipment --</option>
                                            {availableEquipment.map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.name} (Max: {eq.total_quantity})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                                        <input 
                                            type="number" min="1" 
                                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.equipment_quantity}
                                            onChange={(e) => setFormData({...formData, equipment_quantity: parseInt(e.target.value) || 1})}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Purpose / Event Name</label>
                                <input 
                                    type="text" required
                                    placeholder="e.g. Liga ng Barangay / Birthday Party"
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                                    <input 
                                        type="datetime-local" required
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                                    <input 
                                        type="datetime-local" required
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-gray-100">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting Request...' : 'Submit Reservation Request'}
                                </button>
                            </div>
                        </form>
                        
                    </div>
                </main>
            </div>
        </div>
    );
}
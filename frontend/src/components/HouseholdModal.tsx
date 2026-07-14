import React, { useEffect } from 'react';

// Notice: No people data here anymore! Just the physical structure.
export interface HouseholdSaveData {
    address: string;
    housing_status: string;
    dwelling_type: string;
}

interface HouseholdModalProps {
    mode: 'add' | 'edit';
    household: any | null; // The existing feature data
    coords: { lat: number, lng: number } | null;
    onClose: () => void;
    onSave: (data: Partial<HouseholdSaveData>) => void;
}

export default function HouseholdModal({ mode, household, coords, onClose, onSave }: HouseholdModalProps) {
    
    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        onSave({
            address: formData.get('address') as string,
            housing_status: formData.get('housing_status') as string,
            dwelling_type: formData.get('dwelling_type') as string,
        });
    };

    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'add' ? 'Map New Household Structure' : 'Edit Structure Details'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                
                <form className="p-6 space-y-5" onSubmit={handleSubmit}>
                    
                    {/* Coordinates Display (Read Only) */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                        <span className="text-xl">📍</span>
                        <div className="text-sm">
                            <span className="block font-semibold text-blue-900">Location Locked</span>
                            <span className="text-blue-700 font-mono">
                                {mode === 'add' && coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : ''}
                                {mode === 'edit' && household ? `${household.geometry.coordinates[1].toFixed(6)}, ${household.geometry.coordinates[0].toFixed(6)}` : ''}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address / Description</label>
                        <textarea 
                            name="address" 
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500" 
                            defaultValue={household?.properties?.address || ''} 
                            placeholder="e.g., 123 Main St, near the basketball court..."
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Housing Status</label>
                            <select 
                                name="housing_status" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" 
                                defaultValue={household?.properties?.housing_status || 'Owned'}
                            >
                                <option value="Owned">Owned</option>
                                <option value="Rented">Rented</option>
                                <option value="Informal Settler">Informal Settler</option>
                                <option value="Caretaker">Caretaker</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dwelling Type</label>
                            <select 
                                name="dwelling_type" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" 
                                defaultValue={household?.properties?.dwelling_type || 'Concrete'}
                            >
                                <option value="Concrete">Concrete</option>
                                <option value="Semi-Concrete">Semi-Concrete</option>
                                <option value="Light Materials">Light Materials (Wood/Nipa)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                            {mode === 'add' ? 'Save Location' : 'Update Structure'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
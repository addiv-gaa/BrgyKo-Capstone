import React, { useEffect } from "react";

export interface ResidentProperties {
    id?: number;
    first_name: string;
    last_name: string;
    sex: string;
    purok: string;
    birth_date: string | null;
    civil_status: string;
    relationship_to_head: string;
    household?: number | null; // The ID of the mapped house
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
    has_pwd: boolean;
    has_solo_parent: boolean;
}

interface ResidentModalProps {
    mode: 'add' | 'edit';
    resident: ResidentProperties | null;
    households: { id: number, address: string }[]; // <--- NEW PROP
    onClose: () => void;
    onSave: (data: Partial<ResidentProperties>) => void;
}

export default function ResidentModal({ mode, resident, households, onClose, onSave }: ResidentModalProps) {
    
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'add' ? 'Add New Resident' : 'Edit Resident Details'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                
                <form className="p-6 space-y-5" onSubmit={(e) => { 
                    e.preventDefault(); 
                    const formData = new FormData(e.currentTarget);
                    
                    const extractedData: Partial<ResidentProperties> = {
                        first_name: formData.get('first_name') as string,
                        last_name: formData.get('last_name') as string,
                        sex: formData.get('sex') as string,
                        purok: formData.get('purok') as string,
                        birth_date: formData.get('birth_date') as string,
                        civil_status: formData.get('civil_status') as string,
                        relationship_to_head: formData.get('relationship_to_head') as string,
                        
                        // Grab the household ID and send it to Django
                        household: formData.get('household') ? parseInt(formData.get('household') as string, 10) : null,
                        
                        is_4ps_beneficiary: formData.get('is_4ps_beneficiary') === 'on',
                        has_senior_citizen: formData.get('has_senior_citizen') === 'on',
                        has_pwd: formData.get('has_pwd') === 'on',
                        has_solo_parent: formData.get('has_solo_parent') === 'on',
                    };

                    onSave(extractedData);
                }}>
                    
                    {/* ... (Keep Section 1: Basic Info exactly the same) ... */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                <input type="text" name="first_name" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.first_name || ''} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input type="text" name="last_name" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.last_name || ''} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                                <input type="date" name="birth_date" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.birth_date || ''} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                                <select name="sex" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.sex || 'Male'}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status</label>
                                <select name="civil_status" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.civil_status || 'Single'}>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Residency Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purok</label>
                                <select name="purok" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.purok || 'Purok 1'}>
                                    <option value="Purok 1">Purok 1</option>
                                    <option value="Purok 2">Purok 2</option>
                                    <option value="Purok 3">Purok 3</option>
                                    <option value="Purok 4">Purok 4</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Head</label>
                                <select name="relationship_to_head" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.relationship_to_head || 'Head'}>
                                    <option value="Head">Head of Household</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Child">Child</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Other">Other Relative / Non-Relative</option>
                                </select>
                            </div>
                            
                            {/* THE DYNAMIC HOUSEHOLD DROPDOWN */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Mapped Household (Optional)</label>
                                <div className="text-xs text-gray-500 mb-2">Leave blank if the household is not mapped on the GIS yet.</div>
                                <select name="household" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue={resident?.household || ''}>
                                    <option value="">-- Unmapped / No Household Assigned --</option>
                                    {households.map(h => (
                                        <option key={h.id} value={h.id}>{h.address}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* ... (Keep Section 3: Welfare Flags exactly the same) ... */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Welfare & Vulnerability Flags</h3>
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                <input type="checkbox" name="is_4ps_beneficiary" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={resident?.is_4ps_beneficiary} />
                                <span className="text-sm font-medium text-gray-700">4Ps Beneficiary</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                <input type="checkbox" name="has_senior_citizen" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={resident?.has_senior_citizen} />
                                <span className="text-sm font-medium text-gray-700">Senior Citizen</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                <input type="checkbox" name="has_pwd" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={resident?.has_pwd} />
                                <span className="text-sm font-medium text-gray-700">Person w/ Disability (PWD)</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                                <input type="checkbox" name="has_solo_parent" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={resident?.has_solo_parent} />
                                <span className="text-sm font-medium text-gray-700">Solo Parent</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white border-t border-gray-100 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-[#1e40af] text-white font-medium rounded-lg hover:bg-blue-800 shadow-sm transition-colors">Save Resident</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
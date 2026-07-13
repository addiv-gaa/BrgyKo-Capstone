import { useEffect } from "react";

// 1. Define the shapes of your data
export interface HouseholdProperties {
    id?: number;
    head_of_household: string;
    address: string;
    member_count: number;
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
    has_pwd: boolean;
    has_solo_parent: boolean;
    housing_status: string;
    dwelling_type: string;
}

export interface GeoJSONFeature {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [Longitude, Latitude]
    };
    properties: HouseholdProperties;
}

// 2. Define the exact props the Modal expects to receive
interface HouseholdModalProps {
    mode: 'add' | 'edit';
    household: GeoJSONFeature | null;
    coords: { lat: number; lng: number } | null;
    onClose: () => void;
    onSave: (data: Partial<HouseholdProperties>) => void;
}

// 3. Replace 'any' with HouseholdModalProps
export default function HouseholdModal({ mode, household, coords, onClose, onSave }: HouseholdModalProps) {
    
    // Prevent background scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold">
                        {mode === 'add' ? 'Add New Household' : 'Edit Household Details'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <form className="p-6 space-y-4" onSubmit={(e) => { 
                    e.preventDefault(); 
                    
                    // Extract data directly from the form elements using their 'name' attributes
                    const formData = new FormData(e.currentTarget);
                    
                    const extractedData: Partial<HouseholdProperties> = {
                        head_of_household: formData.get('head_of_household') as string,
                        address: formData.get('address') as string,
                        member_count: parseInt(formData.get('member_count') as string, 10),
                        housing_status: formData.get('housing_status') as string,
                        // Checkboxes return "on" if checked, null if unchecked
                        is_4ps_beneficiary: formData.get('is_4ps_beneficiary') === 'on',
                        has_senior_citizen: formData.get('has_senior_citizen') === 'on',
                        has_pwd: formData.get('has_pwd') === 'on',
                        has_solo_parent: formData.get('has_solo_parent') === 'on',
                    };

                    onSave(extractedData);
                }}>
                    
                    {/* Read-only coordinates if adding */}
                    {mode === 'add' && coords && (
                        <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                            Selected Location: Lat {coords.lat.toFixed(5)}, Lng {coords.lng.toFixed(5)}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Head of Household</label>
                        <input type="text" name="head_of_household" className="w-full border border-gray-300 rounded-lg p-2" defaultValue={household?.properties.head_of_household || ''} required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input type="text" name="address" className="w-full border border-gray-300 rounded-lg p-2" defaultValue={household?.properties.address || ''} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Members</label>
                            <input type="number" name="member_count" className="w-full border border-gray-300 rounded-lg p-2" defaultValue={household?.properties.member_count || 1} min="1" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Housing Status</label>
                            <select name="housing_status" className="w-full border border-gray-300 rounded-lg p-2" defaultValue={household?.properties.housing_status || 'Owned'}>
                                <option value="Owned">Owned</option>
                                <option value="Rented">Rented</option>
                                <option value="Informal Settler">Informal Settler</option>
                                <option value="Caretaker">Caretaker</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vulnerability Flags</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="is_4ps_beneficiary" className="rounded text-blue-600" defaultChecked={household?.properties.is_4ps_beneficiary} />
                                <span className="text-sm">4Ps Beneficiary</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="has_senior_citizen" className="rounded text-blue-600" defaultChecked={household?.properties.has_senior_citizen} />
                                <span className="text-sm">Senior Citizen</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="has_pwd" className="rounded text-blue-600" defaultChecked={household?.properties.has_pwd} />
                                <span className="text-sm">Person w/ Disability (PWD)</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" name="has_solo_parent" className="rounded text-blue-600" defaultChecked={household?.properties.has_solo_parent} />
                                <span className="text-sm">Solo Parent</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3 justify-end sticky bottom-0 bg-white border-t mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Household</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
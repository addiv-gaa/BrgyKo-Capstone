import React, { useState, useEffect } from 'react';

export interface ResidentProperties {
    id?: number;
    inhabitant_type: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    suffix: string;
    birth_place: string;
    birth_date: string;
    sex: string;
    civil_status: string;
    citizenship: string;
    occupation: string;
    contact_number: string;
    email_address: string;
    highest_education: string;
    mothers_first_name: string;
    mothers_middle_name: string;
    mothers_last_name: string;
    purok: string;
    relationship_to_head: string;
    household: number | null;
    is_registered_voter: boolean;
    is_4ps_beneficiary: boolean;
    is_senior_citizen: boolean; // FIXED: Changed from has_ to is_
    is_pwd: boolean;            // FIXED: Changed from has_ to is_
    is_solo_parent: boolean;    // FIXED: Changed from has_ to is_
}

interface ModalProps {
    mode: 'add' | 'edit' | 'view';
    resident: ResidentProperties | null;
    households: { id: number; address: string }[];
    onClose: () => void;
    onSave: (data: Partial<ResidentProperties>) => void;
}

const DEFAULT_FORM_STATE: ResidentProperties = {
    inhabitant_type: 'NON-MIGRANT',
    first_name: '',
    last_name: '',
    middle_name: '',
    suffix: '',
    birth_place: '',
    birth_date: '',
    sex: 'Male',
    civil_status: 'Single',
    citizenship: 'Filipino',
    occupation: '',
    contact_number: '',
    email_address: '',
    highest_education: '',
    mothers_first_name: '',
    mothers_middle_name: '',
    mothers_last_name: '',
    purok: '',
    relationship_to_head: 'Head',
    household: null,
    is_registered_voter: false,
    is_4ps_beneficiary: false,
    is_senior_citizen: false, // FIXED
    is_pwd: false,            // FIXED
    is_solo_parent: false,    // FIXED
};

export default function ResidentModal({ mode, resident, households, onClose, onSave }: ModalProps) {
    const [formData, setFormData] = useState<ResidentProperties>(DEFAULT_FORM_STATE);
    const isViewOnly = mode === 'view';

    useEffect(() => {
        if (resident) {
            setFormData({ ...DEFAULT_FORM_STATE, ...resident });
        } else {
            setFormData(DEFAULT_FORM_STATE);
        }
    }, [resident]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => {
                const newData = { ...prev, [name]: value };
                
                // Automatically check Senior Citizen if birthdate makes them 60+
                if (name === 'birth_date' && value) {
                    const today = new Date();
                    const birthDate = new Date(value);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    newData.is_senior_citizen = age >= 60;
                }
                
                return newData;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const inputClass = `w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${isViewOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`;
    const labelClass = "block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1";
    const sectionHeaderClass = "text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 mt-6 uppercase tracking-wide";

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {mode === 'add' ? 'Add New Resident' : mode === 'edit' ? 'Edit Resident Profile' : 'Resident Details'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <form id="resident-form" onSubmit={handleSubmit} className="space-y-4">
                        
                        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wide">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className={labelClass}>Inhabitant Type *</label>
                                <select name="inhabitant_type" value={formData.inhabitant_type} onChange={handleChange} required disabled={isViewOnly} className={inputClass}>
                                    <option value="NON-MIGRANT">Non-Migrant</option>
                                    <option value="MIGRANT">Migrant</option>
                                    <option value="TRANSIENT">Transient</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Citizenship *</label>
                                <input type="text" name="citizenship" value={formData.citizenship} onChange={handleChange} required disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Civil Status *</label>
                                <select name="civil_status" value={formData.civil_status} onChange={handleChange} required disabled={isViewOnly} className={inputClass}>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Sex *</label>
                                <select name="sex" value={formData.sex} onChange={handleChange} required disabled={isViewOnly} className={inputClass}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className={labelClass}>Last Name *</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>First Name *</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Middle Name</label>
                                <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-1">
                                <label className={labelClass}>Suffix</label>
                                <input type="text" name="suffix" value={formData.suffix} onChange={handleChange} disabled={isViewOnly} placeholder="e.g. Jr, III" className={inputClass} />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Birth Place</label>
                                <input type="text" name="birth_place" value={formData.birth_place} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Birth Date *</label>
                                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} required disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div className="md:col-span-4 flex items-center pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="is_registered_voter" checked={formData.is_registered_voter} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Registered Voter</span>
                                </label>
                            </div>
                        </div>

                        <h3 className={sectionHeaderClass}>Contact & Demographics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Contact Number</label>
                                <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Occupation / Profession</label>
                                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Highest Educational Attainment</label>
                                <input type="text" name="highest_education" value={formData.highest_education} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                        </div>

                        <h3 className={sectionHeaderClass}>Family Background</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Mother's First Name</label>
                                <input type="text" name="mothers_first_name" value={formData.mothers_first_name} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Mother's Middle Name</label>
                                <input type="text" name="mothers_middle_name" value={formData.mothers_middle_name} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Mother's Last/Maiden Name</label>
                                <input type="text" name="mothers_last_name" value={formData.mothers_last_name} onChange={handleChange} disabled={isViewOnly} className={inputClass} />
                            </div>
                        </div>

                        <h3 className={sectionHeaderClass}>Address & Household</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Purok / Zone *</label>
                                <input type="text" name="purok" value={formData.purok} onChange={handleChange} required disabled={isViewOnly} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Link to Household (Optional)</label>
                                <select name="household" value={formData.household || ''} onChange={handleChange} disabled={isViewOnly} className={inputClass}>
                                    <option value="">-- No Household --</option>
                                    {households.map(h => (
                                        <option key={h.id} value={h.id}>{h.address}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Relationship to Head</label>
                                <select name="relationship_to_head" value={formData.relationship_to_head} onChange={handleChange} disabled={isViewOnly} className={inputClass}>
                                    <option value="Head">Head of Household</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Child">Child</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Other">Other / Non-Relative</option>
                                </select>
                            </div>
                        </div>

                        <h3 className={sectionHeaderClass}>Sector / Vulnerability Group</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            {/* FIXED ALL CHECKBOX NAMES */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="is_4ps_beneficiary" checked={formData.is_4ps_beneficiary} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-green-600 rounded" />
                                <span className="text-sm font-medium text-gray-700">4Ps Beneficiary</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="is_senior_citizen" checked={formData.is_senior_citizen} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-green-600 rounded" />
                                <span className="text-sm font-medium text-gray-700">Senior Citizen</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="is_pwd" checked={formData.is_pwd} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-green-600 rounded" />
                                <span className="text-sm font-medium text-gray-700">PWD</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="is_solo_parent" checked={formData.is_solo_parent} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-green-600 rounded" />
                                <span className="text-sm font-medium text-gray-700">Solo Parent</span>
                            </label>
                        </div>

                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        {isViewOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!isViewOnly && (
                        <button type="submit" form="resident-form" className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm">
                            Save Resident
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
import api from '../api';
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthContext";
import { useSettings } from "../components/SettingsContext";
import { Database, Camera, Upload, Copy, Check, Image as ImageIcon, Clock, AlertTriangle, Plus, Pencil, Trash2, Search, HelpCircle, X, CheckCircle, XCircle, Shield } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface AuditLog {
    id: number;
    model: string;
    target: string;
    action: string;
    user: string;
    date: string;
    details: string;
}

interface StaffMember {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    date_joined: string;
}

export interface BarangayFAQ {
    id: number;
    question: string;
    answer: string;
    category: 'FEES' | 'SERVICES' | 'EMERGENCY' | 'SANITATION' | 'GENERAL';
    category_display?: string;
    order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface SystemSettings {
    barangay_name: string;
    captain_name: string;
    secretary_name?: string;
    barangay_hall_address: string;
    official_contact_email: string;
    official_contact_number: string;
    barangay_seal_url: string;
    barangay_seal?: File | string | null;
    emergency_hotline: string;
    police_hotline: string;
    fire_hotline: string;
    operating_hours?: string;
    show_advisory_banner?: boolean;
    advisory_banner_text?: string;
    ai_chatbot_enabled: boolean;
    accept_permit_requests: boolean;
    accept_reservations: boolean;
    maintenance_mode: boolean;
    max_pending_requests_per_user: number;
    reservation_lead_time_days: number;
    captain_message?: string;
    barangay_classification?: string;
    barangay_city?: string;
    barangay_province?: string;
    barangay_region?: string;
    number_of_puroks?: string;
    history_text?: string;
    location_geography_text?: string;
    community_culture_text?: string;
    services_facilities_text?: string;
    captain_image?: File | string | null;
}

export default function AdminHub() {
    const auth = useContext(AuthContext);
    const { refreshSettings } = useSettings();
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'staff' | 'logs' | 'settings' | 'faqs'>('staff');

    // Data State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [logPage, setLogPage] = useState(1);
    const [logTotalPages, setLogTotalPages] = useState(1);
    const [logActionFilter, setLogActionFilter] = useState('');
    const [logModelFilter, setLogModelFilter] = useState('');
    const [logUserFilter, setLogUserFilter] = useState('');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Form States
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [actionFeedback, setActionFeedback] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning'; } | null>(null);
    const [staffActionModal, setStaffActionModal] = useState<{
        type: 'toggle_status' | 'delete_account' | 'reset_password' | 'change_role' | 'create_account';
        userId?: number;
        username: string;
        newRole?: string;
    } | null>(null);
    const [resetPasswordInput, setResetPasswordInput] = useState("");
    const [resetPasswordConfirmInput, setResetPasswordConfirmInput] = useState("");
    const [staffForm, setStaffForm] = useState({ username: "", email: "", password: "", role: "STAFF" });
    const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string; role: string; } | null>(null);
    const [confirmSettingsModal, setConfirmSettingsModal] = useState<boolean>(false);
    const [confirmSnapshotModal, setConfirmSnapshotModal] = useState<boolean>(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [sealPreview, setSealPreview] = useState<string | null>(null);

    // FAQ Management States
    const [faqs, setFaqs] = useState<BarangayFAQ[]>([]);
    const [faqSearch, setFaqSearch] = useState('');
    const [faqCategoryFilter, setFaqCategoryFilter] = useState('ALL');
    const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<BarangayFAQ | null>(null);
    const [faqFormData, setFaqFormData] = useState<{
        question: string;
        answer: string;
        category: 'FEES' | 'SERVICES' | 'EMERGENCY' | 'SANITATION' | 'GENERAL';
        order: string;
        is_active: boolean;
    }>({
        question: '',
        answer: '',
        category: 'FEES',
        order: '0',
        is_active: true
    });
    const [faqToDelete, setFaqToDelete] = useState<BarangayFAQ | null>(null);
    const [isSavingFaq, setIsSavingFaq] = useState(false);
    const [isDeletingFaq, setIsDeletingFaq] = useState(false);

    const [settingsForm, setSettingsForm] = useState<SystemSettings>({
        barangay_name: "", 
        captain_name: "", 
        secretary_name: "",
        barangay_hall_address: "",
        official_contact_email: "",
        official_contact_number: "",
        barangay_seal_url: "",
        barangay_seal: null,
        emergency_hotline: "", 
        police_hotline: "", 
        fire_hotline: "", 
        operating_hours: "Monday – Friday: 8:00 AM – 5:00 PM",
        show_advisory_banner: false,
        advisory_banner_text: "",
        ai_chatbot_enabled: true,
        accept_permit_requests: true,
        accept_reservations: true,
        maintenance_mode: false,
        max_pending_requests_per_user: 3,
        reservation_lead_time_days: 2,
        captain_message: "",
        barangay_classification: "",
        barangay_city: "",
        barangay_province: "",
        barangay_region: "",
        number_of_puroks: "",
        history_text: "",
        location_geography_text: "",
        community_culture_text: "",
        services_facilities_text: "",
        captain_image: null
    });

    // Single active Punong Barangay (Captain) check
    const hasActiveCaptain = staffList.some(s => s.role.toUpperCase() === 'CAPTAIN' && s.is_active);

    const STAFF_ROLES = [
        { value: 'ADMIN', label: 'Admin' },
        { value: 'STAFF', label: 'Staff' },
        { value: 'CAPTAIN', label: 'Punong Barangay' },
    ];
    
    const CREATABLE_ROLES = [
        { value: 'STAFF', label: 'Staff' },
        { value: 'CAPTAIN', label: hasActiveCaptain ? 'Punong Barangay (Active Account Exists)' : 'Punong Barangay' },
    ];

    useEffect(() => {
        if (hasActiveCaptain && staffForm.role.toUpperCase() === 'CAPTAIN') {
            setStaffForm(prev => ({ ...prev, role: 'STAFF' }));
        }
    }, [hasActiveCaptain]);

    useEffect(() => {
        const userRole = (auth?.user?.role || (auth?.user?.roles && auth.user.roles[0]) || "").toUpperCase();
        
        if (userRole === 'ADMIN') {
            setIsAuthorized(true);
            fetchData();
        } else {
            setIsAuthorized(false);
            setIsLoading(false);
        }
    }, [auth?.user]);


    const fetchLogs = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: logPage.toString(),
                page_size: '15',
                action: logActionFilter,
                model: logModelFilter,
                user: logUserFilter
            });
            const res = await api.get(`/api/admin/audit-logs/?${queryParams.toString()}`);
            if ((res.status >= 200 && res.status < 300)) {
                const logsData = res.data;
                setLogs(logsData.results ? logsData.results : (Array.isArray(logsData) ? logsData : []));
                if (logsData.num_pages) setLogTotalPages(logsData.num_pages);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs();
        }
    }, [logPage, logActionFilter, logModelFilter, logUserFilter, isAuthorized]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [staffRes, settingsRes, faqsRes] = await Promise.all([
                api.get(`/api/admin/staff-management/`),
                api.get(`/api/system/settings/`),
                api.get(`/api/faqs/`)
            ]);

            if ((staffRes.status >= 200 && staffRes.status < 300)) setStaffList(staffRes.data);
            if ((settingsRes.status >= 200 && settingsRes.status < 300)) {
                setSettingsForm(settingsRes.data);
                if (settingsRes.data.captain_image && typeof settingsRes.data.captain_image === 'string') {
                    setPhotoPreview(settingsRes.data.captain_image.startsWith('http') ? settingsRes.data.captain_image : `${API_URL}${settingsRes.data.captain_image}`);
                }
                if (settingsRes.data.barangay_seal && typeof settingsRes.data.barangay_seal === 'string') {
                    setSealPreview(settingsRes.data.barangay_seal.startsWith('http') ? settingsRes.data.barangay_seal : `${API_URL}${settingsRes.data.barangay_seal}`);
                }
            }
            if ((faqsRes.status >= 200 && faqsRes.status < 300)) {
                setFaqs(faqsRes.data.results || faqsRes.data);
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateRandomPassword = () => {
        const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lowercase = "abcdefghijkmnopqrstuvwxyz";
        const numbers = "23456789";
        const symbols = "!@#$%&*";
        const all = uppercase + lowercase + numbers + symbols;

        let pwd = "";
        pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
        pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));

        for (let i = 4; i < 10; i++) {
            pwd += all.charAt(Math.floor(Math.random() * all.length));
        }
        pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
        setStaffForm(prev => ({ ...prev, password: pwd }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setActionFeedback({
                title: "Invalid File Format",
                message: "Please select a JPG, PNG, or WebP image file.",
                type: "error"
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setActionFeedback({
                title: "File Too Large",
                message: "The selected photo exceeds the 5MB file size limit.",
                type: "error"
            });
            return;
        }

        setSettingsForm(prev => ({ ...prev, captain_image: file }));
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setSettingsForm(prev => ({ ...prev, captain_image: null }));
        setPhotoPreview(null);
    };

    const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setActionFeedback({
                title: "Invalid File Format",
                message: "Please select a JPG, PNG, or WebP image file.",
                type: "error"
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setActionFeedback({
                title: "File Too Large",
                message: "The selected seal image exceeds the 5MB file size limit.",
                type: "error"
            });
            return;
        }

        setSettingsForm(prev => ({ ...prev, barangay_seal: file }));
        setSealPreview(URL.createObjectURL(file));
    };

    const handleRemoveSeal = () => {
        setSettingsForm(prev => ({ ...prev, barangay_seal: null }));
        setSealPreview(null);
    };

    const fetchFaqs = async () => {
        try {
            const res = await api.get('/api/faqs/');
            if (res.status >= 200 && res.status < 300) {
                setFaqs(res.data.results || res.data);
            }
        } catch (error) {
            console.error("Error fetching FAQs:", error);
        }
    };

    const openFaqModal = (faq: BarangayFAQ | null = null) => {
        setEditingFaq(faq);
        if (faq) {
            setFaqFormData({
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                order: faq.order.toString(),
                is_active: faq.is_active
            });
        } else {
            setFaqFormData({
                question: '',
                answer: '',
                category: 'FEES',
                order: (faqs.length + 1).toString(),
                is_active: true
            });
        }
        setIsFaqModalOpen(true);
    };

    const closeFaqModal = () => {
        setIsFaqModalOpen(false);
        setEditingFaq(null);
    };

    const executeSaveFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!faqFormData.question.trim() || !faqFormData.answer.trim()) {
            setActionFeedback({ title: "Validation Error", message: "Question and Answer cannot be empty.", type: "error" });
            return;
        }

        setIsSavingFaq(true);
        try {
            const payload = {
                question: faqFormData.question.trim(),
                answer: faqFormData.answer.trim(),
                category: faqFormData.category,
                order: parseInt(faqFormData.order) || 0,
                is_active: faqFormData.is_active
            };

            if (editingFaq) {
                await api.put(`/api/faqs/${editingFaq.id}/`, payload);
                setActionFeedback({ title: "Updated", message: "FAQ / Knowledge article updated successfully.", type: "success" });
            } else {
                await api.post(`/api/faqs/`, payload);
                setActionFeedback({ title: "Created", message: "New FAQ / Knowledge article added successfully.", type: "success" });
            }

            await fetchFaqs();
            closeFaqModal();
        } catch (error: any) {
            console.error("Error saving FAQ:", error);
            setActionFeedback({ title: "Error", message: error.response?.data?.error || "Failed to save FAQ article.", type: "error" });
        } finally {
            setIsSavingFaq(false);
        }
    };

    const toggleFaqActive = async (faq: BarangayFAQ) => {
        try {
            await api.patch(`/api/faqs/${faq.id}/`, { is_active: !faq.is_active });
            await fetchFaqs();
        } catch (error) {
            console.error("Error toggling FAQ status:", error);
        }
    };

    const executeDeleteFaq = async () => {
        if (!faqToDelete) return;
        setIsDeletingFaq(true);
        try {
            await api.delete(`/api/faqs/${faqToDelete.id}/`);
            setActionFeedback({ title: "Deleted", message: "FAQ article removed.", type: "success" });
            await fetchFaqs();
            setFaqToDelete(null);
        } catch (error) {
            console.error("Error deleting FAQ:", error);
            setActionFeedback({ title: "Error", message: "Failed to delete FAQ article.", type: "error" });
        } finally {
            setIsDeletingFaq(false);
        }
    };

    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = faqCategoryFilter === 'ALL' || faq.category === faqCategoryFilter;
        const matchesSearch = !faqSearch.trim() || 
            faq.question.toLowerCase().includes(faqSearch.toLowerCase()) || 
            faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (staffForm.role.toUpperCase() === 'CAPTAIN' && hasActiveCaptain) {
            setActionFeedback({
                title: "Punong Barangay Limit",
                message: "An active Punong Barangay account already exists. You must deactivate or delete the existing account before registering a new one.",
                type: "warning"
            });
            return;
        }
        setStaffActionModal({ 
            type: 'create_account', 
            username: staffForm.username, 
            newRole: staffForm.role === 'CAPTAIN' ? 'Punong Barangay' : staffForm.role 
        });
    };

    const handleToggleStatus = (userId: number, username: string) => {
        setStaffActionModal({ type: 'toggle_status', userId, username });
    };

    const handleDeleteAccount = (userId: number, username: string) => {
        setStaffActionModal({ type: 'delete_account', userId, username });
    };

    const handleResetPassword = (userId: number, username: string) => {
        setResetPasswordInput("");
        setResetPasswordConfirmInput("");
        setStaffActionModal({ type: 'reset_password', userId, username });
    };

    const handleChangeRole = (userId: number, username: string, newRole: string) => {
        setStaffActionModal({ type: 'change_role', userId, username, newRole });
    };

    const executeStaffAction = async () => {
        if (!staffActionModal) return;
        const { type, userId, newRole } = staffActionModal;
        
        if (type === 'create_account') {
            setIsSubmitting(true);
            try {
                const res = await api.post(`/api/admin/staff-management/`, staffForm);
                if (res.status >= 200 && res.status < 300) {
                    setCreatedCredentials({
                        username: staffForm.username,
                        password: staffForm.password,
                        role: staffForm.role === 'CAPTAIN' ? 'Punong Barangay' : staffForm.role,
                    });
                    setStaffForm({ username: "", email: "", password: "", role: "STAFF" });
                    fetchData();
                } else {
                    setActionFeedback({ title: "Error", message: res.data.error || "An error occurred.", type: "error" });
                }
            } catch (error: any) {
                setActionFeedback({ title: "Error", message: error.response?.data?.error || "Failed to create staff account.", type: "error" });
            } finally {
                setIsSubmitting(false);
                setStaffActionModal(null);
            }
            return;
        }

        try {
            let payload: any = { user_id: userId, action_type: type };
            if (type === 'reset_password') {
                if (!resetPasswordInput) return setActionFeedback({ title: "Warning", message: "Password is required", type: "warning" });
                if (resetPasswordInput !== resetPasswordConfirmInput) return setActionFeedback({ title: "Warning", message: "Passwords do not match", type: "warning" });
                payload.new_password = resetPasswordInput;
            }
            if (type === 'change_role') {
                payload.new_role = newRole;
            }

            const res = await api.patch(`/api/admin/staff-management/`, payload);
            if (res.status >= 200 && res.status < 300) {
                if (type === 'reset_password') {
                    setActionFeedback({ title: "Success", message: res.data.message || "Password reset successfully.", type: "success" });
                } else if (type === 'delete_account') {
                    setActionFeedback({ title: "Success", message: "Account deleted successfully.", type: "success" });
                } else if (type === 'toggle_status') {
                    setActionFeedback({ title: "Success", message: res.data.message || "Status updated successfully.", type: "success" });
                }
                fetchData();
            } else {
                setActionFeedback({ title: "Error", message: res.data.error || "An error occurred.", type: "error" });
            }
        } catch (error: any) {
            setActionFeedback({ title: "Error", message: error.response?.data?.error || "An error occurred.", type: "error" });
        } finally {
            setStaffActionModal(null);
        }
    };

    const handleSettingsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmSettingsModal(true);
    };

    const executeSettingsSave = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(settingsForm).forEach(([key, value]) => {
                if ((key === 'captain_image' || key === 'barangay_seal') && value instanceof File) {
                    formData.append(key, value);
                } else if ((key === 'captain_image' || key === 'barangay_seal') && (value === null || value === '')) {
                    formData.append(key, '');
                } else if (key !== 'captain_image' && key !== 'barangay_seal') {
                    formData.append(key, String(value ?? ''));
                }
            });
            const res = await api.post(`/api/system/settings/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const data = res.data;
            if ((res.status >= 200 && res.status < 300)) { 
                setActionFeedback({ title: "Success", message: data.message || "System settings updated successfully.", type: "success" }); 
                fetchData(); 
                refreshSettings();
            } else { 
                setActionFeedback({ title: "Error", message: data.error || JSON.stringify(data), type: "error" }); 
            }
        } catch (error: any) { 
            setActionFeedback({ title: "Error", message: error.response?.data?.error || "Failed to update settings.", type: "error" }); 
        } finally { 
            setIsSubmitting(false); 
            setConfirmSettingsModal(false);
        }
    };

    const executeSnapshot = async () => {
        setIsSubmitting(true);
        try {
            const res = await api.post('/api/admin/force-snapshot/');
            if (res.status === 200) {
                setActionFeedback({ title: "Success", message: "Demographic snapshot generated successfully!", type: "success" });
            } else {
                setActionFeedback({ title: "Error", message: "Error generating snapshot.", type: "error" });
            }
        } catch (error: any) {
            setActionFeedback({ title: "Error", message: error.response?.data?.error || "Error generating snapshot.", type: "error" });
        } finally {
            setIsSubmitting(false);
            setConfirmSnapshotModal(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm";
    const cardClass = "bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 overflow-hidden";

    if (!isAuthorized && !isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#f8fafc]">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 text-sm">You do not have administrative clearance to view this hub.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8fafc] text-gray-800 font-sans">
                    <div className="w-full space-y-8">
                        
                        {/* Header & Tabs */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Command Center</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage personnel, monitor system activity, and configure global settings.</p>
                            </div>
                            
                            {/* Modern Segmented Control Tabs */}
                            <div className="inline-flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50 w-fit">
                                <button 
                                    onClick={() => setActiveTab('staff')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Personnel
                                </button>
                                <button 
                                    onClick={() => setActiveTab('logs')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Audit Logs
                                </button>
                                <button 
                                    onClick={() => setActiveTab('settings')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Settings
                                </button>
                                <button 
                                    onClick={() => setActiveTab('faqs')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'faqs' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <span>AI Knowledge & FAQs</span>
                                    {faqs.length > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'faqs' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {faqs.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* STAFF TAB CONTENT */}
                        {activeTab === 'staff' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Registration Form */}
                                <div className={`lg:col-span-1 h-fit ${cardClass}`}>
                                    <div className="px-6 py-5 border-b border-gray-50">
                                        <h3 className="text-base font-bold text-gray-900">Register Staff</h3>
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleStaffSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role Assignment</label>
                                                <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className={inputClass}>
                                                    {CREATABLE_ROLES.map(r => (
                                                        <option key={r.value} value={r.value} disabled={r.value === 'CAPTAIN' && hasActiveCaptain}>
                                                            {r.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                                                <input type="text" required value={staffForm.username} onChange={(e) => setStaffForm({...staffForm, username: e.target.value})} className={inputClass} placeholder="jdelacruz_tanod" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Email</label>
                                                <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} className={inputClass} placeholder="official@email.com" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Temporary Password</label>
                                                    <button
                                                        type="button"
                                                        onClick={generateRandomPassword}
                                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                                                    >
                                                        🎲 Auto-Generate
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={staffForm.password} 
                                                    onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} 
                                                    className={inputClass} 
                                                    placeholder="Enter or generate temporary password" 
                                                />
                                            </div>
                                            <button type="submit" disabled={isSubmitting} className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">
                                                {isSubmitting ? "Processing..." : "Create Account"}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Staff Directory Table */}
                                <div className={`lg:col-span-2 flex flex-col h-full max-h-[600px] ${cardClass}`}>
                                    <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                        <h3 className="text-base font-bold text-gray-900">Active Personnel</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">User Details</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Role</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Status</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {staffList.map((staff) => (
                                                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                             <div className="font-semibold text-gray-900">{staff.username}</div>
                                                             <div className="text-xs text-gray-500 mt-0.5">{staff.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                             <span className="font-bold text-gray-700 text-xs tracking-wide uppercase">
                                                                 {staff.role.toUpperCase() === 'CAPTAIN' ? 'Punong Barangay' : staff.role}
                                                             </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                             <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${staff.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                                 {staff.is_active ? 'Active' : 'Revoked'}
                                                             </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2">
                                                             {staff.role.toUpperCase() !== 'ADMIN' && (
                                                                 <>
                                                                     <button onClick={() => handleDeleteAccount(staff.id, staff.username)} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-md transition-colors shadow-sm">
                                                                         Delete
                                                                     </button>
                                                                     <button onClick={() => handleResetPassword(staff.id, staff.username)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors shadow-sm">
                                                                         Reset Pw
                                                                     </button>
                                                                     <button onClick={() => handleToggleStatus(staff.id, staff.username)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-sm ${staff.is_active ? 'text-red-700 bg-white border border-red-200 hover:bg-red-50' : 'text-green-700 bg-white border border-green-200 hover:bg-green-50'}`}>
                                                                         {staff.is_active ? 'Revoke' : 'Restore'}
                                                                     </button>
                                                                 </>
                                                             )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LOGS TAB CONTENT */}
                        {activeTab === 'logs' && (
                            <div className={`flex flex-col h-full max-h-[700px] ${cardClass}`}>
                                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                    <h3 className="text-base font-bold text-gray-900">System Activity Logs</h3>
                                    <button onClick={fetchLogs} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1.5 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Sync Latest
                                    </button>
                                </div>
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center shrink-0">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Action:</label>
                                        <select value={logActionFilter} onChange={e => {setLogActionFilter(e.target.value); setLogPage(1);}} className="text-sm border-gray-200 rounded-md py-1.5 px-3 bg-white">
                                            <option value="">All Actions</option>
                                            <option value="Created">Created</option>
                                            <option value="Updated">Updated</option>
                                            <option value="Deleted">Deleted</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Module:</label>
                                        <select value={logModelFilter} onChange={e => {setLogModelFilter(e.target.value); setLogPage(1);}} className="text-sm border-gray-200 rounded-md py-1.5 px-3 bg-white">
                                            <option value="">All Modules</option>
                                            <option value="Resident">Residents</option>
                                            <option value="UserProfile">User Profiles</option>
                                            <option value="BarangayOfficial">Barangay Council</option>
                                            <option value="OfficialTab">Council Tabs</option>
                                            <option value="BarangayFAQ">AI Knowledge & FAQs</option>
                                            <option value="EmergencyContact">Emergency Contacts</option>
                                            <option value="BarangaySettings">System Settings</option>
                                            <option value="Announcement">Announcements</option>
                                            <option value="Event">Calendar Events</option>
                                            <option value="OfficialDocument">Documents & Records</option>
                                            <option value="Household">Geomapping & Households</option>
                                            <option value="SessionLog">Login Sessions</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-1">
                                        <input type="text" placeholder="Search by username..." value={logUserFilter} onChange={e => {setLogUserFilter(e.target.value); setLogPage(1);}} className="text-sm border border-gray-200 rounded-md py-1.5 px-3 w-full max-w-xs" />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Timestamp</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">User</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Action</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Target Object</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Delta Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {logs.map((log, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{new Date(log.date).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{log.user}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${log.action === 'Created' ? 'text-green-700 bg-green-50 border-green-200/60' : log.action === 'Updated' ? 'text-blue-700 bg-blue-50 border-blue-200/60' : log.action === 'Session Event' ? 'text-purple-700 bg-purple-50 border-purple-200/60' : 'text-red-700 bg-red-50 border-red-200/60'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700 font-medium"><div className="font-semibold text-gray-900">{log.target}</div><div className="text-gray-400 text-xs font-normal">{log.model}</div></td>
                                                    <td className="px-6 py-4 text-xs font-mono text-gray-500 max-w-sm truncate hover:whitespace-normal hover:break-words cursor-help" title={log.details}>
                                                        {log.details}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
                                    <span className="text-sm text-gray-500 font-semibold">Page {logPage} of {logTotalPages}</span>
                                    <div className="flex gap-2">
                                        <button disabled={logPage <= 1} onClick={() => setLogPage(p => Math.max(1, p - 1))} className="px-4 py-1.5 text-sm font-semibold border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-gray-700">Previous</button>
                                        <button disabled={logPage >= logTotalPages} onClick={() => setLogPage(p => p + 1)} className="px-4 py-1.5 text-sm font-semibold border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-gray-700">Next</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SETTINGS TAB CONTENT */}
                        {activeTab === 'settings' && (
                            <div className={`w-full ${cardClass}`}>
                                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Global Configuration</h3>
                                        <p className="text-sm text-gray-500 mt-1">Updates to these values reflect instantly across the resident dashboard and official documents.</p>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleSettingsSubmit} className="space-y-8">
                                        
                                        {/* Identity & Metadata Group */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                Barangay Identity & Metadata
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Name</label>
                                                    <input type="text" required value={settingsForm.barangay_name} onChange={(e) => setSettingsForm({...settingsForm, barangay_name: e.target.value})} className={inputClass} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Punong Barangay</label>
                                                    <input type="text" required value={settingsForm.captain_name} onChange={(e) => setSettingsForm({...settingsForm, captain_name: e.target.value})} className={inputClass} placeholder="e.g. Juan Dela Cruz" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Secretary</label>
                                                    <input type="text" value={settingsForm.secretary_name || ""} onChange={(e) => setSettingsForm({...settingsForm, secretary_name: e.target.value})} className={inputClass} placeholder="e.g. Maica Ann M. Mendoza" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hall Address</label>
                                                    <input type="text" required value={settingsForm.barangay_hall_address} onChange={(e) => setSettingsForm({...settingsForm, barangay_hall_address: e.target.value})} className={inputClass} placeholder="Main St." />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Email</label>
                                                    <input type="email" required value={settingsForm.official_contact_email} onChange={(e) => setSettingsForm({...settingsForm, official_contact_email: e.target.value})} className={inputClass} placeholder="official@email.com" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Phone Number</label>
                                                    <input type="text" required value={settingsForm.official_contact_number} onChange={(e) => setSettingsForm({...settingsForm, official_contact_number: e.target.value})} className={inputClass} placeholder="09123456789" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Seal URL</label>
                                                    <input type="text" value={settingsForm.barangay_seal_url} onChange={(e) => setSettingsForm({...settingsForm, barangay_seal_url: e.target.value})} className={inputClass} placeholder="https://..." />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Feature Toggles / Kill-Switches */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                System Capabilities & Kill-Switches
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* AI Chatbot Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-gray-900">Enable AI Chatbot</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Allow residents to ask questions via Gemini AI.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.ai_chatbot_enabled} onChange={(e) => setSettingsForm({...settingsForm, ai_chatbot_enabled: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.ai_chatbot_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.ai_chatbot_enabled ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>

                                                {/* Maintenance Mode Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-red-600">Maintenance Mode</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Locks out standard residents with maintenance banner.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.maintenance_mode} onChange={(e) => setSettingsForm({...settingsForm, maintenance_mode: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.maintenance_mode ? 'bg-red-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.maintenance_mode ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Operating Hours & Public Advisory Banner */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-amber-600" />
                                                Operating Hours & Emergency Advisory Alert Banner
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-1">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                        Official Operating Hours
                                                    </label>
                                                    <textarea 
                                                        rows={3}
                                                        value={settingsForm.operating_hours || ""} 
                                                        onChange={(e) => setSettingsForm({...settingsForm, operating_hours: e.target.value})} 
                                                        className={`${inputClass} font-mono text-xs`} 
                                                        placeholder="e.g. Monday – Friday: 8:00 AM – 5:00 PM&#10;Saturday: 8:00 AM – 12:00 PM (Emergency Desk)&#10;Sunday: Closed" 
                                                    />
                                                    <p className="text-[11px] text-gray-400 mt-1">Displayed in the resident portal About section and fed directly into the Gemini AI Assistant.</p>
                                                </div>

                                                <div className="md:col-span-1 space-y-3">
                                                    <label className="flex items-center justify-between cursor-pointer p-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                        <div className="pr-4">
                                                            <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                                Show Advisory Banner
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">High-visibility banner across all portal pages & highlighted in AI chat.</div>
                                                        </div>
                                                        <div className="relative shrink-0">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only" 
                                                                checked={!!settingsForm.show_advisory_banner} 
                                                                onChange={(e) => setSettingsForm({...settingsForm, show_advisory_banner: e.target.checked})} 
                                                            />
                                                            <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.show_advisory_banner ? 'bg-amber-600' : 'bg-gray-200'}`}></div>
                                                            <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.show_advisory_banner ? 'transform translate-x-5' : ''}`}></div>
                                                        </div>
                                                    </label>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                            Public Advisory Message
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            value={settingsForm.advisory_banner_text || ""} 
                                                            onChange={(e) => setSettingsForm({...settingsForm, advisory_banner_text: e.target.value})} 
                                                            className={inputClass} 
                                                            placeholder="e.g. ⚠️ ADVISORY: Barangay Hall operations suspended today due to Typhoon Signal #2. Hotline: 0912-345-6789" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Homepage Content Group */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                Resident Homepage Content
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                        Punong Barangay Profile Photo
                                                    </label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                            {(photoPreview || (typeof settingsForm.captain_image === 'string' && settingsForm.captain_image)) ? (
                                                                <img 
                                                                    src={photoPreview || (typeof settingsForm.captain_image === 'string' ? (settingsForm.captain_image.startsWith('http') ? settingsForm.captain_image : `${API_URL}${settingsForm.captain_image}`) : '')} 
                                                                    alt="Punong Barangay Preview" 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Camera className="w-7 h-7 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                                                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                                                    <span>Upload Photo</span>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/jpeg,image/png,image/webp" 
                                                                        onChange={handlePhotoUpload} 
                                                                        className="hidden" 
                                                                    />
                                                                </label>
                                                                {(photoPreview || settingsForm.captain_image) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleRemovePhoto}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-400">JPG, PNG, or WebP. Max 5MB.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                        Barangay Official Seal / Logo
                                                    </label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
                                                            {(sealPreview || (typeof settingsForm.barangay_seal === 'string' && settingsForm.barangay_seal)) ? (
                                                                <img 
                                                                    src={sealPreview || (typeof settingsForm.barangay_seal === 'string' ? (settingsForm.barangay_seal.startsWith('http') ? settingsForm.barangay_seal : `${API_URL}${settingsForm.barangay_seal}`) : '')} 
                                                                    alt="Barangay Seal Preview" 
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Shield className="w-7 h-7 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                                                                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>Upload Seal</span>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/jpeg,image/png,image/webp,image/svg+xml" 
                                                                        onChange={handleSealUpload} 
                                                                        className="hidden" 
                                                                    />
                                                                </label>
                                                                {(sealPreview || settingsForm.barangay_seal) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleRemoveSeal}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-400">PNG, JPG, SVG, or WebP. Max 5MB.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message from the Punong Barangay</label>
                                                    <textarea value={settingsForm.captain_message || ""} onChange={(e) => setSettingsForm({...settingsForm, captain_message: e.target.value})} className={`${inputClass} min-h-[80px]`} placeholder="Mabuhay at maligayang pagdating..."></textarea>
                                                </div>
                                                
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Classification</label><input type="text" value={settingsForm.barangay_classification || ""} onChange={(e) => setSettingsForm({...settingsForm, barangay_classification: e.target.value})} className={inputClass} placeholder="Urban Barangay" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">City</label><input type="text" value={settingsForm.barangay_city || ""} onChange={(e) => setSettingsForm({...settingsForm, barangay_city: e.target.value})} className={inputClass} placeholder="City of General Trias" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Province</label><input type="text" value={settingsForm.barangay_province || ""} onChange={(e) => setSettingsForm({...settingsForm, barangay_province: e.target.value})} className={inputClass} placeholder="Cavite" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Region</label><input type="text" value={settingsForm.barangay_region || ""} onChange={(e) => setSettingsForm({...settingsForm, barangay_region: e.target.value})} className={inputClass} placeholder="IV-A CALABARZON" /></div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6">
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">History</label><textarea value={settingsForm.history_text || ""} onChange={(e) => setSettingsForm({...settingsForm, history_text: e.target.value})} className={`${inputClass} min-h-[100px]`} /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location & Geography</label><textarea value={settingsForm.location_geography_text || ""} onChange={(e) => setSettingsForm({...settingsForm, location_geography_text: e.target.value})} className={`${inputClass} min-h-[100px]`} /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Community & Culture</label><textarea value={settingsForm.community_culture_text || ""} onChange={(e) => setSettingsForm({...settingsForm, community_culture_text: e.target.value})} className={`${inputClass} min-h-[100px]`} /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Services & Facilities</label><textarea value={settingsForm.services_facilities_text || ""} onChange={(e) => setSettingsForm({...settingsForm, services_facilities_text: e.target.value})} className={`${inputClass} min-h-[100px]`} /></div>
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-end">
                                            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md">
                                                {isSubmitting ? "Saving..." : "Save Configuration"}
                                            </button>
                                        </div>
                                    </form>
                                    
                                    {/* Database Tools */}
                                    <div className="mt-12 pt-12 border-t-2 border-gray-100 border-dashed">
                                        <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">Database Tools</h3>
                                                <p className="text-sm text-gray-500">Run manual system routines.</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">Force Demographic Snapshot</h4>
                                                <p className="text-xs text-gray-500 mt-1 max-w-md">Manually capture and save the current live census data into the historical tracking database (for Capstone Defense demonstration).</p>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setConfirmSnapshotModal(true)}
                                                className="mt-4 sm:mt-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                            >
                                                Generate Snapshot
                                            </button>
                                        </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* FAQS / AI KNOWLEDGE TAB */}
                        {activeTab === 'faqs' && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
                                {/* Header Banner */}
                                <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/40">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm">
                                                <HelpCircle className="w-5 h-5" />
                                            </span>
                                            <h3 className="text-xl font-bold text-gray-900">AI Knowledge Base & Public FAQs</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                            Configure official fees, requirements, service schedules, and FAQs. These entries are automatically trained into the <strong>Gemini AI Assistant</strong> to provide accurate, grounded responses to residents.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openFaqModal(null)}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Knowledge Article</span>
                                    </button>
                                </div>

                                {/* Filter & Search Toolbar */}
                                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={faqSearch}
                                            onChange={(e) => setFaqSearch(e.target.value)}
                                            placeholder="Search question, answer, or keywords..."
                                            className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        />
                                        {faqSearch && (
                                            <button 
                                                onClick={() => setFaqSearch('')} 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                        {[
                                            { key: 'ALL', label: 'All Articles' },
                                            { key: 'FEES', label: 'Fees & Rates' },
                                            { key: 'SERVICES', label: 'Services & Permits' },
                                            { key: 'EMERGENCY', label: 'Emergency' },
                                            { key: 'SANITATION', label: 'Sanitation' },
                                            { key: 'GENERAL', label: 'General' },
                                        ].map((cat) => (
                                            <button
                                                key={cat.key}
                                                type="button"
                                                onClick={() => setFaqCategoryFilter(cat.key)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                                                    faqCategoryFilter === cat.key
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* FAQs Table / Card List */}
                                <div className="p-4 sm:p-6">
                                    {filteredFaqs.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <h4 className="text-base font-bold text-gray-700">No Knowledge Articles Found</h4>
                                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                                {faqSearch || faqCategoryFilter !== 'ALL'
                                                    ? 'No articles match your search or filter criteria. Try clearing filters.'
                                                    : 'No articles have been created yet. Click "Add Knowledge Article" to create your first FAQ for the AI Assistant.'}
                                            </p>
                                            {(faqSearch || faqCategoryFilter !== 'ALL') && (
                                                <button
                                                    onClick={() => { setFaqSearch(''); setFaqCategoryFilter('ALL'); }}
                                                    className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                                                >
                                                    Reset Filters
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredFaqs.map((faq) => {
                                                const catBadgeColor = 
                                                    faq.category === 'FEES' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    faq.category === 'SERVICES' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    faq.category === 'EMERGENCY' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    faq.category === 'SANITATION' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-purple-50 text-purple-700 border-purple-200';
                                                
                                                return (
                                                    <div 
                                                        key={faq.id} 
                                                        className={`border rounded-xl p-4 sm:p-5 transition-all duration-200 ${
                                                            faq.is_active 
                                                                ? 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm' 
                                                                : 'bg-gray-50/70 border-gray-200 opacity-60'
                                                        }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${catBadgeColor}`}>
                                                                        {faq.category_display || faq.category}
                                                                    </span>
                                                                    <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                        Priority #{faq.order}
                                                                    </span>
                                                                    {!faq.is_active && (
                                                                        <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                                                                            Inactive
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                                                                    {faq.question}
                                                                </h4>
                                                                <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line leading-relaxed">
                                                                    {faq.answer}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                                                                {/* Active Toggle Switch */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleFaqActive(faq)}
                                                                    title={faq.is_active ? "Click to deactivate" : "Click to activate"}
                                                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                                                                        faq.is_active 
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                                                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    {faq.is_active ? 'Active' : 'Disabled'}
                                                                </button>

                                                                {/* Edit Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openFaqModal(faq)}
                                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Edit Article"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>

                                                                {/* Delete Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFaqToDelete(faq)}
                                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete Article"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

            {/* Staff Action Modal */}
            {staffActionModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-scale-in">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${staffActionModal.type === 'delete_account' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${staffActionModal.type === 'delete_account' ? 'text-red-700' : 'text-gray-900'}`}>
                                {staffActionModal.type === 'toggle_status' && 'Confirm Status Change'}
                                {staffActionModal.type === 'delete_account' && 'Confirm Account Deletion'}
                                {staffActionModal.type === 'reset_password' && 'Reset Account Password'}
                                {staffActionModal.type === 'change_role' && 'Confirm Role Change'}
                                {staffActionModal.type === 'create_account' && 'Confirm Account Creation'}
                            </h3>
                            <button onClick={() => setStaffActionModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {staffActionModal.type === 'toggle_status' && (
                                <p className="text-sm text-gray-600 mb-4">Are you sure you want to toggle the active status for the account <strong>{staffActionModal.username}</strong>?</p>
                            )}
                            {staffActionModal.type === 'delete_account' && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4">
                                    <p className="text-sm text-red-800"><strong>Warning:</strong> You are about to permanently delete <strong>{staffActionModal.username}</strong>. This action cannot be undone.</p>
                                </div>
                            )}
                            {staffActionModal.type === 'change_role' && (
                                <p className="text-sm text-gray-600 mb-4">Are you sure you want to change the role of <strong>{staffActionModal.username}</strong> to <strong>{staffActionModal.newRole}</strong>?</p>
                            )}
                            {staffActionModal.type === 'create_account' && (
                                <p className="text-sm text-gray-600 mb-4">Are you sure you want to create a new <strong>{staffActionModal.newRole}</strong> account for <strong>{staffActionModal.username}</strong>?</p>
                            )}
                            {staffActionModal.type === 'reset_password' && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-3">Please enter the new temporary password for <strong>{staffActionModal.username}</strong>:</p>
                                    <input 
                                        type="password"
                                        value={resetPasswordInput}
                                        onChange={(e) => setResetPasswordInput(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-3"
                                        placeholder="New Password"
                                        autoFocus
                                    />
                                    <input 
                                        type="password"
                                        value={resetPasswordConfirmInput}
                                        onChange={(e) => setResetPasswordConfirmInput(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="Confirm New Password"
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setStaffActionModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={executeStaffAction} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${staffActionModal.type === 'delete_account' ? 'bg-red-600 hover:bg-red-700 shadow-sm' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}`}>
                                    {staffActionModal.type === 'delete_account' ? 'Yes, Delete' : 'Confirm Action'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {actionFeedback && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-scale-in text-center p-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${actionFeedback.type === 'success' ? 'bg-green-100 text-green-600' : actionFeedback.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            {actionFeedback.type === 'success' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            {actionFeedback.type === 'error' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                            {actionFeedback.type === 'warning' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{actionFeedback.title}</h3>
                        <p className="text-sm text-gray-600 mb-6">{actionFeedback.message}</p>
                        <button onClick={() => setActionFeedback(null)} className="w-full px-4 py-2 text-sm font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Created Staff Credentials Card Modal */}
            {createdCredentials && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 text-center animate-scale-in">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Check className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Staff Account Created</h3>
                        <p className="text-xs text-gray-500 mb-5">
                            Share these temporary credentials with the official. They are required to set a permanent password upon first login.
                        </p>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 mb-6">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-semibold uppercase">Role:</span>
                                <span className="font-bold text-gray-900">{createdCredentials.role}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-semibold uppercase">Username:</span>
                                <span className="font-mono font-bold text-gray-900">{createdCredentials.username}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-semibold uppercase">Temporary Password:</span>
                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{createdCredentials.password}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const text = `Barangay Portal Credentials:\nRole: ${createdCredentials.role}\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}\n\nPlease sign in and set your new password.`;
                                    navigator.clipboard.writeText(text);
                                    setActionFeedback({
                                        title: "Copied!",
                                        message: "Staff credentials copied to clipboard.",
                                        type: "success"
                                    });
                                }}
                                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Copy className="w-4 h-4 text-gray-500" />
                                <span>Copy Details</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreatedCredentials(null)}
                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Save Configuration Modal */}
            {confirmSettingsModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Save Configuration?</h3>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                            Are you sure you want to update the barangay system settings? Changes will be immediately reflected across the portal.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmSettingsModal(false)}
                                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeSettingsSave}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isSubmitting ? "Saving..." : "Save Configuration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Force Snapshot Modal */}
            {confirmSnapshotModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Generate Demographic Snapshot?</h3>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                            This will capture the current live census data and record it into the historical demographic tracking database.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmSnapshotModal(false)}
                                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeSnapshot}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isSubmitting ? "Generating..." : "Generate Snapshot"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ Add / Edit Modal */}
            {isFaqModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-scale-in">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <HelpCircle className="w-5 h-5" />
                                </span>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingFaq ? "Edit Knowledge Article" : "Add Knowledge Article"}
                                </h3>
                            </div>
                            <button 
                                onClick={closeFaqModal} 
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={executeSaveFaq} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={faqFormData.category}
                                    onChange={(e: any) => setFaqFormData({ ...faqFormData, category: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="FEES">Fees & Rates (Clearance, Indigency, Residency)</option>
                                    <option value="SERVICES">Services & Permits (Requirements & Steps)</option>
                                    <option value="EMERGENCY">Emergency Procedures & Hotlines</option>
                                    <option value="SANITATION">Waste Collection & Sanitation</option>
                                    <option value="GENERAL">General Information & Schedules</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Question / Inquiry Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={faqFormData.question}
                                    onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                                    placeholder="e.g. Magkano ang Barangay Clearance para sa Trabaho?"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Official Answer / AI Guidance
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    value={faqFormData.answer}
                                    onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                                    placeholder="e.g. Ang bayad sa Barangay Clearance para sa Employment ay ₱50.00. Libre ito para sa mga First-Time Jobseekers alinsunod sa RA 11261. Dalhin ang 1 Valid ID at Proof of Billing."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Provide clear fees, requirements, and exemptions. The AI will strictly ground its responses on this text.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                        Display Priority Order
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={faqFormData.order}
                                        onChange={(e) => setFaqFormData({ ...faqFormData, order: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={faqFormData.is_active}
                                            onChange={(e) => setFaqFormData({ ...faqFormData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Active (Visible to AI)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeFaqModal}
                                    className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingFaq}
                                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSavingFaq ? "Saving..." : (editingFaq ? "Update Article" : "Save Article")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FAQ Delete Confirmation Modal */}
            {faqToDelete && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Knowledge Article?</h3>
                        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            Are you sure you want to delete <strong>"{faqToDelete.question}"</strong>? The AI chatbot will no longer use this article for resident inquiries.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFaqToDelete(null)}
                                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeDeleteFaq}
                                disabled={isDeletingFaq}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isDeletingFaq ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface Announcement {
    id: number;
    title: string;
    content: string;
    categories: string[];
    is_urgent: boolean;
    tags: string;
    attachment: string | null;
    linked_event: number | null;
    linked_event_details?: {
        start_time: string;
        end_time: string;
    } | null;
    created_at: string;
    author_name: string;
}

const CATEGORY_OPTIONS = ['Announcement', 'Emergency', 'Event', 'Welfare', 'Services', 'SK', 'PWD'];

export default function Announcements() {
    const auth = useContext(AuthContext);
    
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [canCreate, setCanCreate] = useState<boolean>(false);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    
    // Core Announcement Data
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        categories: [] as string[],
        is_urgent: false,
        attachment: null as File | null,
    });

    // Tag System State
    const [tagInput, setTagInput] = useState("");
    const [tagsList, setTagsList] = useState<string[]>([]);

    // Inline Event Schedule State
    const [hasEvent, setHasEvent] = useState<boolean>(false);
    const [eventData, setEventData] = useState({
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: ""
    });

    // 1. Initial Data Fetch & Permission Check
    useEffect(() => {
        let extractedRole = "";
        try {
            const token = localStorage.getItem('access');
            if (token && token !== "null" && token !== "undefined") {
                const payload = JSON.parse(atob(token.split('.')[1]));
                extractedRole = payload.role || payload.roles || "";
            }
        } catch (e) {
            console.error("Token decoding failed", e);
        }
        if (!extractedRole && auth?.user) {
            const contextUser = auth.user as any;
            extractedRole = contextUser.role || contextUser.roles || "";
        }

        const userRole = (Array.isArray(extractedRole) ? extractedRole[0] : extractedRole).toUpperCase();
        const authorizedRoles = ['ADMIN', 'STAFF', 'SECRETARY', 'CAPTAIN', 'COUNCIL', 'TREASURER', 'SK'];
        setCanCreate(authorizedRoles.includes(userRole));

        fetchData();
    }, [auth]);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('access');
        
        // Build headers dynamically. Only add Authorization if a real token exists.
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        
        if (token && token !== "null" && token !== "undefined") {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_URL}/api/announcements/`, {
                headers: headers
            });
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.results || data);
            } else {
                console.error("Failed to fetch announcements. Status:", res.status);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Form Handlers
    const handleCategoryToggle = (category: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim().replace(/^#/, '');
            if (newTag && !tagsList.includes(newTag)) {
                setTagsList([...tagsList, newTag]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTagsList(tagsList.filter(tag => tag !== tagToRemove));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData(prev => ({ ...prev, attachment: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('access');
        let createdEventId = null;

        try {
            if (hasEvent && eventData.startDate && eventData.startTime && eventData.endDate && eventData.endTime) {
                const startDateTime = `${eventData.startDate}T${eventData.startTime}`;
                const endDateTime = `${eventData.endDate}T${eventData.endTime}`;

                const eventPayload = {
                    title: formData.title,
                    event_type: 'ACTIVITY', 
                    description: formData.content,
                    start_time: startDateTime,
                    end_time: endDateTime
                };

                const eventRes = await fetch(`${API_URL}/api/events/`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(eventPayload)
                });

                if (!eventRes.ok) throw new Error("Failed to create calendar event");
                const newEvent = await eventRes.json();
                createdEventId = newEvent.id;
            }

            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('content', formData.content);
            submitData.append('categories', JSON.stringify(formData.categories)); 
            submitData.append('is_urgent', formData.is_urgent ? 'true' : 'false');
            
            if (tagsList.length > 0) {
                submitData.append('tags', tagsList.join(', '));
            }
            if (createdEventId) {
                submitData.append('linked_event', createdEventId.toString());
            }
            if (formData.attachment) {
                submitData.append('attachment', formData.attachment);
            }

            const response = await fetch(`${API_URL}/api/announcements/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, 
                body: submitData
            });

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({ title: "", content: "", categories: [], is_urgent: false, attachment: null });
                setTagsList([]);
                setHasEvent(false);
                setEventData({ startDate: "", startTime: "", endDate: "", endTime: "" });
                fetchData(); 
            } else {
                const errorData = await response.json();
                alert(`Failed to post: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("An error occurred while posting the announcement.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800 relative">
            
            <div className="flex flex-1 overflow-hidden">
                
                
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa] text-gray-800">
                    <div className="max-w-4xl mx-auto">
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Barangay Announcements</h1>
                                <p className="text-gray-500 text-sm mt-1">Stay updated with the latest news, events, and advisories.</p>
                            </div>
                            {canCreate && (
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Create Announcement
                                </button>
                            )}
                        </div>

                        {/* Announcement Feed */}
                        <div className="space-y-6">
                            {isLoading ? (
                                <div className="text-center py-10 text-gray-500">Loading announcements...</div>
                            ) : announcements.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-500">
                                    No announcements available at this time.
                                </div>
                            ) : (
                                announcements.map((ann) => (
                                    <div key={ann.id} className={`bg-white rounded-xl shadow-sm border ${ann.is_urgent ? 'border-red-400 shadow-red-50' : 'border-gray-200'} overflow-hidden`}>
                                        
                                        <div className="p-6">
                                            {/* Category & Tags Row (Displayed Near The Top) */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {ann.categories && ann.categories.map((cat, i) => (
                                                    <span key={`cat-${i}`} className="px-3 py-1 bg-green-100 text-green-800 text-[11px] font-bold rounded-full uppercase tracking-wider">
                                                        {cat}
                                                    </span>
                                                ))}
                                                {ann.tags && ann.tags.split(',').map((tag, i) => (
                                                    <span key={`tag-${i}`} className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full border border-gray-200">
                                                        #{tag.trim()}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Title & Urgent Badge */}
                                            <div className="flex items-center gap-2 mb-3">
                                                {ann.is_urgent && (
                                                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-sm tracking-wide">Urgent</span>
                                                )}
                                                <h2 className="text-2xl font-bold text-gray-900">{ann.title}</h2>
                                            </div>

                                            {/* Event Schedule Badges (If Linked) */}
                                            {ann.linked_event_details && (
                                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-800 text-white text-xs font-semibold rounded-md shadow-sm">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        Starts: {ann.linked_event_details.start_time.replace('T', ' ')}
                                                    </div>
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-900 text-xs font-semibold rounded-md border border-green-200">
                                                        <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Ends: {ann.linked_event_details.end_time.replace('T', ' ')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Content */}
                                            <p className="text-gray-700 whitespace-pre-wrap mb-6 text-base leading-relaxed">{ann.content}</p>
                                            
                                            {/* Inline Media Rendering (Images/Videos shown directly) */}
                                            {ann.attachment && (
                                                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-h-96 flex justify-center">
                                                    {ann.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                        <img src={ann.attachment} alt="Announcement Attachment" className="max-h-96 w-auto object-contain" />
                                                    ) : ann.attachment.match(/\.(mp4|webm|ogg)$/i) ? (
                                                        <video controls className="max-h-96 w-full">
                                                            <source src={ann.attachment} />
                                                            Your browser does not support the video tag.
                                                        </video>
                                                    ) : (
                                                        <a href={ann.attachment} target="_blank" rel="noreferrer" className="p-4 inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-900 font-semibold">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            Download Attached Document
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Footer Info */}
                                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                <span>Posted: {new Date(ann.created_at).toISOString().split('T')[0]}</span>
                                                <span>By {ann.author_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Announcement Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                        
                        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-xl font-bold text-gray-900">Post Announcement</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 bg-white">
                            <form id="announcement-form" onSubmit={handleSubmit} className="space-y-6">
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Title <span className="text-red-500">*</span></label>
                                    <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 placeholder-gray-400" placeholder="Announcement title" />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Content <span className="text-red-500">*</span></label>
                                    <textarea required rows={5} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 placeholder-gray-400 resize-none" placeholder="Write the announcement details..."></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Categories <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <label key={cat} className={`px-4 py-1.5 border rounded-full text-xs font-semibold cursor-pointer transition-colors ${formData.categories.includes(cat) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={formData.categories.includes(cat)} onChange={() => handleCategoryToggle(cat)} />
                                                {cat}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Event Schedule Block */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input type="checkbox" id="hasEvent" checked={hasEvent} onChange={(e) => setHasEvent(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer" />
                                        <label htmlFor="hasEvent" className="text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer">Event Schedule <span className="text-gray-400 normal-case font-normal tracking-normal">(optional)</span></label>
                                    </div>

                                    {hasEvent && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                                                <input type="date" required={hasEvent} value={eventData.startDate} onChange={e => setEventData({...eventData, startDate: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-700" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                                                <input type="time" required={hasEvent} value={eventData.startTime} onChange={e => setEventData({...eventData, startTime: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-700" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                                                <input type="date" required={hasEvent} value={eventData.endDate} onChange={e => setEventData({...eventData, endDate: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-700" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                                                <input type="time" required={hasEvent} value={eventData.endTime} onChange={e => setEventData({...eventData, endTime: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-700" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tagsList.map(tag => (
                                            <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </span>
                                        ))}
                                    </div>
                                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" placeholder="Type a tag and press Enter" />
                                </div>

                                {/* Urgent Toggle */}
                                <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${formData.is_urgent ? 'bg-red-600' : 'bg-gray-200'}`}>
                                        <input type="checkbox" className="hidden" checked={formData.is_urgent} onChange={e => setFormData({...formData, is_urgent: e.target.checked})} />
                                        {formData.is_urgent && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="text-sm font-bold text-red-600">Mark as Urgent</span>
                                </label>

                                {/* Attach Media Upload Box */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Attach Media <span className="text-gray-400 font-normal text-xs">(image, GIF, or video)</span></label>
                                    <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors p-8 text-center cursor-pointer group">
                                        <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,video/*" />
                                        <div className="flex flex-col items-center">
                                            <svg className="w-8 h-8 text-gray-400 mb-2 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <p className="text-sm font-semibold text-gray-700">Click to upload image, GIF, or video</p>
                                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{formData.attachment ? formData.attachment.name : 'JPG, PNG, GIF, MP4, WEBM'}</p>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>
                        
                        <div className="px-8 py-5 border-t border-gray-100 bg-white flex gap-4 shrink-0 justify-between items-center">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 w-1/3 bg-gray-200 text-gray-800 text-sm font-bold rounded-lg hover:bg-gray-300 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="announcement-form" disabled={isSubmitting || formData.categories.length === 0} className="px-6 py-3 w-2/3 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center shadow-md">
                                {isSubmitting ? "Processing..." : "Post Announcement"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
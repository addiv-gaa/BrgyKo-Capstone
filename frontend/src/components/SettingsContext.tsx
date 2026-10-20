import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

export interface BarangaySettings {
    id?: number;
    barangay_name: string;
    captain_name: string;
    secretary_name?: string;
    barangay_hall_address: string;
    official_contact_email: string;
    official_contact_number: string;
    barangay_seal?: string | null;
    barangay_seal_url?: string | null;
    emergency_hotline: string;
    police_hotline: string;
    fire_hotline: string;
    captain_image?: string | null;
    captain_message?: string;
    captain_message_title?: string;
    barangay_classification?: string;
    barangay_city?: string;
    barangay_province?: string;
    barangay_region?: string;
    number_of_puroks?: string;
    operating_hours?: string;
    show_advisory_banner?: boolean;
    advisory_banner_text?: string;
    history_text?: string;
    location_geography_text?: string;
    community_culture_text?: string;
    services_facilities_text?: string;
    ai_chatbot_enabled?: boolean;
    accept_permit_requests?: boolean;
    accept_reservations?: boolean;
    maintenance_mode?: boolean;
}

interface SettingsContextType {
    settings: BarangaySettings | null;
    loading: boolean;
    refreshSettings: () => Promise<BarangaySettings | null>;
    getSealUrl: (path?: string | null) => string;
}

const defaultSettings: BarangaySettings = {
    barangay_name: "Barangay San Gabriel",
    captain_name: "Punong Barangay",
    barangay_hall_address: "Barangay Hall",
    official_contact_email: "official@barangay.gov.ph",
    official_contact_number: "09123456789",
    barangay_classification: "Urban Barangay",
    barangay_city: "City of General Trias",
    barangay_province: "Cavite",
    barangay_region: "IV-A CALABARZON",
    emergency_hotline: "911",
    police_hotline: "117",
    fire_hotline: "112",
    operating_hours: "Monday – Friday: 8:00 AM – 5:00 PM",
    show_advisory_banner: false,
    advisory_banner_text: "",
};

export const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    loading: true,
    refreshSettings: async () => null,
    getSealUrl: () => '/b4-logo.jpg',
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BarangaySettings | null>(defaultSettings);
    const [loading, setLoading] = useState<boolean>(true);

    const getSealUrl = useCallback((path?: string | null): string => {
        const seal = path !== undefined ? path : settings?.barangay_seal;
        if (!seal) {
            // Also check legacy barangay_seal_url
            if (settings?.barangay_seal_url && settings.barangay_seal_url.trim()) {
                const legacy = settings.barangay_seal_url.trim();
                return legacy.startsWith('http') ? legacy : `${API_URL}${legacy}`;
            }
            return '/b4-logo.jpg';
        }
        if (seal.startsWith('http')) return seal;
        return `${API_URL}${seal.startsWith('/') ? seal : `/${seal}`}`;
    }, [settings?.barangay_seal, settings?.barangay_seal_url]);

    const fetchSettings = useCallback(async (): Promise<BarangaySettings | null> => {
        try {
            const res = await api.get('/api/system/settings/');
            if (res.status >= 200 && res.status < 300) {
                setSettings(res.data);
                return res.data;
            }
        } catch (error) {
            console.error("Error loading system settings:", error);
        } finally {
            setLoading(false);
        }
        return null;
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, getSealUrl }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

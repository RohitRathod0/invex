'use client';


import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { getUserId } from './auth';
import { apiGet } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserContext {
    risk_score: number;
    risk_label: string;
    horizon_years: number;
    loss_tolerance_pct: number;
    income_stability: string;
    dependents: number;
    liabilities: string[];
    excluded_sectors: string[];
    preferred_sectors: string[];
    emergency_fund_months: number;
    profile_version: number;
    last_updated: string;
    dimension_scores: Record<string, number>;
    cached_at?: string;
}

interface UserContextValue {
    profile: UserContext | null;
    loading: boolean;
    hasProfile: boolean;
    refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<UserContextValue>({
    profile: null,
    loading: true,
    hasProfile: false,
    refresh: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<UserContext | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const userId = getUserId();
            if (!userId) {
                setProfile(null);
                setLoading(false);
                return;
            }

            // Use the authenticated wrapper instead of raw fetch
            const res = await apiGet(`/api/v1/risk/profile/${userId}`);
            
            if (res.ok) {
                const data = await res.json();
                if (data.exists && data.user_context) {
                    setProfile(data.user_context as UserContext);
                } else {
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
        } catch {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return (
        <Ctx.Provider value={{
            profile,
            loading,
            hasProfile: !!profile,
            refresh: fetchProfile,
        }}>
            {children}
        </Ctx.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserContext() {
    return useContext(Ctx);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a human-readable risk label for display */
export function formatRiskLabel(label: string): string {
    const map: Record<string, string> = {
        conservative:         'Conservative',
        moderate_conservative: 'Moderate Conservative',
        moderate:             'Moderate',
        moderate_aggressive:  'Moderate Aggressive',
        aggressive:           'Aggressive',
    };
    return map[label] ?? label;
}

/** Returns a color hex for the risk label */
export function riskLabelColor(label: string): string {
    const map: Record<string, string> = {
        conservative:         '#10B981',
        moderate_conservative: '#3B82F6',
        moderate:             '#F59E0B',
        moderate_aggressive:  '#F97316',
        aggressive:           '#EF4444',
    };
    return map[label] ?? '#9CA3AF';
}

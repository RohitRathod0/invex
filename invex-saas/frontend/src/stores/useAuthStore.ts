import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    age: string;
    phone: string;
}

export interface User {
    id: string;
    name: string;          // firstName + lastName from profile
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    age?: string;
    avatar?: string;
    provider: 'google' | 'phone';
    initials: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    otpSent: boolean;
    otpPhone: string;
    // Profile completion — set true after social auth, cleared when profile is saved
    needsProfile: boolean;
    pendingGoogleEmail: string;   // prefill email field on profile form

    // Actions
    loginWithGoogle: () => Promise<void>;
    sendOtp: (phone: string) => Promise<void>;
    verifyOtp: (otp: string) => Promise<void>;
    completeProfile: (profile: UserProfile, provider: 'google' | 'phone') => void;
    logout: () => void;
    clearError: () => void;
    cancelOtp: () => void;
}

function getInitials(first: string, last: string) {
    return ((first[0] || '') + (last[0] || '')).toUpperCase();
}

// Simulate Google OAuth popup — in production replace with Firebase / Google Identity Services SDK
async function simulateGoogleOAuth(): Promise<{ email: string }> {
    await new Promise(r => setTimeout(r, 1500));
    // Returns only email from Google (name/age/phone collected in profile form)
    return { email: 'rohit.rathod@gmail.com' };
}

// Simulate OTP send — in production use Twilio/Firebase Phone Auth
async function simulateSendOtp(phone: string): Promise<void> {
    await new Promise(r => setTimeout(r, 900));
    console.log(`[DEV] OTP sent to ${phone}: 123456`);
}

async function simulateVerifyOtp(otp: string): Promise<void> {
    await new Promise(r => setTimeout(r, 900));
    if (otp !== '123456') throw new Error('Invalid OTP. Please try again.');
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            otpSent: false,
            otpPhone: '',
            needsProfile: false,
            pendingGoogleEmail: '',

            loginWithGoogle: async () => {
                set({ isLoading: true, error: null });
                try {
                    const { email } = await simulateGoogleOAuth();
                    // Don't set authenticated yet — need profile
                    set({ isLoading: false, needsProfile: true, pendingGoogleEmail: email });
                } catch (e: any) {
                    set({ error: e.message || 'Google login failed', isLoading: false });
                }
            },

            sendOtp: async (phone: string) => {
                if (!phone || phone.replace(/\D/g, '').length < 8) {
                    set({ error: 'Please enter a valid phone number.' });
                    return;
                }
                set({ isLoading: true, error: null });
                try {
                    await simulateSendOtp(phone);
                    set({ otpSent: true, otpPhone: phone, isLoading: false });
                } catch (e: any) {
                    set({ error: e.message || 'Failed to send OTP', isLoading: false });
                }
            },

            verifyOtp: async (otp: string) => {
                set({ isLoading: true, error: null });
                try {
                    await simulateVerifyOtp(otp);
                    // OTP verified — now ask for profile
                    set({ isLoading: false, needsProfile: true, otpSent: false });
                } catch (e: any) {
                    set({ error: e.message || 'OTP verification failed', isLoading: false });
                }
            },

            completeProfile: (profile: UserProfile, provider: 'google' | 'phone') => {
                const { otpPhone } = get();
                const name = `${profile.firstName} ${profile.lastName}`.trim();
                const user: User = {
                    id: `${provider}_${Date.now()}`,
                    name,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                    age: profile.age,
                    phone: profile.phone || otpPhone,
                    provider,
                    initials: getInitials(profile.firstName, profile.lastName),
                };
                set({ user, isAuthenticated: true, needsProfile: false, pendingGoogleEmail: '' });
            },

            logout: () => {
                set({
                    user: null, isAuthenticated: false,
                    otpSent: false, otpPhone: '',
                    error: null, needsProfile: false, pendingGoogleEmail: ''
                });
            },

            clearError: () => set({ error: null }),
            cancelOtp: () => set({ otpSent: false, otpPhone: '', error: null }),
        }),
        {
            name: 'invex-auth',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

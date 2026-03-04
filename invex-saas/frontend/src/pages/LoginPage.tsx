import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Bot, ArrowRight, Phone, ChevronDown, X, Loader2, ShieldCheck, TrendingUp, BarChart3, User } from 'lucide-react';

const COUNTRIES = [
    { flag: '🇮🇳', code: 'IN', dial: '+91', name: 'India' },
    { flag: '🇺🇸', code: 'US', dial: '+1', name: 'United States' },
    { flag: '🇬🇧', code: 'GB', dial: '+44', name: 'United Kingdom' },
    { flag: '🇦🇺', code: 'AU', dial: '+61', name: 'Australia' },
    { flag: '🇨🇦', code: 'CA', dial: '+1', name: 'Canada' },
    { flag: '🇸🇬', code: 'SG', dial: '+65', name: 'Singapore' },
    { flag: '🇦🇪', code: 'AE', dial: '+971', name: 'UAE' },
    { flag: '🇩🇪', code: 'DE', dial: '+49', name: 'Germany' },
    { flag: '🇫🇷', code: 'FR', dial: '+33', name: 'France' },
    { flag: '🇯🇵', code: 'JP', dial: '+81', name: 'Japan' },
    { flag: '🇧🇷', code: 'BR', dial: '+55', name: 'Brazil' },
    { flag: '🇿🇦', code: 'ZA', dial: '+27', name: 'South Africa' },
    { flag: '🇺🇦', code: 'UA', dial: '+380', name: 'Ukraine' },
    { flag: '🇮🇩', code: 'ID', dial: '+62', name: 'Indonesia' },
    { flag: '🇲🇾', code: 'MY', dial: '+60', name: 'Malaysia' },
    { flag: '🇵🇭', code: 'PH', dial: '+63', name: 'Philippines' },
    { flag: '🇳🇿', code: 'NZ', dial: '+64', name: 'New Zealand' },
    { flag: '🇨🇭', code: 'CH', dial: '+41', name: 'Switzerland' },
    { flag: '🇳🇱', code: 'NL', dial: '+31', name: 'Netherlands' },
    { flag: '🇸🇪', code: 'SE', dial: '+46', name: 'Sweden' },
];

const FEATURES = [
    { icon: <TrendingUp size={20} />, text: 'AI-powered investment analysis' },
    { icon: <BarChart3 size={20} />, text: 'Real-time NSE & global market data' },
    { icon: <ShieldCheck size={20} />, text: 'Geo-political impact alerts' },
];

// Reusable input
const Field = ({ label, value, onChange, type = 'text', placeholder, required }: any) => (
    <div>
        <label className="text-gray-400 text-xs font-medium mb-1.5 block">
            {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all"
        />
    </div>
);

export const LoginPage = () => {
    const navigate = useNavigate();
    const {
        loginWithGoogle, sendOtp, verifyOtp, completeProfile,
        isAuthenticated, isLoading, error, otpSent, cancelOtp, clearError,
        needsProfile, pendingGoogleEmail,
    } = useAuthStore();

    const [tab, setTab] = useState<'google' | 'phone'>('google');
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountryDrop, setShowCountryDrop] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = Array.from({ length: 6 }, () => React.useRef<HTMLInputElement>(null));

    // Profile form state
    const [profile, setProfile] = useState({
        firstName: '', lastName: '', email: pendingGoogleEmail, age: '', phone: ''
    });

    // Prefill email when google auth completes
    useEffect(() => {
        if (pendingGoogleEmail) setProfile(p => ({ ...p, email: pendingGoogleEmail }));
    }, [pendingGoogleEmail]);

    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard', { replace: true });
    }, [isAuthenticated]);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)
    );

    const handleOtpChange = (idx: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
        if (val && idx < 5) otpRefs[idx + 1].current?.focus();
    };
    const handleOtpKey = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.firstName || !profile.lastName || !profile.email) return;
        const provider = pendingGoogleEmail ? 'google' : 'phone';
        completeProfile(profile, provider);
    };

    // ——— Profile completion screen ———
    if (needsProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center gap-3 justify-center mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Bot size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Invex AI</span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <User size={18} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Complete your profile</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-7">
                            {pendingGoogleEmail
                                ? `Google verified ✓  ${pendingGoogleEmail}`
                                : 'Phone verified ✓  Tell us a bit about yourself'}
                        </p>

                        {error && (
                            <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                <X size={15} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="First Name" value={profile.firstName}
                                    onChange={(v: string) => setProfile(p => ({ ...p, firstName: v }))}
                                    placeholder="Rohit" required />
                                <Field label="Last Name" value={profile.lastName}
                                    onChange={(v: string) => setProfile(p => ({ ...p, lastName: v }))}
                                    placeholder="Rathod" required />
                            </div>

                            <Field label="Email Address" type="email" value={profile.email}
                                onChange={(v: string) => setProfile(p => ({ ...p, email: v }))}
                                placeholder="rohit@example.com" required />

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Age" type="number" value={profile.age}
                                    onChange={(v: string) => setProfile(p => ({ ...p, age: v }))}
                                    placeholder="25" />
                                <Field label="Phone" type="tel" value={profile.phone}
                                    onChange={(v: string) => setProfile(p => ({ ...p, phone: v }))}
                                    placeholder="+91 98765 43210" />
                            </div>

                            <button
                                type="submit"
                                disabled={!profile.firstName || !profile.lastName || !profile.email}
                                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                            >
                                <ArrowRight size={18} />
                                Create Account
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ——— Main login screen ———
    return (
        <div className="min-h-screen flex overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>

            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-32 right-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/3 w-56 h-56 bg-purple-500/10 rounded-full blur-2xl" />
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Bot size={24} className="text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">Invex AI</span>
                </div>

                <div className="relative z-10 space-y-8">
                    <div>
                        <h2 className="text-5xl font-bold text-white leading-tight">
                            Smart Investing<br />
                            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                                Powered by AI
                            </span>
                        </h2>
                        <p className="mt-4 text-lg text-gray-400 leading-relaxed max-w-md">
                            Let AI analyze Indian markets, geo-political signals, and banker statements
                            to guide every investment decision in real time.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="flex items-center gap-3 text-gray-300">
                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                                    {f.icon}
                                </div>
                                <span className="text-sm font-medium">{f.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 max-w-sm">
                        <p className="text-gray-400 text-sm">"Invex AI flagged a market risk from a Fed statement before my broker did. Saved my portfolio."</p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">RR</div>
                            <div>
                                <p className="text-white text-sm font-medium">Rohit Rathod</p>
                                <p className="text-gray-500 text-xs">Product Manager, Mumbai</p>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-gray-600 text-xs relative z-10">© 2025 Invex AI. All rights reserved.</p>
            </div>

            {/* Right auth panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm lg:hidden" />
                <div className="relative z-10 w-full max-w-md">
                    <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Bot size={22} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">Invex AI</span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-1">Welcome</h3>
                        <p className="text-gray-400 text-sm mb-8">Sign in or create an account</p>

                        {error && (
                            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                <X size={16} className="flex-shrink-0" />
                                <span>{error}</span>
                                <button onClick={clearError} className="ml-auto"><X size={14} /></button>
                            </div>
                        )}

                        {!otpSent ? (
                            <>
                                {/* Tabs */}
                                <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                                    {([['google', '🟢 Google'], ['phone', '📱 Phone']] as const).map(([key, label]) => (
                                        <button key={key}
                                            onClick={() => { setTab(key); clearError(); }}
                                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === key ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {tab === 'google' ? (
                                    <div className="space-y-4">
                                        <button onClick={() => { clearError(); loginWithGoogle(); }}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-all shadow-md disabled:opacity-70">
                                            {isLoading
                                                ? <Loader2 size={20} className="animate-spin text-gray-600" />
                                                : <svg width="20" height="20" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            }
                                            {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
                                        </button>
                                        <p className="text-center text-xs text-gray-600">🔒 Secure OAuth 2.0 — you'll complete your profile next</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-gray-400 text-xs font-medium mb-2 block">Phone Number</label>
                                            <div className="flex gap-2">
                                                <div className="relative">
                                                    <button onClick={() => setShowCountryDrop(v => !v)}
                                                        className="flex items-center gap-1.5 h-full bg-white/10 border border-white/15 rounded-xl px-3 text-white text-sm font-medium hover:bg-white/15 transition-colors whitespace-nowrap">
                                                        <span>{selectedCountry.flag}</span>
                                                        <span className="text-gray-300">{selectedCountry.dial}</span>
                                                        <ChevronDown size={14} className="text-gray-500" />
                                                    </button>
                                                    {showCountryDrop && (
                                                        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                                            <div className="p-2 border-b border-white/10">
                                                                <input autoFocus value={countrySearch}
                                                                    onChange={e => setCountrySearch(e.target.value)}
                                                                    placeholder="Search country..."
                                                                    className="w-full bg-white/5 text-white text-sm px-3 py-2 rounded-lg outline-none placeholder-gray-500" />
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {filteredCountries.map(c => (
                                                                    <button key={c.code}
                                                                        onClick={() => { setSelectedCountry(c); setShowCountryDrop(false); setCountrySearch(''); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors text-left">
                                                                        <span>{c.flag}</span>
                                                                        <span className="flex-1">{c.name}</span>
                                                                        <span className="text-gray-500 text-xs">{c.dial}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="tel" value={phoneNumber}
                                                    onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s\-]/g, ''))}
                                                    onKeyDown={e => e.key === 'Enter' && sendOtp(`${selectedCountry.dial}${phoneNumber.replace(/\s/g, '')}`)}
                                                    placeholder="98765 43210"
                                                    className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-blue-500/60 focus:bg-white/15 transition-all" />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { clearError(); sendOtp(`${selectedCountry.dial}${phoneNumber.replace(/\s/g, '')}`); }}
                                            disabled={isLoading || !phoneNumber}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-60">
                                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
                                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                                        </button>
                                        <p className="text-xs text-gray-600 text-center">🔒 We'll send a 6-digit code — profile collection follows</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // OTP screen
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="w-14 h-14 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Phone size={24} className="text-blue-400" />
                                    </div>
                                    <h4 className="text-white font-semibold">Verify your number</h4>
                                    <p className="text-gray-400 text-sm mt-1">Code sent to <span className="text-white font-medium">{selectedCountry.dial} {phoneNumber}</span></p>
                                    <p className="text-xs text-yellow-400/80 mt-1">[Dev: use 123456]</p>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    {otp.map((digit, i) => (
                                        <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={digit}
                                            onChange={e => handleOtpChange(i, e.target.value)}
                                            onKeyDown={e => handleOtpKey(i, e)}
                                            className={`w-11 text-center text-xl font-bold text-white bg-white/10 border rounded-xl outline-none transition-all ${digit ? 'border-blue-500 bg-blue-500/15' : 'border-white/15'} focus:border-blue-400`}
                                            style={{ height: '52px' }} />
                                    ))}
                                </div>
                                <button onClick={() => { clearError(); verifyOtp(otp.join('')); }}
                                    disabled={isLoading || otp.join('').length < 6}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 shadow-lg">
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                                </button>
                                <button onClick={cancelOtp} className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors">← Change number</button>
                            </div>
                        )}

                        {!otpSent && tab === 'google' && (
                            <>
                                <div className="mt-6 flex items-center gap-3">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-gray-600 text-xs">or</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>
                                <p className="mt-4 text-center text-sm text-gray-500">
                                    Prefer phone?{' '}
                                    <button onClick={() => setTab('phone')} className="text-blue-400 hover:text-blue-300 font-medium">Sign in with OTP</button>
                                </p>
                            </>
                        )}
                    </div>

                    <p className="mt-6 text-center text-xs text-gray-600">
                        By signing in you agree to our{' '}
                        <span className="text-gray-400 hover:text-white cursor-pointer">Terms</span>
                        {' & '}
                        <span className="text-gray-400 hover:text-white cursor-pointer">Privacy Policy</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

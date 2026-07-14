'use client';
import React, { useState } from 'react';
import { Diamond, ArrowRight, Eye, EyeOff, AlertCircle, Loader2, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import { setUserProfile } from '@/lib/auth';

const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

type Step = 'details' | 'otp';

export default function RegisterPage() {
    const [step, setStep] = useState<Step>('details');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; otp?: string; general?: string }>({});
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState('');

    const validateDetails = (): boolean => {
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required.';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!isValidEmail(email)) {
            newErrors.email = 'Enter a valid email address.';
        }

        if (!password) {
            newErrors.password = 'Password is required.';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateDetails()) return;

        setLoading(true);
        setErrors({});
        setNotice('');

        try {
            const res = await apiPost('/api/v1/auth/request-otp', { name, email, password });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Could not send OTP');
            }

            setStep('otp');
            setOtp('');
            setNotice(`We sent a 6-digit code to ${email.trim()}.`);
        } catch (err: any) {
            setErrors({ general: err.message || 'Something went wrong. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        const code = otp.trim();
        if (!/^\d{6}$/.test(code)) {
            setErrors({ otp: 'Enter the 6-digit OTP from your email.' });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const res = await apiPost('/api/v1/auth/verify-otp', { email, otp: code });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Could not verify OTP');
            }

            const data = await res.json();
            setUserProfile(data);
            window.location.href = '/dashboard';
        } catch (err: any) {
            setErrors({ general: err.message || 'Something went wrong. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!validateDetails()) return;

        setLoading(true);
        setErrors({});
        setNotice('');

        try {
            const res = await apiPost('/api/v1/auth/request-otp', { name, email, password });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Could not resend OTP');
            }

            setOtp('');
            setNotice(`A fresh OTP was sent to ${email.trim()}.`);
        } catch (err: any) {
            setErrors({ general: err.message || 'Something went wrong. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (hasError?: boolean): React.CSSProperties => ({
        width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${hasError ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease',
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(200,241,53,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#C8F135', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Diamond size={18} color="black" fill="black" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '18px' }}>
                        Invex <span style={{ color: '#C8F135' }}>AI</span>
                    </span>
                </div>

                <div
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: '24px',
                        padding: '40px 36px',
                    }}
                >
                    <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>
                        {step === 'details' ? 'Create an account' : 'Verify your email'}
                    </h1>
                    <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
                        {step === 'details'
                            ? 'We will email you a one-time code after signup details are submitted.'
                            : 'Enter the 6-digit OTP we sent to your inbox.'}
                    </p>

                    {notice && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(200,241,53,0.08)',
                                border: '1px solid rgba(200,241,53,0.25)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                marginBottom: '16px',
                            }}
                        >
                            <MailCheck size={15} color="#C8F135" style={{ flexShrink: 0 }} />
                            <span style={{ color: '#C8F135', fontSize: '13px' }}>{notice}</span>
                        </div>
                    )}

                    {errors.general && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                marginBottom: '16px',
                            }}
                        >
                            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
                            <span style={{ color: '#EF4444', fontSize: '13px' }}>{errors.general}</span>
                        </div>
                    )}

                    <form onSubmit={step === 'details' ? handleRequestOtp : handleVerifyOtp} noValidate>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Name</label>
                            <input
                                id="register-name"
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setErrors((prev) => ({ ...prev, name: undefined }));
                                }}
                                style={inputStyle(!!errors.name)}
                                autoComplete="name"
                                disabled={step === 'otp' && loading}
                            />
                            {errors.name && (
                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={11} /> {errors.name}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Email</label>
                            <input
                                id="register-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                style={inputStyle(!!errors.email)}
                                autoComplete="email"
                                disabled={step === 'otp' && loading}
                            />
                            {errors.email && (
                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={11} /> {errors.email}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setErrors((prev) => ({ ...prev, password: undefined }));
                                    }}
                                    style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                                    autoComplete="new-password"
                                    disabled={step === 'otp' && loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#6B7280',
                                        padding: '4px',
                                    }}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={11} /> {errors.password}
                                </p>
                            )}
                        </div>

                        {step === 'otp' && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>OTP</label>
                                <input
                                    id="register-otp"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value);
                                        setErrors((prev) => ({ ...prev, otp: undefined }));
                                    }}
                                    style={inputStyle(!!errors.otp)}
                                    autoComplete="one-time-code"
                                />
                                {errors.otp && (
                                    <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={11} /> {errors.otp}
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: loading ? 'rgba(200,241,53,0.5)' : '#C8F135',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '15px',
                                borderRadius: '14px',
                                padding: '14px',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: loading ? 'none' : '0 0 24px rgba(200,241,53,0.25)',
                                transition: 'background 0.15s ease, box-shadow 0.15s ease',
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    {step === 'details' ? 'Sending OTP...' : 'Verifying...'}
                                </>
                            ) : step === 'details' ? (
                                <>
                                    Send OTP <ShieldCheck size={16} />
                                </>
                            ) : (
                                <>
                                    Verify & Create Account <ArrowRight size={16} />
                                </>
                            )}
                        </button>

                        {step === 'otp' && (
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    marginTop: '12px',
                                    background: 'transparent',
                                    color: '#C8F135',
                                    border: '1px solid rgba(200,241,53,0.25)',
                                    borderRadius: '14px',
                                    padding: '12px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                <RefreshCw size={16} />
                                Resend OTP
                            </button>
                        )}
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#4B5563', marginTop: '24px' }}>
                        Already have an account?{' '}
                        <a href="/login" style={{ color: '#C8F135', textDecoration: 'none', fontWeight: 600 }}>
                            Sign in
                        </a>
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

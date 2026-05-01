'use client';
import React, { useState } from 'react';
import { Diamond, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import { setUserProfile } from '@/lib/auth';


// Simple email validator
const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
    const [loading, setLoading] = useState(false);

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setErrors({});

        try {
            const res = await apiPost('/api/v1/auth/login', { email, password });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Invalid email or password');
            }
            const data = await res.json();
            setUserProfile(data);   // cache profile (JWT is in HttpOnly cookie)

            window.location.href = '/dashboard';
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
            {/* Ambient glow */}
            <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(200,241,53,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#C8F135', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Diamond size={18} color="black" fill="black" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '18px' }}>
                        Invex <span style={{ color: '#C8F135' }}>AI</span>
                    </span>
                </div>

                {/* Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '24px', padding: '40px 36px',
                }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>Welcome back</h1>
                    <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>Sign in to your Invex AI account</p>

                    {/* Google sign-in */}
                    <button
                        type="button"
                        onClick={() => window.location.href = 'http://localhost:5173/login'}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            background: '#fff', color: '#111', fontWeight: 600, fontSize: '14px',
                            borderRadius: '14px', padding: '14px', border: 'none', cursor: 'pointer',
                            marginBottom: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
                            transition: 'background 0.15s ease',
                        }}>
                        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" /><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" /><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" /><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" /></svg>
                        Continue with Google
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                        <span style={{ color: '#4B5563', fontSize: '12px' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    </div>

                    {/* General error banner */}
                    {errors.general && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
                        }}>
                            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
                            <span style={{ color: '#EF4444', fontSize: '13px' }}>{errors.general}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Email */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Email</label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                                style={inputStyle(!!errors.email)}
                                autoComplete="email"
                            />
                            {errors.email && (
                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={11} /> {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                                    style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px',
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

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: loading ? 'rgba(200,241,53,0.5)' : '#C8F135',
                                color: '#000', fontWeight: 700, fontSize: '15px',
                                borderRadius: '14px', padding: '14px', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: loading ? 'none' : '0 0 24px rgba(200,241,53,0.25)',
                                transition: 'background 0.15s ease, box-shadow 0.15s ease',
                            }}>
                            {loading
                                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                                : <>Sign in <ArrowRight size={16} /></>
                            }
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#4B5563', marginTop: '24px' }}>
                        Don't have an account?{' '}
                        <a href="/register" style={{ color: '#C8F135', textDecoration: 'none', fontWeight: 600 }}>Create one free</a>
                    </p>
                </div>

            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

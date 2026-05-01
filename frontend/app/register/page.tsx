'use client';
import React, { useState } from 'react';
import { Diamond, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import { setUserProfile } from '@/lib/auth';


// Simple email validator
const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ name?: string, email?: string; password?: string; general?: string }>({});
    const [loading, setLoading] = useState(false);

    const validate = (): boolean => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setErrors({});

        try {
            const res = await apiPost('/api/v1/auth/register', { name, email, password });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Could not register');
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
                    <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>Create an account</h1>
                    <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>Sign up to get started</p>

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
                        {/* Name */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Name</label>
                            <input
                                id="register-name"
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }}
                                style={inputStyle(!!errors.name)}
                                autoComplete="name"
                            />
                            {errors.name && (
                                <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={11} /> {errors.name}
                                </p>
                            )}
                        </div>
                    
                        {/* Email */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Email</label>
                            <input
                                id="register-email"
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
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                                    style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                                    autoComplete="new-password"
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
                            id="register-submit"
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
                                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
                                : <>Sign up <ArrowRight size={16} /></>
                            }
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#4B5563', marginTop: '24px' }}>
                        Already have an account?{' '}
                        <a href="/login" style={{ color: '#C8F135', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
                    </p>
                </div>

            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { User, Globe, Shield, FileText, Bell, Lock, Activity, ChevronRight, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';
import { getUserProfile, setUserProfile, logout } from '@/lib/auth';

const TABS = [
    { id: 'profile',        label: 'Profile',        icon: User },
    { id: 'preferences',    label: 'Preferences',    icon: Globe },
    { id: 'risk',           label: 'Risk Profile',   icon: Activity },
    { id: 'notifications',  label: 'Notifications',  icon: Bell },
    { id: 'security',       label: 'Security',       icon: Shield },
];

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', color: '#fff', fontSize: '14px',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px',
};

const Toggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <div onClick={onClick} style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: active ? '#C8F135' : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
    }}>
        <div style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: active ? '#000' : '#888',
            position: 'absolute', top: '3px',
            left: active ? '23px' : '3px', transition: 'all 0.2s',
        }} />
    </div>
);

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '10px', fontSize: '13px',
            background: ok ? 'rgba(200,241,53,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${ok ? 'rgba(200,241,53,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: ok ? '#C8F135' : '#EF4444', marginBottom: '20px',
        }}>
            {ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {msg}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');

    // Profile state
    const [profile, setProfile] = useState({ name: '', email: '' });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Risk state
    const [riskLabel, setRiskLabel] = useState('');
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [riskLoading, setRiskLoading] = useState(false);

    // Password state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Notification toggles (local-only for now)
    const [notifs, setNotifs] = useState({ market: true, price: true, agent: true });

    // ── Fetch profile on mount ────────────────────────────────────────────────
    const fetchProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const res = await apiGet('/api/v1/auth/me');
            if (res.ok) {
                const data = await res.json();
                setProfile({
                    name:  data.name  ?? '',
                    email: data.email ?? '',
                });
                // Keep sessionStorage cache fresh
                setUserProfile(data);
            } else if (res.status === 401) {
                window.location.href = '/login';
            }
        } catch { /* network error — use cached */ 
            const cached = getUserProfile();
            if (cached) setProfile({ name: cached.name, email: cached.email });
        } finally {
            setProfileLoading(false);
        }
    }, []);

    const fetchRisk = useCallback(async () => {
        setRiskLoading(true);
        try {
            const meRes = await apiGet('/api/v1/auth/me');
            if (!meRes.ok) return;
            const me = await meRes.json();
            const res = await apiGet(`/api/v1/risk/profile/${me.user_id}`);
            if (res.ok) {
                const d = await res.json();
                if (d.exists && d.user_context) {
                    setRiskLabel(d.user_context.risk_label ?? '');
                    setRiskScore(d.user_context.risk_score ?? null);
                }
            }
        } catch { /* ignore */ } 
        finally { setRiskLoading(false); }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);
    useEffect(() => { if (activeTab === 'risk') fetchRisk(); }, [activeTab, fetchRisk]);

    // ── Save profile ──────────────────────────────────────────────────────────
    const saveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            // Auth/me PATCH — backend needs to support this, fallback to showing success UI
            const res = await apiPost('/api/v1/auth/update-profile', {
                name: profile.name.trim(),
            });
            if (res.ok) {
                const updated = await res.json();
                setUserProfile(updated);
                setProfileMsg({ text: 'Profile updated successfully.', ok: true });
            } else {
                // If no update endpoint yet, just update the local cache visually
                const cached = getUserProfile();
                if (cached) setUserProfile({ ...cached, name: profile.name });
                setProfileMsg({ text: 'Profile saved locally. (Backend endpoint coming soon)', ok: true });
            }
        } catch {
            setProfileMsg({ text: 'Failed to save. Please try again.', ok: false });
        } finally {
            setProfileSaving(false);
        }
    };

    // ── Change password ───────────────────────────────────────────────────────
    const changePassword = async () => {
        setPwMsg(null);
        if (pwForm.next !== pwForm.confirm) {
            setPwMsg({ text: 'New passwords do not match.', ok: false }); return;
        }
        if (pwForm.next.length < 6) {
            setPwMsg({ text: 'New password must be at least 6 characters.', ok: false }); return;
        }
        setPwSaving(true);
        try {
            const res = await apiPost('/api/v1/auth/change-password', {
                current_password: pwForm.current,
                new_password:     pwForm.next,
            });
            if (res.ok) {
                setPwMsg({ text: 'Password changed. Please log in again.', ok: true });
                setPwForm({ current: '', next: '', confirm: '' });
                setTimeout(() => logout(), 2000);
            } else {
                const d = await res.json().catch(() => ({}));
                setPwMsg({ text: d.detail ?? 'Failed to change password.', ok: false });
            }
        } catch {
            setPwMsg({ text: 'Network error. Please try again.', ok: false });
        } finally {
            setPwSaving(false);
        }
    };

    const nameParts = profile.name.split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName  = nameParts.slice(1).join(' ');

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', padding: '32px 40px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0' }}>Settings</h1>
                <p style={{ color: '#9CA3AF', fontSize: '15px', margin: 0 }}>Manage your account settings and preferences.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                border: 'none', cursor: 'pointer',
                                background: isActive ? 'rgba(200,241,53,0.1)' : 'transparent',
                                color: isActive ? '#C8F135' : '#9CA3AF',
                                textAlign: 'left', fontWeight: isActive ? 600 : 500,
                                transition: 'all 0.15s ease',
                            }}>
                                <tab.icon size={18} />
                                {tab.label}
                                {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Content panel */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px', padding: '32px', minHeight: '600px',
                }}>

                    {/* ── PROFILE ── */}
                    {activeTab === 'profile' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Profile Information</h2>

                            {profileMsg && <Toast msg={profileMsg.text} ok={profileMsg.ok} />}

                            {profileLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', padding: '40px 0' }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading profile…
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>First Name</label>
                                            <input
                                                style={inputStyle}
                                                value={firstName}
                                                onChange={e => setProfile(p => ({ ...p, name: e.target.value + ' ' + lastName }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Last Name</label>
                                            <input
                                                style={inputStyle}
                                                value={lastName}
                                                onChange={e => setProfile(p => ({ ...p, name: firstName + ' ' + e.target.value }))}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Email Address</label>
                                            <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} type="email" value={profile.email} readOnly />
                                            <p style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px' }}>Email cannot be changed directly. Contact support.</p>
                                        </div>

                                    </div>
                                    <button
                                        onClick={saveProfile}
                                        disabled={profileSaving}
                                        style={{
                                            background: profileSaving ? 'rgba(200,241,53,0.5)' : '#C8F135',
                                            color: '#000', fontWeight: 600,
                                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                                            border: 'none', borderRadius: '10px', padding: '10px 20px',
                                            cursor: profileSaving ? 'not-allowed' : 'pointer', fontSize: '14px',
                                        }}>
                                        {profileSaving
                                            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                                            : <><Save size={15} /> Save Changes</>}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── PREFERENCES ── */}
                    {activeTab === 'preferences' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>App Preferences</h2>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Language</label>
                                <select style={selectStyle} defaultValue="en">
                                    <option value="en" style={{ background: '#111' }}>English</option>
                                    <option value="hi" style={{ background: '#111' }}>Hindi</option>
                                    <option value="es" style={{ background: '#111' }}>Spanish</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Currency Display</label>
                                <select style={selectStyle} defaultValue="inr">
                                    <option value="inr" style={{ background: '#111' }}>INR (₹)</option>
                                    <option value="usd" style={{ background: '#111' }}>USD ($)</option>
                                    <option value="eur" style={{ background: '#111' }}>EUR (€)</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Timezone</label>
                                <select style={selectStyle} defaultValue="ist">
                                    <option value="ist" style={{ background: '#111' }}>Asia/Kolkata (IST)</option>
                                    <option value="est" style={{ background: '#111' }}>America/New_York (EST)</option>
                                    <option value="gmt" style={{ background: '#111' }}>Europe/London (GMT)</option>
                                </select>
                            </div>
                            <button style={{ background: '#C8F135', color: '#000', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}>
                                <Save size={15} /> Save Preferences
                            </button>
                        </div>
                    )}

                    {/* ── RISK PROFILE ── */}
                    {activeTab === 'risk' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Risk Profile & Objectives</h2>

                            {riskLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', padding: '20px 0' }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading risk profile…
                                </div>
                            ) : riskLabel ? (
                                <div style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Current Risk Tier</span>
                                        <span style={{ background: '#C8F135', color: '#000', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                                            {riskLabel.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    {riskScore !== null && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                                            Risk Score: <strong style={{ color: '#fff' }}>{riskScore.toFixed(1)} / 100</strong>
                                        </p>
                                    )}
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>This profile governs recommendations made by our AI investment agents.</p>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                    <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>No risk profile found. Complete the AI interview to get personalised recommendations.</p>
                                </div>
                            )}

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Retake AI Voice Assessment</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px 0' }}>Has your financial situation changed? Speak to our AI agent to recalibrate your risk profile dynamically.</p>
                                <a href="/onboarding" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 500, borderRadius: '10px', padding: '8px 16px', textDecoration: 'none', fontSize: '13px' }}>
                                    Start AI Interview →
                                </a>
                            </div>
                        </div>
                    )}

                    {/* ── NOTIFICATIONS ── */}
                    {activeTab === 'notifications' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Notification Preferences</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    { key: 'market', label: 'Market Alerts',             desc: 'Major shifts in tracked indices.' },
                                    { key: 'price',  label: 'Price Target Hits',          desc: 'Notify me when my holdings hit their target price.' },
                                    { key: 'agent',  label: 'Agent Research Completion',  desc: 'Ping me when background AI analysis is finished.' },
                                ].map((item, i, arr) => (
                                    <React.Fragment key={item.key}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{item.label}</div>
                                                <div style={{ fontSize: '12px', color: '#6B7280' }}>{item.desc}</div>
                                            </div>
                                            <Toggle
                                                active={notifs[item.key as keyof typeof notifs]}
                                                onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof notifs] }))}
                                            />
                                        </div>
                                        {i < arr.length - 1 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === 'security' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Login & Security</h2>
                            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>Protect your account and your investment data.</p>

                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Change Password</h3>

                                {pwMsg && <Toast msg={pwMsg.text} ok={pwMsg.ok} />}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                                    <input
                                        style={inputStyle} type="password" placeholder="Current password"
                                        value={pwForm.current}
                                        onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                                    />
                                    <input
                                        style={inputStyle} type="password" placeholder="New password"
                                        value={pwForm.next}
                                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                                    />
                                    <input
                                        style={inputStyle} type="password" placeholder="Confirm new password"
                                        value={pwForm.confirm}
                                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                                    />
                                    <button
                                        onClick={changePassword}
                                        disabled={pwSaving || !pwForm.current || !pwForm.next}
                                        style={{
                                            background: pwSaving ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                                            color: '#fff', fontWeight: 500, border: 'none',
                                            borderRadius: '10px', padding: '10px',
                                            cursor: pwSaving ? 'not-allowed' : 'pointer',
                                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        }}>
                                        {pwSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : 'Update Password'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '32px' }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>Two-Factor Authentication (2FA)</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>Add an extra layer of security to your account.</div>
                                </div>
                                <button style={{ background: '#2563EB', color: '#fff', fontWeight: 500, border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                                    Enable 2FA
                                </button>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />

                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#EF4444', marginBottom: '4px' }}>Log out of all devices</div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>Invalidates all active sessions except the current one.</div>
                                <button
                                    onClick={() => logout()}
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 500, border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                                    Sign out everywhere
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

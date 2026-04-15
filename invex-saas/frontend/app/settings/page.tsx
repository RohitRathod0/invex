'use client';
import React, { useState } from 'react';
import { User, Globe, Shield, FileText, Bell, Lock, Activity, ChevronRight, Save } from 'lucide-react';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'risk', label: 'Risk Profile', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
];

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
};

// Simple styled toggle switch mapping for appearance demo
const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <div onClick={onClick} style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: active ? '#C8F135' : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
    }}>
        <div style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: active ? '#000' : '#888',
            position: 'absolute', top: '3px',
            left: active ? '23px' : '3px', transition: 'all 0.2s'
        }} />
    </div>
);

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', padding: '32px 40px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0' }}>Settings</h1>
                <p style={{ color: '#9CA3AF', fontSize: '15px', margin: 0 }}>Manage your account settings and preferences.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>
                
                {/* Sidebar Navigation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: 'none', cursor: 'pointer',
                                    background: isActive ? 'rgba(200,241,53,0.1)' : 'transparent',
                                    color: isActive ? '#C8F135' : '#9CA3AF',
                                    textAlign: 'left', fontWeight: isActive ? 600 : 500,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                                {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    padding: '32px',
                    minHeight: '600px'
                }}>
                    
                    {/* PROFILE SETTINGS */}
                    {activeTab === 'profile' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Profile Information</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>First Name</label>
                                    <input style={inputStyle} defaultValue="Rohit" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Last Name</label>
                                    <input style={inputStyle} defaultValue="Rathod" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Email Address</label>
                                    <input style={inputStyle} type="email" defaultValue="rohit@example.com" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Phone Number</label>
                                    <input style={inputStyle} type="tel" defaultValue="+91 98765 43210" />
                                </div>
                            </div>
                            <button style={{
                                background: '#C8F135', color: '#000', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                border: 'none', borderRadius: '10px', padding: '10px 20px',
                                cursor: 'pointer', fontSize: '14px'
                            }}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}

                    {/* PREFERENCES / LANGUAGE */}
                    {activeTab === 'preferences' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>App Preferences</h2>
                            
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Language</label>
                                <select style={selectStyle} defaultValue="en">
                                    <option value="en" style={{ background: '#111' }}>English</option>
                                    <option value="hi" style={{ background: '#111' }}>Hindi</option>
                                    <option value="es" style={{ background: '#111' }}>Spanish</option>
                                    <option value="fr" style={{ background: '#111' }}>French</option>
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

                            <button style={{
                                background: '#C8F135', color: '#000', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                border: 'none', borderRadius: '10px', padding: '10px 20px',
                                cursor: 'pointer', fontSize: '14px'
                            }}>
                                <Save size={16} /> Save Preferences
                            </button>
                        </div>
                    )}

                    {/* RISK PROFILE SETTINGS */}
                    {activeTab === 'risk' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Risk Profile & Objectives</h2>
                            
                            <div style={{
                                background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.2)',
                                borderRadius: '12px', padding: '20px', marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Current Risk Tier</span>
                                    <span style={{ background: '#C8F135', color: '#000', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>MODERATE</span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>This profile governs recommendations made by our AI investment agents.</p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Primary Investment Goal</label>
                                <select style={selectStyle} defaultValue="wealth">
                                    <option value="wealth" style={{ background: '#111' }}>Wealth Creation over 5-10 years</option>
                                    <option value="income" style={{ background: '#111' }}>Regular Dividend Income</option>
                                    <option value="preservation" style={{ background: '#111' }}>Capital Preservation</option>
                                    <option value="speculation" style={{ background: '#111' }}>Aggressive Speculation</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>Retake AI Voice Assessment</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px 0' }}>Has your financial situation changed? Speak to our AI agent to recalibrate your risk profile dynamically.</p>
                                <a href="/onboarding" style={{
                                    display: 'inline-block',
                                    background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 500,
                                    borderRadius: '10px', padding: '8px 16px', textDecoration: 'none',
                                    fontSize: '13px'
                                }}>
                                    Start AI Interview
                                </a>
                            </div>

                            <button style={{
                                background: '#C8F135', color: '#000', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                border: 'none', borderRadius: '10px', padding: '10px 20px',
                                cursor: 'pointer', fontSize: '14px'
                            }}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    )}

                    {/* REPORTS & DOCUMENTS */}
                    {activeTab === 'reports' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Reports & Documents</h2>
                            
                            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>Configure how your automated reports are generated and delivered.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>Weekly Portfolio Summary</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Receive a digest of your portfolio's performance every Friday.</div>
                                    </div>
                                    <Toggle active={true} onClick={() => {}} />
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>Tax Document Auto-Generation</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Automatically compile realization charts at the end of financial year.</div>
                                    </div>
                                    <Toggle active={true} onClick={() => {}} />
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>Deep-Dive PDF Attachments</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Include high-resolution charts in your email reports.</div>
                                    </div>
                                    <Toggle active={false} onClick={() => {}} />
                                </div>
                            </div>

                        </div>
                    )}

                    {/* NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Notification Preferences</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Market Alerts</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Major shifts in tracked indices.</div>
                                    </div>
                                    <Toggle active={true} onClick={() => {}} />
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                                
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Price Target Hits</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Notify me when my holdings hit their target price.</div>
                                    </div>
                                    <Toggle active={true} onClick={() => {}} />
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Agent Research Completion</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Ping me when background AI analysis is finished.</div>
                                    </div>
                                    <Toggle active={true} onClick={() => {}} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECURITY */}
                    {activeTab === 'security' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Login & Security</h2>
                            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>Protect your account and your investment data.</p>
                            
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Change Password</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                                    <input style={inputStyle} type="password" placeholder="Current password" />
                                    <input style={inputStyle} type="password" placeholder="New password" />
                                    <input style={inputStyle} type="password" placeholder="Confirm new password" />
                                    <button style={{
                                        background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 500,
                                        border: 'none', borderRadius: '10px', padding: '10px',
                                        cursor: 'pointer', fontSize: '14px'
                                    }}>Update Password</button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '32px' }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>Two-Factor Authentication (2FA)</div>
                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>Add an extra layer of security to your account.</div>
                                </div>
                                <button style={{
                                    background: '#2563EB', color: '#fff', fontWeight: 500,
                                    border: 'none', borderRadius: '8px', padding: '8px 16px',
                                    cursor: 'pointer', fontSize: '13px'
                                }}>Enable 2FA</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

'use client';
import React from 'react';
import { motion } from 'framer-motion';

const BARS = [
    { label: 'Income', value: 10500, pct: 74, color: '#C8F135' },
    { label: 'Investment', value: 4250, pct: 30, color: '#3B82F6' },
    { label: 'Expenses', value: 8200, pct: 58, color: '#F97316' },
];

const TRANSACTIONS = [
    { icon: '🛒', label: 'Grocery', cat: 'Shopping', amt: '-₹2,840', c: '#EF4444' },
    { icon: '📈', label: 'SIP — Nifty 50', cat: 'Investment', amt: '+₹10,000', c: '#C8F135' },
    { icon: '⚡', label: 'Electricity Bill', cat: 'Utilities', amt: '-₹1,420', c: '#EF4444' },
];

export function CashFlowSection() {
    return (
        <section style={{ width: '100%', background: '#000', padding: '96px 0' }}>
            <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>

                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                    <motion.p
                        style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        Analytics
                    </motion.p>
                    <motion.h2
                        style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        Smarter cash flow
                        <br />
                        <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#C8F135' }}>insights at a glance</em>
                    </motion.h2>
                    <motion.p
                        style={{ color: '#6B7280', marginTop: '16px', fontSize: '15px' }}
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        Keep your income and investments in sync with real-time AI analysis
                    </motion.p>
                </div>

                {/* 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>

                    {/* LEFT: Monthly overview card */}
                    <motion.div
                        style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '24px', padding: '32px', width: '100%',
                        }}
                        initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly Overview</span>
                            <span style={{ fontSize: '11px', color: '#6B7280', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '999px' }}>Monthly</span>
                        </div>
                        <p style={{ fontSize: '38px', fontWeight: 800, color: '#fff', marginBottom: '28px', letterSpacing: '-0.02em' }}>₹14,250<span style={{ fontSize: '18px', color: '#6B7280', fontWeight: 400 }}>/mo</span></p>

                        {BARS.map((b, i) => (
                            <div key={i} style={{ marginBottom: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{b.label}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>₹{b.value.toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <motion.div style={{ height: '100%', borderRadius: '999px', background: b.color }}
                                        initial={{ width: 0 }} whileInView={{ width: `${b.pct}%` }}
                                        viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* RIGHT: Transaction card */}
                    <motion.div
                        style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
                        initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.7 }}>
                        {/* Header card */}
                        <div style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '24px', padding: '28px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Recent Transactions</span>
                                <span style={{ fontSize: '11px', color: '#C8F135', background: 'rgba(200,241,53,0.1)', padding: '3px 10px', borderRadius: '999px' }}>View all</span>
                            </div>
                            {TRANSACTIONS.map((t, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: i < TRANSACTIONS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{t.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</p>
                                        <p style={{ fontSize: '12px', color: '#6B7280' }}>{t.cat}</p>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: t.c, flexShrink: 0 }}>{t.amt}</span>
                                </div>
                            ))}
                        </div>

                        {/* AI insight pill */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(200,241,53,0.08), rgba(200,241,53,0.03))',
                            border: '1px solid rgba(200,241,53,0.15)',
                            borderRadius: '16px', padding: '16px 20px',
                            display: 'flex', alignItems: 'center', gap: '14px'
                        }}>
                            <div style={{ width: '36px', height: '36px', background: 'rgba(200,241,53,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⚡</div>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#C8F135', marginBottom: '2px' }}>AI Insight</p>
                                <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>Your investment rate is healthy. Consider increasing SIP by 10% next quarter based on income trend.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

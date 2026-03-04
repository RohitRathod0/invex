'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Globe2, Shield } from 'lucide-react';

const FEATURES = [
    {
        icon: TrendingUp,
        color: '#C8F135',
        bg: 'rgba(200,241,53,0.08)',
        title: 'Natural Language Queries',
        desc: 'Ask questions about your portfolio in plain English or Hindi. Get instant AI-powered answers backed by NSE/BSE data.',
        badge: 'Market Analyst',
        sample: 'Should I invest ₹1L in Nifty 50 right now?',
        sampleReply: 'Based on current market, a SIP strategy is optimal. Nifty at 25,179 has support at 24,800.',
    },
    {
        icon: Globe2,
        color: '#3B82F6',
        bg: 'rgba(59,130,246,0.08)',
        title: 'Predictive Analysis',
        desc: 'AI models analyze RBI policy, FII flows, and macro trends to forecast market direction and flag opportunities.',
        badge: 'Macro Economist',
        sample: 'How will US Fed rate decision affect my portfolio?',
        sampleReply: 'Fed hold = positive for EM. Your equity allocation may benefit from FII inflows in Q2.',
    },
    {
        icon: Shield,
        color: '#A855F7',
        bg: 'rgba(168,85,247,0.08)',
        title: 'Smart Risk Classification',
        desc: 'Each recommendation comes with risk scoring — low, medium, or high — tailored to your personal risk profile.',
        badge: 'Risk Manager',
        sample: 'Rate my current portfolio risk.',
        sampleReply: 'Portfolio risk score: 6.2/10 (Moderate-High). Recommend rebalancing 15% to Gold ETF.',
    },
];

export function AIAdvisorSection() {
    return (
        <section style={{ width: '100%', background: '#000', padding: '96px 0' }} id="ai-intelligence">
            <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <motion.p
                        style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        AI Intelligence
                    </motion.p>
                    <motion.h2
                        style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        Your personal{' '}
                        <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#C8F135' }}>AI advisor</em>
                    </motion.h2>
                    <motion.p
                        style={{ color: '#6B7280', marginTop: '16px', fontSize: '15px', maxWidth: '480px', margin: '16px auto 0' }}
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        Experience the power of 4 specialized agents working for your financial well-being
                    </motion.p>
                </div>

                {/* 3-column cards — equal width */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    {FEATURES.map((f, i) => (
                        <motion.div key={i}
                            style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '24px', padding: '32px',
                                display: 'flex', flexDirection: 'column', gap: '20px'
                            }}
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }}>

                            {/* Icon */}
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <f.icon size={22} color={f.color} />
                            </div>

                            {/* Badge */}
                            <span style={{ fontSize: '11px', color: f.color, background: `${f.color}15`, border: `1px solid ${f.color}25`, borderRadius: '999px', padding: '3px 12px', width: 'fit-content', fontWeight: 600 }}>
                                {f.badge}
                            </span>

                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>{f.title}</h3>
                                <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.65 }}>{f.desc}</p>
                            </div>

                            {/* Sample chat */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginTop: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', fontSize: '12px', color: '#D1D5DB' }}>
                                    💬 {f.sample}
                                </div>
                                <div style={{ background: `${f.color}10`, border: `1px solid ${f.color}20`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: f.color, lineHeight: 1.5 }}>
                                    🤖 {f.sampleReply}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

'use client';
import React from 'react';
import { motion } from 'framer-motion';

const TESTIMONIALS = [
    {
        quote: "Invex AI's agents helped me restructure my entire portfolio. Moved out of low-yield FDs into Nifty ETFs and Gold. My returns jumped from 6% to 14% in 8 months.",
        name: 'Rohit Rathod',
        role: 'Software Engineer',
        bg: 'linear-gradient(135deg, #1a1a1a, #0f1f0f)',
        accent: '#C8F135',
    },
    {
        quote: "The geopolitical news agent is a game changer. It alerted me about US tariff news 2 hours before the market dropped. I was able to hedge my positions in time.",
        name: 'Samantha K.',
        role: 'Investor, Bangalore',
        bg: 'linear-gradient(135deg, #1a1a2a, #0f0f2a)',
        accent: '#3B82F6',
    },
    {
        quote: "As a first-time investor, I was intimidated. Invex AI explained everything in plain Hindi and set up a beginner-friendly SIP plan that fits my ₹15K/month budget perfectly.",
        name: 'Joshua L.',
        role: 'Small Business Owner',
        bg: 'linear-gradient(135deg, #1a121a, #1a0f2a)',
        accent: '#A855F7',
    },
    {
        quote: "I ask it about every trade before I place it. The Risk Manager agent once stopped me from making a ₹5L mistake in a penny stock. Best investment I never made.",
        name: 'Priya Mehta',
        role: 'Trader',
        bg: 'linear-gradient(135deg, #1a1510, #2a1a0a)',
        accent: '#F59E0B',
    },
];

export function TestimonialsSection() {
    return (
        <section style={{ width: '100%', background: '#000', padding: '96px 0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
                <div>
                    <motion.p
                        style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        Hear real voice
                    </motion.p>
                    <motion.h2
                        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        What people say
                        <br />
                        <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#C8F135' }}>about Invex AI</em>
                    </motion.h2>
                </div>
                <motion.p
                    style={{ fontSize: '14px', color: '#6B7280', maxWidth: '260px', textAlign: 'right', lineHeight: 1.6 }}
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                    See why thousands of investors trust Invex AI with their financial future
                </motion.p>
            </div>

            {/* Horizontal scroll cards — extends full width */}
            <div style={{ paddingLeft: 'calc((100% - 1280px) / 2 + 48px)', paddingRight: '0' }}>
                <motion.div
                    style={{ display: 'flex', gap: '20px', width: 'max-content' }}
                    initial={{ x: 100, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }} transition={{ duration: 0.8 }}>
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} style={{
                            minWidth: '320px', maxWidth: '340px', borderRadius: '24px', padding: '32px',
                            background: t.bg, border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '24px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                                    {[1, 2, 3, 4, 5].map(s => <span key={s} style={{ color: t.accent, fontSize: '16px' }}>★</span>)}
                                </div>
                                <p style={{ fontSize: '15px', color: '#D1D5DB', lineHeight: 1.7, fontStyle: 'italic' }}>
                                    "{t.quote}"
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${t.accent}20`, border: `2px solid ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent, fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
                                    {t.name[0]}
                                </div>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{t.name}</p>
                                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

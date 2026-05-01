'use client';
import React from 'react';
import { motion } from 'framer-motion';

const LOGOS = ['NSE India', 'BSE India', 'SEBI', 'Zerodha', 'Groww', 'HDFC Securities', 'Angel One'];

const STATS = [
    { value: '₹2.4Cr+', label: 'Analysed portfolios' },
    { value: '4 Agents', label: 'Specialized AI crew' },
    { value: '99.2%', label: 'Uptime reliability' },
    { value: '18K+', label: 'Active investors' },
];

export function TrustedBy() {
    return (
        <section style={{ width: '100%', background: '#000', padding: '80px 0 72px' }}>
            {/* Section header */}
            <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>
                <motion.p
                    style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '18px' }}
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                    Trusted by investors
                </motion.p>
                <motion.h2
                    style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '64px' }}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.6 }}>
                    Trusted by <em style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#C8F135' }}>investors</em>
                    <br />around the globe
                </motion.h2>
            </div>

            {/* Full-width ticker */}
            <div style={{ width: '100%', overflow: 'hidden', position: 'relative', marginBottom: '64px' }}>
                {/* Fade edges */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to right, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to left, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />

                <div className="animate-ticker">
                    {[...LOGOS, ...LOGOS].map((logo, i) => (
                        <React.Fragment key={i}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 40px', color: 'rgba(255,255,255,0.45)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                {logo}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '20px', userSelect: 'none' }}>·</span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Stats row — 4 columns */}
            <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', textAlign: 'center' }}>
                    {STATS.map((s, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                            <p style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</p>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>{s.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

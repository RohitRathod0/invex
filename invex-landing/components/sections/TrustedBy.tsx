'use client';
import React from 'react';
import { motion } from 'framer-motion';

// Duplicate set for seamless loop
const LOGOS = [
    { name: 'Associates', width: 110 },
    { name: 'H HARRIS', width: 100 },
    { name: 'SIEMENS', width: 100 },
    { name: 'Summit', width: 90 },
];
const DOUBLE = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];

export function TrustedBy() {
    return (
        <section className="py-28 bg-[#0A0A0A] overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 text-center mb-16">
                <motion.p
                    className="text-[11px] tracking-widest uppercase text-gray-500 mb-5"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                    About Us
                </motion.p>
                <motion.h2
                    className="text-5xl md:text-6xl font-bold leading-tight text-white"
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.6 }}>
                    Trusted by i
                    <span className="italic" style={{ fontFamily: 'var(--font-playfair)' }}>nvestors</span>
                    <br />around the globe
                </motion.h2>
            </div>

            {/* ── Logo Ticker ── */}
            <div className="relative w-full overflow-hidden py-4">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#0A0A0A] to-transparent" />

                <div className="flex" style={{ animation: 'ticker 30s linear infinite', width: 'max-content' }}>
                    {DOUBLE.map((logo, i) => (
                        <div key={i}
                            className="flex items-center justify-center flex-shrink-0 px-10 border-r border-white/8 last:border-r-0">
                            <span className="text-gray-400 text-base font-bold tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity whitespace-nowrap">
                                {logo.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="max-w-7xl mx-auto px-6 mt-24">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                    {[
                        { value: '50K+', label: 'Active investors' },
                        { value: '$2.4B', label: 'Assets managed' },
                        { value: '98%', label: 'Satisfaction rate' },
                        { value: '140+', label: 'Countries served' },
                    ].map((stat, i) => (
                        <motion.div key={i} className="text-center"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                            <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</p>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

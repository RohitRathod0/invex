'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { ChatBubble } from '@/components/ui/ChatBubble';

const BRAND_LOGOS = ['NSE India', 'BSE India', 'SEBI', 'Groww', 'Zerodha'];

export function HeroSection() {
    return (
        <section style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <Image src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85"
                    alt="Mountain" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.30) 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(10,10,10,0.9) 100%)' }} />
            </div>

            {/* Content grid */}
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '120px 48px 80px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center', width: '100%' }}>

                    {/* LEFT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,241,53,0.15)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: '999px', padding: '6px 14px' }}>
                                <TrendingUp size={12} color="#C8F135" />
                                <span style={{ color: '#C8F135', fontSize: '12px', fontWeight: 600 }}>AI-Powered Investment Intelligence</span>
                            </div>
                        </motion.div>

                        <div>
                            <motion.div style={{ fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 700, color: '#fff', lineHeight: 1.06 }}
                                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.12 }}>
                                Our AI agents analyze
                            </motion.div>
                            <motion.div style={{ fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 700, color: '#fff', lineHeight: 1.06, fontStyle: 'italic', fontFamily: 'var(--font-playfair)' }}
                                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.27 }}>
                                your investments
                            </motion.div>
                        </div>

                        <motion.p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '17px', lineHeight: 1.7, maxWidth: '480px' }}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}>
                            4 specialized CrewAI agents — Market Analyst, Macro Economist, Sector Specialist &amp; Risk Manager — collaborate to build your personalized strategy in real time.
                        </motion.p>

                        {/* CTA buttons — relative routes */}
                        <motion.div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                            <Link href="/login" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                background: '#C8F135', color: '#000', fontWeight: 700, fontSize: '15px',
                                padding: '14px 28px', borderRadius: '999px', textDecoration: 'none',
                                boxShadow: '0 0 40px rgba(200,241,53,0.35)',
                            }}>
                                Start free analysis <ArrowRight size={16} />
                            </Link>
                            <Link href="#ai-intelligence" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontWeight: 500, fontSize: '15px', padding: '14px 28px', borderRadius: '999px', textDecoration: 'none' }}>
                                See how it works
                            </Link>
                        </motion.div>

                        {/* Logos */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Works with data from</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                                {BRAND_LOGOS.map(logo => <span key={logo} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 700 }}>{logo}</span>)}
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT — chat card */}
                    <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '20px' }}
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
                        <div style={{ maxWidth: '300px', textAlign: 'right' }}>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.6, marginBottom: '10px' }}>
                                India's first multi-agent investment platform. Our crew monitors NSE, Sensex, geopolitics and banking news 24/7.
                            </p>
                        </div>
                        <div className="animate-float" style={{ width: '100%', maxWidth: '400px', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
                            <ChatBubble
                                userMessage="Should I invest ₹1L in Nifty 50 right now?"
                                aiResponse="Based on current conditions — Nifty at 25,179 (down 1.25%), RBI rate hold — SIP entry is favourable. Recommend ₹60K Nifty ETF, ₹25K Gold ETF, ₹15K debt fund."
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(to top, #0A0A0A, transparent)', zIndex: 10, pointerEvents: 'none' }} />
        </section>
    );
}

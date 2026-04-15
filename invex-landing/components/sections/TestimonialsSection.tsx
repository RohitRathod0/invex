'use client';
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TESTIMONIALS = [
    {
        quote: "Navigating investment decisions has made my life easier. I can't imagine going back.",
        name: 'James T.',
        title: 'Software Engineer',
        gradient: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
    },
    {
        quote: "Invex AI has completely transformed the way I manage my finances. Its insights are incredibly accurate and easy to follow.",
        name: 'Jessica L.',
        title: 'Small Business Owner',
        gradient: 'linear-gradient(135deg, #166534 0%, #4d7c0f 100%)',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    },
    {
        quote: "Thanks to Invex AI, I feel in control of my financial future. Highly recommended for anyone serious about smart investing.",
        name: 'Samantha K.',
        title: 'Investor',
        gradient: 'linear-gradient(135deg, #312e81 0%, #7c3aed 100%)',
    },
    {
        quote: "I never thought this simple tool would give me this much confidence in my finances.",
        name: 'David M.',
        title: 'Freelancer',
        gradient: 'linear-gradient(135deg, #134e4a 0%, #1e3a5f 100%)',
    },
    {
        quote: "The predictive analysis feature is remarkable. It identified a spending pattern I had never noticed before.",
        name: 'Priya P.',
        title: 'Product Manager',
        gradient: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)',
    },
];

export function TestimonialsSection() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
    };

    return (
        <section className="py-24 bg-[#080808] overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                    <div>
                        <motion.p className="text-xs tracking-widest uppercase text-gray-500 mb-4"
                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                            Hear Real Voice
                        </motion.p>
                        <motion.h2 className="text-5xl font-bold leading-tight"
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ duration: 0.6 }}>
                            What people say
                            <br />
                            <span className="italic" style={{ fontFamily: 'var(--font-playfair)' }}>about Invex AI</span>
                        </motion.h2>
                    </div>
                    <div className="flex-shrink-0">
                        <p className="text-gray-400 text-sm max-w-xs mb-6">
                            See why thousands of users trust Invex AI to guide their financial decisions.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => scroll('left')} aria-label="Scroll left"
                                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/40 transition-all">
                                <ChevronLeft size={18} />
                            </button>
                            <button onClick={() => scroll('right')} aria-label="Scroll right"
                                className="w-10 h-10 rounded-full bg-[#C8F135] flex items-center justify-center text-black hover:bg-[#d6f855] transition-all">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable cards */}
                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {TESTIMONIALS.map((t, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            <TestimonialCard {...t} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

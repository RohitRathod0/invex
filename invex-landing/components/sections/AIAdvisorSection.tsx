'use client';
import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { TrendingUp, Tag } from 'lucide-react';

const CARDS = [
    {
        id: 'natural-language',
        title: 'Natural Language Queries',
        description: 'Ask questions about your finances in plain English and get instant, accurate answers.',
        image: 'https://images.unsplash.com/photo-1516383274235-5f42d6c6426d?w=600&q=80',
        content: 'chat',
    },
    {
        id: 'predictive-analysis',
        title: 'Predictive Analysis',
        description: 'AI algorithms analyze patterns to forecast future expenses and income trends.',
        image: 'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=600&q=80',
        content: 'chart',
    },
    {
        id: 'smart-categorization',
        title: 'Smart Categorization',
        description: 'Automatically categorize transactions with machine learning that improves over time.',
        image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80',
        content: 'tags',
    },
];

function BarChart() {
    const bars = [60, 45, 70, 55, 80, 65, 90];
    return (
        <div className="p-4">
            <div className="flex items-end gap-2 h-24">
                {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md transition-all" style={{
                        height: `${h}%`,
                        background: i === 6 ? '#C8F135' : 'rgba(200,241,53,0.25)'
                    }} />
                ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <span className="text-3xl font-bold text-white">3%</span>
                <span className="text-[#C8F135] text-sm font-semibold flex items-center gap-1">
                    <TrendingUp size={14} /> Growth
                </span>
            </div>
            <p className="text-gray-500 text-xs mt-1">Expected earnings this month</p>
        </div>
    );
}

const CATEGORY_TAGS = [
    { label: 'Transportation', color: 'bg-blue-500/20 text-blue-300 border-blue-500/20' },
    { label: 'Bills & Utilities', color: 'bg-orange-500/20 text-orange-300 border-orange-500/20' },
    { label: 'Entertainment', color: 'bg-purple-500/20 text-purple-300 border-purple-500/20' },
    { label: 'Groceries', color: 'bg-green-500/20 text-green-300 border-green-500/20' },
    { label: 'Finance', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' },
    { label: 'Healthcare', color: 'bg-red-500/20 text-red-300 border-red-500/20' },
];

export function AIAdvisorSection() {
    return (
        <section className="py-24 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.p className="text-xs tracking-widest uppercase text-gray-500 mb-4"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        AI Intelligence
                    </motion.p>
                    <motion.h2 className="text-5xl font-bold leading-tight mb-4"
                        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        Your personal
                        <br />
                        <span className="italic" style={{ fontFamily: 'var(--font-playfair)' }}>AI advisor</span>
                    </motion.h2>
                    <motion.p className="text-gray-400 max-w-md mx-auto"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        Experience the power of artificial intelligence working for your financial well-being.
                    </motion.p>
                </div>

                {/* 3 card grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {CARDS.map((card, i) => (
                        <motion.div key={card.id}
                            className="relative rounded-3xl overflow-hidden min-h-[420px] group cursor-pointer"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.6 }}
                            whileHover={{ y: -4, scale: 1.01 }}
                        >
                            {/* Background image */}
                            <div className="absolute inset-0 z-0">
                                <Image src={card.image} alt={card.title} fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                            </div>

                            {/* Mock content */}
                            <div className="relative z-10 p-6 pt-8">
                                {card.content === 'chat' && (
                                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                                        <ChatBubble compact
                                            userMessage="Can I afford to invest $500 this month?"
                                            aiResponse="Based on expenses, you'll have ~$800 remaining. Investing $500 is within reach."
                                        />
                                    </div>
                                )}
                                {card.content === 'chart' && (
                                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl">
                                        <BarChart />
                                    </div>
                                )}
                                {card.content === 'tags' && (
                                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Tag size={14} className="text-[#C8F135]" />
                                            <span className="text-white text-xs font-semibold">Auto-categorized</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORY_TAGS.map(tag => (
                                                <span key={tag.label} className={`text-xs px-2.5 py-1 rounded-full border ${tag.color}`}>
                                                    {tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card footer */}
                            <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                                <h3 className="text-xl font-bold italic text-white mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                                    {card.title}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

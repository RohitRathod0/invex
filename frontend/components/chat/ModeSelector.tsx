'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronUp } from 'lucide-react';

export type Mode = {
    id: string;
    emoji: string;
    label: string;
    tagline: string;
    color: string;
    colorRGB: string;
};

export const MODES: Mode[] = [
    {
        id: 'agent-debrief',
        emoji: '🧠',
        label: 'Agent Debrief',
        tagline: 'Ask why the AI made each recommendation',
        color: '#C8F135',
        colorRGB: '200, 241, 53'
    },
    {
        id: 'news-radar',
        emoji: '📡',
        label: 'News Radar',
        tagline: "See how today's news hits YOUR portfolio",
        color: '#3B82F6',
        colorRGB: '59, 130, 246'
    },
    {
        id: 'what-if',
        emoji: '🔮',
        label: 'What-If Simulator',
        tagline: 'Run any investment scenario with live charts',
        color: '#A855F7',
        colorRGB: '168, 85, 247'
    },
    {
        id: 'calm-mode',
        emoji: '🛡️',
        label: 'Calm Mode',
        tagline: "Market panic? Talk it through before you act",
        color: '#10B981',
        colorRGB: '16, 185, 129'
    },
    {
        id: 'my-ai',
        emoji: '✨',
        label: 'My AI',
        tagline: 'Remembers your history and personalizes advice',
        color: '#F59E0B',
        colorRGB: '245, 158, 11'
    }
];

interface ModeSelectorProps {
    activeMode: Mode;
    onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:bg-white/12 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            >
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: activeMode.color }}
                />
                <span className="text-[14px] font-medium text-white font-['DM_Sans',_sans-serif]">
                    {activeMode.label}
                </span>
                <ChevronUp
                    size={14}
                    className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute bottom-[72px] left-4 z-50 w-[420px] max-w-[calc(100vw-32px)] rounded-[20px] p-5 backdrop-blur-[20px]"
                        style={{
                            background: '#111111',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 -8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                        }}
                    >
                        <div className="flex flex-col gap-1.5">
                            {MODES.map((mode) => {
                                const isActive = activeMode.id === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => {
                                            onModeChange(mode);
                                            setOpen(false);
                                        }}
                                        className="w-full flex items-start gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-150 text-left group"
                                        style={{
                                            background: isActive
                                                ? `rgba(${mode.colorRGB}, 0.10)`
                                                : 'transparent',
                                            border: isActive
                                                ? `1px solid rgba(${mode.colorRGB}, 0.30)`
                                                : '1px solid transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive)
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive)
                                                e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0 transition-all duration-200 group-hover:brightness-110"
                                            style={{
                                                background: isActive
                                                    ? `rgba(${mode.colorRGB}, 0.15)`
                                                    : 'rgba(255,255,255,0.06)',
                                                border: isActive
                                                    ? `1px solid rgba(${mode.colorRGB}, 0.25)`
                                                    : '1px solid rgba(255,255,255,0.08)'
                                            }}
                                        >
                                            {mode.emoji}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-[15px] font-semibold leading-tight"
                                                style={{ color: isActive ? mode.color : 'white' }}
                                            >
                                                {mode.label}
                                            </p>
                                            <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">
                                                {mode.tagline}
                                            </p>
                                        </div>

                                        {isActive && (
                                            <Check
                                                size={14}
                                                style={{ color: mode.color }}
                                                className="flex-shrink-0 mt-3"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="border-t border-white/06 mt-3 pt-3">
                            <p className="text-[11px] text-gray-600 text-center px-2 pb-1">
                                Your active mode shapes how I respond to every message.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

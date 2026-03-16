"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

const USER_ID = "0000-user";

export const OnboardingBanner = () => {
    const [show, setShow] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if user has completed onboarding
        fetch(`/api/v1/onboarding/profile/${USER_ID}`)
            .then(r => r.json())
            .then(data => {
                if (!data.exists) setShow(true);
            })
            .catch(() => { }); // Silently fail
    }, []);

    if (!show || dismissed) return null;

    return (
        <div className="relative mx-8 mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#C8F135]/10 to-blue-500/10 border border-[#C8F135]/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C8F135]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-[#C8F135]" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">Complete your investor profile</p>
                    <p className="text-xs text-gray-400">Get personalized recommendations tailored to your risk appetite.</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                    href="/onboarding"
                    className="text-xs font-semibold bg-[#C8F135] hover:bg-[#bce628] text-black px-4 py-2 rounded-lg transition-colors"
                >
                    Start →
                </Link>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

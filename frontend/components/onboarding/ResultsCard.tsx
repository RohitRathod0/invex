"use client";

import Link from 'next/link';

interface ResultsCardProps {
    riskScore: number;
    riskLabel: string;
}

const LABEL_CONFIG: Record<string, { color: string; bg: string; emoji: string; description: string; allocation: string[] }> = {
    Conservative: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30',
        emoji: '🛡️',
        description: 'You prefer capital preservation over high returns. A stable, low-risk portfolio suits you best.',
        allocation: ['70% Bonds & Debt Funds', '20% Large Cap Stocks', '10% Gold'],
    },
    Moderate: {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        emoji: '⚖️',
        description: 'You balance growth with safety. A diversified mix of equities and debt is your sweet spot.',
        allocation: ['50% Equity (Mixed Cap)', '30% Bonds & Debt', '15% Index Funds', '5% Gold'],
    },
    Aggressive: {
        color: 'text-[#C8F135]',
        bg: 'bg-[#C8F135]/10 border-[#C8F135]/30',
        emoji: '🚀',
        description: "You're comfortable with high volatility in pursuit of maximum returns. Equities-heavy portfolio is ideal.",
        allocation: ['70% Equity (Mid & Small Cap)', '15% Large Cap Index', '10% Crypto/Alternatives', '5% Bonds'],
    },
};

export const ResultsCard = ({ riskScore, riskLabel }: ResultsCardProps) => {
    const config = LABEL_CONFIG[riskLabel] || LABEL_CONFIG['Moderate'];
    const angle = (riskScore / 100) * 180; // 0-180 degrees for the semicircle

    return (
        <div className="w-full space-y-6 text-center">
            <h2 className="text-2xl font-bold text-white">Your Risk Profile</h2>

            {/* Gauge */}
            <div className="flex justify-center">
                <div className="relative w-52 h-28 overflow-hidden">
                    {/* Background arc */}
                    <div className="absolute inset-0 rounded-t-full border-[16px] border-b-0 border-white/10" />
                    {/* Colored arc using rotation trick */}
                    <div
                        className="absolute inset-0 rounded-t-full border-[16px] border-b-0 border-[#C8F135] origin-bottom transition-all duration-1000"
                        style={{ transform: `rotate(${angle - 180}deg)`, opacity: riskScore > 5 ? 1 : 0 }}
                    />
                    {/* Center label */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                        <span className="text-3xl font-black text-white">{riskScore}</span>
                        <span className="text-xs text-gray-500 block -mt-1">/ 100</span>
                    </div>
                </div>
            </div>

            {/* Label card */}
            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-base font-bold ${config.color} ${config.bg}`}>
                <span>{config.emoji}</span>
                <span>{riskLabel} Investor</span>
            </div>

            <p className="text-gray-400 text-sm max-w-xs mx-auto">{config.description}</p>

            {/* Recommended Allocation */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-left">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Recommended Allocation</h3>
                <div className="space-y-2">
                    {config.allocation.map(item => (
                        <div key={item} className="flex items-center gap-2.5 text-sm text-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135]" />
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <Link
                href="/dashboard"
                className="inline-block w-full bg-[#C8F135] hover:bg-[#bce628] text-black font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(200,241,53,0.2)]"
            >
                Go to Dashboard →
            </Link>
        </div>
    );
};

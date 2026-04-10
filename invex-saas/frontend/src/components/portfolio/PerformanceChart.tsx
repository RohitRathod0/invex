'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

interface PerformanceChartProps {
    userId?: string;
    holdings?: any[];
}

interface ChartPoint {
    date: string;
    value: number;
}

const PERIOD_OPTIONS = ['1W', '1M', '3M', '1Y'] as const;
type Period = typeof PERIOD_OPTIONS[number];

export const PerformanceChart = ({ userId = "0000-user", holdings = [] }: PerformanceChartProps) => {
    const [period, setPeriod] = useState<Period>('3M');
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null); // null = portfolio view
    const [data, setData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [change, setChange] = useState<{ value: number; pct: number } | null>(null);

    // Unique symbols from holdings
    const symbols = Array.from(new Set(holdings.map((h: any) => h.symbol)));

    useEffect(() => {
        setLoading(true);
        setData([]);

        const url = selectedSymbol
            ? `/api/v1/market/history?symbol=${selectedSymbol}&period=${period}`
            : `/api/v1/portfolio/performance/${userId}?period=${period}`;

        fetch(url)
            .then(res => res.json())
            .then((raw: any) => {
                let points: ChartPoint[] = [];

                if (selectedSymbol) {
                    // Market history format: { history: [{date, close}] }
                    const hist = raw?.history ?? raw ?? [];
                    points = hist.map((p: any) => ({
                        date: p.date,
                        value: p.close ?? p.value ?? 0,
                    }));
                } else {
                    // Portfolio performance format: [{date, value}]
                    points = Array.isArray(raw) ? raw : [];
                }

                setData(points);

                // Compute change
                if (points.length >= 2) {
                    const first = points[0].value;
                    const last = points[points.length - 1].value;
                    const diff = last - first;
                    const pct = first > 0 ? (diff / first) * 100 : 0;
                    setChange({ value: diff, pct });
                } else {
                    setChange(null);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [period, selectedSymbol, userId]);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const isUp = (change?.pct ?? 0) >= 0;
    const currentValue = data.length > 0 ? data[data.length - 1].value : null;

    return (
        <div className="bg-[#0A0A0A] border border-white/[0.07] rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {selectedSymbol ? `${selectedSymbol} — Price History` : 'Portfolio Performance'}
                    </h3>
                    {currentValue !== null && (
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-2xl font-bold text-white">{formatCurrency(currentValue)}</span>
                            {change && (
                                <span className={`flex items-center text-sm font-semibold ${isUp ? 'text-[#C8F135]' : 'text-red-400'}`}>
                                    {isUp ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                    {isUp ? '+' : ''}{formatCurrency(change.value)} ({isUp ? '+' : ''}{change.pct.toFixed(2)}%)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Period selector */}
                <div className="flex items-center gap-1 bg-[#111] border border-white/10 rounded-lg p-1">
                    {PERIOD_OPTIONS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setPeriod(tab)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                period === tab
                                    ? 'bg-[#C8F135]/20 text-[#C8F135]'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stock chips */}
            {symbols.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {/* Portfolio chip */}
                    <button
                        onClick={() => setSelectedSymbol(null)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            selectedSymbol === null
                                ? 'bg-[#C8F135]/20 border-[#C8F135]/50 text-[#C8F135]'
                                : 'bg-white/[0.04] border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        <BarChart2 size={12} />
                        Portfolio
                    </button>

                    {/* Per-stock chips */}
                    {symbols.map(sym => (
                        <button
                            key={sym}
                            onClick={() => setSelectedSymbol(sym === selectedSymbol ? null : sym)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                selectedSymbol === sym
                                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                                    : 'bg-white/[0.04] border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                            }`}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            )}

            {/* Chart area */}
            <div className="h-[280px] w-full">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-500">
                            <div className="w-8 h-8 border-2 border-[#C8F135]/30 border-t-[#C8F135] rounded-full animate-spin" />
                            <span className="text-xs">Fetching market data…</span>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                        No data available. Add holdings to see performance.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={selectedSymbol ? "#60a5fa" : "#C8F135"} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={selectedSymbol ? "#60a5fa" : "#C8F135"} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="date"
                                stroke="#444"
                                fontSize={11}
                                tickMargin={10}
                                tickFormatter={(tick) => {
                                    const d = new Date(tick);
                                    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                }}
                            />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '10px', color: '#fff', fontSize: 13 }}
                                itemStyle={{ color: selectedSymbol ? '#93c5fd' : '#C8F135', fontWeight: 'bold' }}
                                formatter={(value: number) => [formatCurrency(value), selectedSymbol ?? 'Portfolio Value']}
                                labelFormatter={(label) => new Date(label).toDateString()}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={selectedSymbol ? "#60a5fa" : "#C8F135"}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#chartGrad)"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

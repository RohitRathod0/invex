"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react';

const formatPrice = (val: number, currency: string) => {
    const sym = currency === 'USD' ? '$' : '₹';
    return `${sym}${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

interface PerformanceChartProps {
    userId?: string;
    holdings?: any[];
}

interface ChartPoint {
    date: string;
    value: number;
}

// Custom animated tooltip
const CustomTooltip = ({ active, payload, label, isStock, currency }: any) => {
    if (active && payload && payload.length) {
        const val: number = payload[0].value;
        return (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
                <p className="text-xs text-gray-400 mb-1">
                    {new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm font-bold text-[#C8F135]">
                    {formatPrice(val, currency ?? 'INR')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{isStock ? 'Stock Price' : 'Portfolio Value'}</p>
            </div>
        );
    }
    return null;
};

export const PerformanceChart = ({ userId = "0000-user", holdings = [] }: PerformanceChartProps) => {
    const [period, setPeriod] = useState('1M');
    const [data, setData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(false);
    // null = show total portfolio; string = show individual stock
    const [selectedStock, setSelectedStock] = useState<string | null>(null);
    const [stockPrice, setStockPrice] = useState<number | null>(null);
    const [stockChange, setStockChange] = useState<number | null>(null);
    const [currency, setCurrency] = useState<string>('INR');

    // Unique stock symbols from holdings
    const stockSymbols = Array.from(new Set(holdings.map((h: any) => h.symbol)));

    const fetchPortfolioPerf = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/portfolio/performance/${userId}?period=${period}`);
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch (e) {
            console.error(e);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [userId, period]);

    const fetchStockHistory = useCallback(async (symbol: string) => {
        setLoading(true);

        const holding = holdings.find((h: any) => h.symbol === symbol);
        const querySymbol = holding?.exchange ? `${symbol}|${holding.exchange}` : symbol;

        try {
            const res = await fetch(`/api/v1/market/history?symbol=${encodeURIComponent(querySymbol)}&period=${period}`);
            const json = await res.json();
            const raw: any[] = json.history ?? [];
            const mapped: ChartPoint[] = raw.map((p: any) => ({
                date: p.date ?? p.time ?? '',
                value: p.value ?? p.close ?? p.price ?? 0,
            })).filter(p => p.date && p.value > 0);
            setData(mapped);

            // Also fetch current price + currency for the badge
            const priceRes = await fetch(`/api/v1/market/price?symbols=${encodeURIComponent(querySymbol)}`);
            const priceJson = await priceRes.json();
            const priceEntry = priceJson.prices?.[0];
            if (priceEntry) {
                setStockPrice(priceEntry.price ?? null);
                setStockChange(priceEntry.change_pct ?? null);
                setCurrency(priceEntry.currency ?? 'INR');
            }
        } catch (e) {
            console.error(e);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        if (selectedStock) {
            fetchStockHistory(selectedStock);
        } else {
            fetchPortfolioPerf();
        }
    }, [selectedStock, period, fetchPortfolioPerf, fetchStockHistory]);

    const handleStockClick = (symbol: string) => {
        if (selectedStock === symbol) {
            setSelectedStock(null); // deselect → back to portfolio
            setStockPrice(null);
            setStockChange(null);
            setCurrency('INR');
        } else {
            setSelectedStock(symbol);
        }
    };

    // Determine chart accent color based on trend
    const firstVal = data[0]?.value ?? 0;
    const lastVal = data[data.length - 1]?.value ?? 0;
    const isUp = lastVal >= firstVal;
    const accentColor = isUp ? '#C8F135' : '#FF6B6B';

    const formatTick = (tick: string) => {
        const d = new Date(tick);
        if (isNaN(d.getTime())) return tick;
        return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    };

    return (
        <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 relative min-h-[420px]">
            {/* ── Header row ── */}
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <BarChart2 size={18} className="text-[#C8F135]" />
                        Performance
                    </h3>
                    {selectedStock ? (
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-400">
                                Showing <span className="text-white font-semibold">{selectedStock}</span>
                            </span>
                            {stockPrice !== null && (
                                <span className="text-sm font-bold text-white">
                                    {formatPrice(stockPrice, currency)}
                                </span>
                            )}
                            {stockChange !== null && (
                                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    stockChange >= 0
                                        ? 'bg-[#C8F135]/10 text-[#C8F135]'
                                        : 'bg-red-400/10 text-red-400'
                                }`}>
                                    {stockChange >= 0
                                        ? <TrendingUp size={12} />
                                        : <TrendingDown size={12} />}
                                    {stockChange >= 0 ? '+' : ''}{stockChange.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 mt-0.5">Total portfolio value over time</p>
                    )}
                </div>

                {/* Period selector */}
                <div className="flex items-center gap-1 bg-[#111] border border-white/10 rounded-lg p-1">
                    {['1W', '1M', '3M', '1Y'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setPeriod(tab)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
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

            {/* ── Stock Chips ── */}
            {stockSymbols.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {/* "Portfolio" chip */}
                    <button
                        onClick={() => { setSelectedStock(null); setStockPrice(null); setStockChange(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                            selectedStock === null
                                ? 'bg-[#C8F135] text-black border-[#C8F135] shadow-[0_0_12px_rgba(200,241,53,0.35)]'
                                : 'bg-white/5 text-gray-300 border-white/10 hover:border-[#C8F135]/50 hover:text-white'
                        }`}
                    >
                        <Activity size={11} />
                        Portfolio
                    </button>

                    {stockSymbols.map(symbol => (
                        <button
                            key={symbol}
                            onClick={() => handleStockClick(symbol)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                selectedStock === symbol
                                    ? 'bg-[#C8F135] text-black border-[#C8F135] shadow-[0_0_12px_rgba(200,241,53,0.35)]'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-[#C8F135]/50 hover:text-white'
                            }`}
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Chart area ── */}
            <div className="h-[280px] w-full relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 rounded-xl backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-[#C8F135]/30 border-t-[#C8F135] rounded-full animate-spin" />
                            <span className="text-xs text-gray-400">Fetching data…</span>
                        </div>
                    </div>
                )}

                {!loading && data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-4xl mb-3 opacity-30">📊</div>
                        <p className="text-sm text-gray-500">No chart data available for this period.</p>
                        {selectedStock && (
                            <p className="text-xs text-gray-600 mt-1">
                                {selectedStock} may not have data for the selected range.
                            </p>
                        )}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                            <XAxis
                                dataKey="date"
                                stroke="#444"
                                fontSize={11}
                                tickMargin={10}
                                tickFormatter={formatTick}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                content={<CustomTooltip isStock={!!selectedStock} currency={currency} />}
                                cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            {/* Reference line at start value */}
                            {data.length > 0 && (
                                <ReferenceLine
                                    y={firstVal}
                                    stroke="#ffffff15"
                                    strokeDasharray="4 4"
                                />
                            )}
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={accentColor}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPerf)"
                                dot={false}
                                activeDot={{ r: 5, stroke: accentColor, strokeWidth: 2, fill: '#000' }}
                                animationDuration={600}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Footer note ── */}
            <p className="text-[10px] text-gray-600 mt-3 text-right">
                {selectedStock
                    ? `Historical EOD prices · Yahoo Finance · Click chip again to deselect`
                    : `Portfolio value computed from EOD closing prices · Yahoo Finance (NSE/BSE)`
                }
            </p>
        </div>
    );
};

"use client";

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
    userId?: string;
}

export const PerformanceChart = ({ userId = "0000-user" }: PerformanceChartProps) => {
    const [period, setPeriod] = useState('1M');
    const [data, setData] = useState<{ date: string, value: number }[]>([]);

    useEffect(() => {
        fetch(`/api/v1/portfolio/performance/${userId}?period=${period}`)
            .then(res => res.json())
            .then(data => setData(data))
            .catch(console.error);
    }, [period, userId]);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 relative min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Performance</h3>
                <div className="flex items-center gap-1 bg-[#111] border border-white/10 rounded-lg p-1">
                    {['1W', '1M', '3M', '1Y'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setPeriod(tab)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${period === tab
                                ? "bg-[#C8F135]/20 text-[#C8F135]"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C8F135" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            stroke="#555"
                            fontSize={12}
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
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#C8F135', fontWeight: 'bold' }}
                            formatter={(value: number) => [formatCurrency(value), 'Value']}
                            labelFormatter={(label) => new Date(label).toDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#C8F135"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

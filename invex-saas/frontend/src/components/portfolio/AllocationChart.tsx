import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
    holdings: any[];
}

const COLORS = ['#C8F135', '#3B82F6', '#F59E0B', '#A855F7', '#10B981'];

export const AllocationChart = ({ holdings }: AllocationChartProps) => {
    // Generate allocation data from holdings (by asset/symbol for now)
    const data = holdings.reduce((acc, h) => {
        const val = h.quantity * h.avg_buy_price;
        // using avg_buy_price for allocation since we don't have live prices inside the chart currently,
        // although ideally we'd pass live values.
        const existing = acc.find((e: any) => e.name === h.symbol);
        if (existing) {
            existing.value += val;
        } else {
            acc.push({ name: h.symbol, value: val });
        }
        return acc;
    }, []);

    // Also sort it
    data.sort((a: any, b: any) => b.value - a.value);

    // Provide default empty state if no holdings
    const displayData = data.length > 0 ? data : [{ name: 'Cash', value: 1 }];
    const total = displayData.reduce((sum: number, item: any) => sum + item.value, 0);

    return (
        <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6">Allocation</h3>

            <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={displayData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {displayData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={data.length === 0 ? '#333' : COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: number) => [`₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Value']}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {data.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm text-gray-500">No Data</span>
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-2">
                {displayData.slice(0, 5).map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.length === 0 ? '#333' : COLORS[index % COLORS.length] }} />
                            <span className="text-gray-300">{entry.name}</span>
                        </div>
                        <span className="text-white font-medium">
                            {data.length === 0 ? '-' : `${((entry.value / total) * 100).toFixed(1)}%`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

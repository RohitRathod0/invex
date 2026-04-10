import { useState, useEffect } from 'react';
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface HoldingsTableProps {
    holdings: any[];
    prices: Record<string, number>;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const HoldingsTable = ({ holdings, prices, onEdit, onDelete }: HoldingsTableProps) => {
    if (!holdings || holdings.length === 0) {
        return (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl opacity-50">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Holdings</h3>
                <p className="text-sm text-gray-500 max-w-sm">Add your first holding to unlock full analytics, insights, and AI recommendations.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-[#111] border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white">Stock / Asset <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white">Qty <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white">Avg Price <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white">Current Price <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white text-right">Current Value <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium cursor-pointer hover:text-white text-right">P&L <ArrowUpDown size={12} className="inline ml-1 mb-0.5 opacity-50" /></th>
                            <th className="py-4 px-6 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.map((h, i) => {
                            const currentPrice = prices[h.symbol] || h.avg_buy_price;
                            const currentValue = h.quantity * currentPrice;
                            const investedValue = h.quantity * h.avg_buy_price;
                            const pnl = currentValue - investedValue;
                            const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
                            const isPositive = pnl >= 0;

                            const fmtCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                            return (
                                <tr key={h.id} className={cn("border-b border-white/5 hover:bg-white/[0.02] transition-colors", i % 2 === 0 ? "bg-[#0A0A0A]" : "bg-[#111]")}>
                                    <td className="py-4 px-6 font-semibold text-white">{h.symbol}</td>
                                    <td className="py-4 px-6 text-gray-300">{h.quantity}</td>
                                    <td className="py-4 px-6 text-gray-400">{fmtCurrency(h.avg_buy_price)}</td>
                                    <td className="py-4 px-6 text-white font-medium">{fmtCurrency(currentPrice)}</td>
                                    <td className="py-4 px-6 text-right font-semibold text-white">{fmtCurrency(currentValue)}</td>
                                    <td className="py-4 px-6 text-right">
                                        <div className={cn("font-semibold mb-0.5", isPositive ? "text-[#C8F135]" : "text-red-400")}>
                                            {isPositive ? '+' : ''}{fmtCurrency(pnl)}
                                        </div>
                                        <div className={cn("text-xs", isPositive ? "text-[#C8F135]/70" : "text-red-400/70")}>
                                            {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onEdit(h.id)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"><Pencil size={14} /></button>
                                            <button onClick={() => onDelete(h.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

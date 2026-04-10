"use client";
import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export interface ScreenerAsset {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  price: number;
  change_pct: number;
  pe_ratio: number;
  market_cap: number;
  dividend_yield: number;
  volume: number;
}

interface ScreenerResultsTableProps {
  assets: ScreenerAsset[];
  isLoading: boolean;
}

const formatMarketCap = (val: number) => {
  // It's mostly passed in as Crores
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh Cr`;
  return `₹${val.toLocaleString()} Cr`;
};

export const ScreenerResultsTable: React.FC<ScreenerResultsTableProps> = ({ assets, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#C8F135]/20 border-t-[#C8F135] rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse text-[13px] uppercase tracking-wider">Scanning live NSE data...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '20px',
      }} className="w-full p-12 text-center">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-300">No matches found</h3>
        <p className="text-slate-500 mt-2">Try adjusting your filter criteria to see more Indian stocks.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '20px',
      overflow: 'hidden'
    }} className="backdrop-blur-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest">Symbol</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest">Company</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Price</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Change</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Market Cap</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">P/E</th>
            <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Div Yield</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {assets.map((asset) => {
            const isUp = asset.change_pct >= 0;
            return (
              <tr 
                key={asset.symbol} 
                className="group hover:bg-white/5 transition-colors duration-200 cursor-pointer"
              >
                <td className="py-4 px-6">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#111] text-white font-mono font-bold text-sm border border-white/10 group-hover:border-white/20 transition-colors">
                    {asset.symbol}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <p className="text-white font-medium">{asset.name}</p>
                  <p className="text-slate-500 text-[12px] mt-0.5">{asset.sector}</p>
                </td>
                <td className="py-4 px-6 text-right font-mono font-medium text-white shadow-none">
                  ₹{asset.price.toFixed(2)}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className={`inline-flex items-center gap-1.5 text-[13px] font-bold ${
                    isUp ? 'text-[#C8F135]' : 'text-[#EF4444]'
                  }`}>
                    {isUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    <span>{Math.abs(asset.change_pct).toFixed(2)}%</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-mono text-slate-300">
                  {formatMarketCap(asset.market_cap)}
                </td>
                <td className="py-4 px-6 text-right font-mono text-slate-300">
                  {asset.pe_ratio.toFixed(1)}
                </td>
                <td className="py-4 px-6 text-right font-mono text-slate-300">
                  {asset.dividend_yield.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

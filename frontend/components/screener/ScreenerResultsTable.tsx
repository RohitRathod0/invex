"use client";
import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, Activity, BadgePercent, ChevronDown, ChevronUp } from 'lucide-react';

export interface ScreenerAsset {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change_pct: number;
  pe_ratio: number;
  market_cap: number;
  dividend_yield: number;
  roe: number;
  eps_growth: number;
  debt_to_equity: number;
  rsi: number;
  total_score: number;
  quality_score: number;
  momentum_score: number;
}

interface ScreenerResultsTableProps {
  assets: ScreenerAsset[];
  isLoading: boolean;
  aiInsights?: string;
}

const formatMarketCap = (val: number) => {
  if (!val) return '—';
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh Cr`;
  return `₹${val.toLocaleString()} Cr`;
};

// Simple sparkline component
const InlineSparkline = ({ isUp }: { isUp: boolean }) => {
    const strokeObj = isUp ? "#C8F135" : "#EF4444";
    // Mock simple line
    return (
        <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={isUp ? "M0 15 Q 15 20, 30 10 T 60 5" : "M0 5 Q 15 0, 30 10 T 60 15"}
                stroke={strokeObj} strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export const ScreenerResultsTable: React.FC<ScreenerResultsTableProps> = ({ assets, isLoading, aiInsights }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
        <p className="text-slate-500 mt-2">Try relaxing your AI search or manual filters.</p>
      </div>
    );
  }

  const toggleRow = (sym: string) => {
      const newExp = new Set(expandedRows);
      if (newExp.has(sym)) newExp.delete(sym);
      else newExp.add(sym);
      setExpandedRows(newExp);
  }

  return (
    <div className="space-y-4">
      {/* Top Level AI Insights Box if provided */}
      {aiInsights && (
         <div className="bg-[#111] border border-[#C8F135]/30 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-[#C8F135]/5 mb-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#C8F135]" />
            <div className="flex gap-4">
               <div className="p-2 bg-[#C8F135]/10 rounded-full h-fit">
                   <Sparkles className="w-5 h-5 text-[#C8F135]" />
               </div>
               <div>
                   <h3 className="text-sm font-bold text-white mb-2 tracking-wide uppercase">AI Sector Analyst</h3>
                   <p className="text-slate-300 text-sm leading-relaxed">{aiInsights}</p>
               </div>
            </div>
         </div>
      )}

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
              <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Price</th>
              <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Change</th>
              <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Score</th>
              <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Technicals</th>
              <th className="py-4 px-6 font-semibold text-slate-400 text-[11px] uppercase tracking-widest text-right">Fundamentals</th>
              <th className="py-4 px-4 font-semibold text-slate-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {assets.map((asset) => {
              const isUp = asset.change_pct >= 0;
              const isExpanded = expandedRows.has(asset.symbol);
              
              // Safe access with fallbacks
              const rsi = asset.rsi || 0;
              const roe = asset.roe || 0;
              const pe = asset.pe_ratio || 0;
              const score = asset.total_score || 0;

              return (
                <React.Fragment key={asset.symbol}>
                  <tr 
                    onClick={() => toggleRow(asset.symbol)}
                    className="group hover:bg-white/5 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#111] text-white font-mono font-bold text-sm border border-white/10 group-hover:border-white/20 transition-colors">
                            {asset.symbol}
                          </div>
                          <div>
                             <p className="text-white font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{asset.name}</p>
                             <p className="text-slate-500 text-[11px] mt-0.5">{asset.sector}</p>
                          </div>
                      </div>
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
                    <td className="py-4 px-6 text-right">
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-white font-bold font-mono">{score.toFixed(0)}/100</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-emerald-500 to-[#C8F135]" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-white/5 text-xs text-slate-300">
                         <Activity size={12} className="text-blue-400" />
                         RSI: {rsi.toFixed(0)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-white/5 text-xs text-slate-300">
                         <BadgePercent size={12} className="text-purple-400" />
                         ROE: {roe.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-center">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </td>
                  </tr>

                  {isExpanded && (
                     <tr className="bg-black/40 border-b border-white/5">
                        <td colSpan={7} className="p-6">
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div className="space-y-4">
                                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Trend</div>
                                  <InlineSparkline isUp={isUp} />
                              </div>
                              <div className="space-y-2 col-span-2">
                                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Key Metrics</div>
                                  <div className="flex flex-wrap gap-2">
                                     <span className="px-2 py-1 rounded bg-[#111] border border-white/10 text-xs text-slate-300">
                                         P/E: <strong className="text-white">{pe.toFixed(1)}</strong>
                                     </span>
                                     <span className="px-2 py-1 rounded bg-[#111] border border-white/10 text-xs text-slate-300">
                                         EPS Gr: <strong className={asset.eps_growth > 15 ? 'text-emerald-400' : 'text-white'}>{asset.eps_growth?.toFixed(1)}%</strong>
                                     </span>
                                     <span className="px-2 py-1 rounded bg-[#111] border border-white/10 text-xs text-slate-300">
                                         D/E: <strong className="text-white">{asset.debt_to_equity?.toFixed(2)}</strong>
                                     </span>
                                     <span className="px-2 py-1 rounded bg-[#111] border border-white/10 text-xs text-slate-300">
                                         Quality: <strong className="text-white">{asset.quality_score?.toFixed(0)}/100</strong>
                                     </span>
                                      <span className="px-2 py-1 rounded bg-[#111] border border-white/10 text-xs text-slate-300">
                                         Momentum: <strong className="text-white">{asset.momentum_score?.toFixed(0)}/100</strong>
                                     </span>
                                  </div>
                              </div>
                           </div>
                        </td>
                     </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

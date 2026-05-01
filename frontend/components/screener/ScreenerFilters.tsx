"use client";
import React, { useState } from 'react';
import { Filter, ChevronDown, Activity, DollarSign, Zap } from 'lucide-react';

export interface ScreenerFilterState {
  sector: string;
  min_pe: string;
  max_pe: string;
  min_market_cap: string;
  max_market_cap: string;
  min_roe: string;
  max_debt_equity: string;
  min_eps_growth: string;
  min_rsi: string;
  max_rsi: string;
  volume_spike: boolean;
  wk52_high_breakout: boolean;
  above_dma_50: boolean;
  above_dma_200: boolean;
  sort_by: string;
  sort_desc: boolean;
}

interface ScreenerFiltersProps {
  filters: ScreenerFilterState;
  onFilterChange: (filters: ScreenerFilterState) => void;
}

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Consumer', 'Healthcare', 'Telecom', 'Industrials', 'Automobiles', 'Materials'];

export const ScreenerFilters: React.FC<ScreenerFiltersProps> = ({ filters, onFilterChange }) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'fundamentals' | 'technicals'>('presets');

  const handleChange = (key: keyof ScreenerFilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFilterChange(newFilters);
  };

  const applyPreset = (preset: string) => {
    const baseFilters = { ...filters };
    Object.keys(baseFilters).forEach(k => {
      if (k !== 'sector' && k !== 'sort_by' && k !== 'sort_desc') {
          (baseFilters as any)[k] = typeof (baseFilters as any)[k] === 'boolean' ? false : '';
      }
    });

    if (preset === 'undervalued_growth') {
      baseFilters.max_pe = '20';
      baseFilters.min_eps_growth = '15';
      baseFilters.min_roe = '15';
      baseFilters.sort_by = 'eps_growth';
      baseFilters.sort_desc = true;
    } else if (preset === 'high_momentum') {
      baseFilters.min_rsi = '60';
      baseFilters.above_dma_50 = true;
      baseFilters.above_dma_200 = true;
      baseFilters.volume_spike = true;
      baseFilters.sort_by = 'momentum_score';
      baseFilters.sort_desc = true;
    } else if (preset === 'quality_dividends') {
      baseFilters.min_roe = '20';
      baseFilters.max_debt_equity = '0.5';
      baseFilters.sort_by = 'quality_score';
      baseFilters.sort_desc = true;
    } else if (preset === 'breakout_scan') {
      baseFilters.wk52_high_breakout = true;
      baseFilters.volume_spike = true;
      baseFilters.sort_by = 'price';
      baseFilters.sort_desc = true;
    }
    onFilterChange(baseFilters);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-xl">
      <div className="flex gap-4 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'presets' ? 'bg-[#C8F135] text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Zap size={16} /> Quick Presets
        </button>
        <button 
          onClick={() => setActiveTab('fundamentals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'fundamentals' ? 'bg-[#C8F135] text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <DollarSign size={16} /> Fundamentals
        </button>
        <button 
          onClick={() => setActiveTab('technicals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'technicals' ? 'bg-[#C8F135] text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Activity size={16} /> Technicals
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Universal Sector Filter */}
        <div className="space-y-2 lg:col-span-1">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Sector</label>
          <div className="relative">
            <select
              value={filters.sector}
              onChange={(e) => handleChange('sector', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all cursor-pointer"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
        <div className="space-y-2 lg:col-span-1">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Sort By</label>
          <div className="relative">
            <select
              value={filters.sort_by}
              onChange={(e) => handleChange('sort_by', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all cursor-pointer"
            >
              <option value="total_score">Total Score</option>
              <option value="momentum_score">Momentum Score</option>
              <option value="quality_score">Quality Score</option>
              <option value="market_cap">Market Cap</option>
              <option value="pe_ratio">P/E Ratio</option>
              <option value="eps_growth">EPS Growth</option>
              <option value="rsi">RSI</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <button onClick={() => applyPreset('undervalued_growth')} className="p-4 border border-white/10 rounded-xl hover:border-white/30 hover:bg-white/5 text-left transition-all">
             <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span className="font-semibold text-white truncate">Undervalued Growth</span></div>
             <p className="text-xs text-slate-400 leading-snug">P/E &lt; 20, EPS Gr &gt; 15%, ROE &gt; 15%</p>
           </button>
           <button onClick={() => applyPreset('high_momentum')} className="p-4 border border-white/10 rounded-xl hover:border-white/30 hover:bg-white/5 text-left transition-all">
             <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div><span className="font-semibold text-white truncate">High Momentum</span></div>
             <p className="text-xs text-slate-400 leading-snug">RSI &gt; 60, &gt; 50DMA, &gt; 200DMA</p>
           </button>
           <button onClick={() => applyPreset('quality_dividends')} className="p-4 border border-white/10 rounded-xl hover:border-white/30 hover:bg-white/5 text-left transition-all">
             <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-purple-400"></div><span className="font-semibold text-white truncate">Quality Compounders</span></div>
             <p className="text-xs text-slate-400 leading-snug">ROE &gt; 20%, D/E &lt; 0.5</p>
           </button>
           <button onClick={() => applyPreset('breakout_scan')} className="p-4 border border-white/10 rounded-xl hover:border-white/30 hover:bg-white/5 text-left transition-all">
             <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="font-semibold text-white truncate">Breakout Scan</span></div>
             <p className="text-xs text-slate-400 leading-snug">52W High Breakout, Volume Spike</p>
           </button>
        </div>
      )}

      {activeTab === 'fundamentals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">P/E Ratio Range</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="Min" value={filters.min_pe} onChange={(e) => handleChange('min_pe', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
              <span className="text-slate-600">-</span>
              <input type="number" placeholder="Max" value={filters.max_pe} onChange={(e) => handleChange('max_pe', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Market Cap Range (Cr)</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="Min" value={filters.min_market_cap} onChange={(e) => handleChange('min_market_cap', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
              <span className="text-slate-600">-</span>
              <input type="number" placeholder="Max" value={filters.max_market_cap} onChange={(e) => handleChange('max_market_cap', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Min Quality (ROE & EPS)</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="ROE %" value={filters.min_roe} onChange={(e) => handleChange('min_roe', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
              <span className="text-slate-600">&</span>
              <input type="number" placeholder="EPS Growth %" value={filters.min_eps_growth} onChange={(e) => handleChange('min_eps_growth', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Max Debt/Equity</label>
            <input type="number" step="0.1" placeholder="e.g. 1.5" value={filters.max_debt_equity} onChange={(e) => handleChange('max_debt_equity', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
          </div>
        </div>
      )}

      {activeTab === 'technicals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">RSI (14) Range</label>
            <div className="flex items-center space-x-2">
              <input type="number" placeholder="Min" value={filters.min_rsi} onChange={(e) => handleChange('min_rsi', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
              <span className="text-slate-600">-</span>
              <input type="number" placeholder="Max" value={filters.max_rsi} onChange={(e) => handleChange('max_rsi', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono" />
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Moving Averages</label>
             <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={filters.above_dma_50} onChange={(e) => handleChange('above_dma_50', e.target.checked)} className="rounded border-white/20 bg-white/5 text-[#C8F135] focus:ring-[#C8F135]" />
                  Price &gt; 50 DMA
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={filters.above_dma_200} onChange={(e) => handleChange('above_dma_200', e.target.checked)} className="rounded border-white/20 bg-white/5 text-[#C8F135] focus:ring-[#C8F135]" />
                  Price &gt; 200 DMA
                </label>
             </div>
          </div>
          <div className="space-y-2 lg:col-span-2">
             <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Action Signals</label>
             <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer px-3 py-2 bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
                  <input type="checkbox" checked={filters.volume_spike} onChange={(e) => handleChange('volume_spike', e.target.checked)} className="rounded border-white/20 bg-white/5 text-[#C8F135] focus:ring-[#C8F135]" />
                  Volume Spike (3x Avg)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer px-3 py-2 bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
                  <input type="checkbox" checked={filters.wk52_high_breakout} onChange={(e) => handleChange('wk52_high_breakout', e.target.checked)} className="rounded border-white/20 bg-white/5 text-[#C8F135] focus:ring-[#C8F135]" />
                  52W High Breakout
                </label>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

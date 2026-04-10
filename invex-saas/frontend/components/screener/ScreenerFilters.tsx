"use client";
import React, { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

export interface ScreenerFilterState {
  sector: string;
  min_pe: string;
  max_pe: string;
  min_market_cap: string;
  max_market_cap: string;
}

interface ScreenerFiltersProps {
  onFilterChange: (filters: ScreenerFilterState) => void;
}

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Consumer', 'Healthcare', 'Telecom', 'Industrials', 'Automobiles'];

export const ScreenerFilters: React.FC<ScreenerFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<ScreenerFilterState>({
    sector: 'All',
    min_pe: '',
    max_pe: '',
    min_market_cap: '',
    max_market_cap: '',
  });

  const handleChange = (key: keyof ScreenerFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '20px',
    }} className="p-6 mb-8 hover:border-white/20 transition-colors">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-[#C8F135]/10 text-[#C8F135] rounded-xl border border-[#C8F135]/20">
          <Filter size={20} />
        </div>
        <h2 className="text-xl font-semibold text-white">Screening Criteria</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sector Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Sector</label>
          <div className="relative">
            <select
              value={filters.sector}
              onChange={(e) => handleChange('sector', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* P/E Ratio Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">P/E Ratio Range</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.min_pe}
              onChange={(e) => handleChange('min_pe', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono"
            />
            <span className="text-slate-600">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.max_pe}
              onChange={(e) => handleChange('max_pe', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono"
            />
          </div>
        </div>

        {/* Market Cap Filter */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider text-[11px]">Market Cap (₹ Crores)</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min Cap (e.g. 50000)"
              value={filters.min_market_cap}
              onChange={(e) => handleChange('min_market_cap', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono"
            />
            <span className="text-slate-600">-</span>
            <input
              type="number"
              placeholder="Max Cap"
              value={filters.max_market_cap}
              onChange={(e) => handleChange('max_market_cap', e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8F135]/50 transition-all font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

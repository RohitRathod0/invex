"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Search } from 'lucide-react';
import { ScreenerFilters, ScreenerFilterState } from '../components/screener/ScreenerFilters';
import { ScreenerResultsTable, ScreenerAsset } from '../components/screener/ScreenerResultsTable';

export const ScreenerPage: React.FC = () => {
  const [filters, setFilters] = useState<ScreenerFilterState>({
    sector: 'All',
    min_pe: '',
    max_pe: '',
    min_market_cap: '',
    max_market_cap: '',
  });
  
  const [assets, setAssets] = useState<ScreenerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScreenerData = useCallback(async (currentFilters: ScreenerFilterState) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (currentFilters.sector && currentFilters.sector !== 'All') {
        params.append('sector', currentFilters.sector);
      }
      if (currentFilters.min_pe) params.append('min_pe', currentFilters.min_pe);
      if (currentFilters.max_pe) params.append('max_pe', currentFilters.max_pe);
      if (currentFilters.min_market_cap) params.append('min_market_cap', currentFilters.min_market_cap);
      if (currentFilters.max_market_cap) params.append('max_market_cap', currentFilters.max_market_cap);

      const response = await fetch(`http://127.0.0.1:8000/market/screener?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch screener data');
      }
      const data = await response.json();
      setAssets(data.results || []);
    } catch (err) {
      console.error("Error fetching screener:", err);
      setError('Could not retrieve market data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchScreenerData(filters);
  }, []); // Run once on mount, then trigger manually via button for performance, or auto?
  // We'll auto-fetch when filters change but debounce it, or just use a "Run Screen" button if it's heavy.
  // Actually, since it's a mock, fetching on every change is fine, but let's just add it to a hook.
  
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchScreenerData(filters);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [filters, fetchScreenerData]);

  return (
    <div className="flex-1 overflow-auto bg-[#0B0E14] text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
              <Search className="text-emerald-500" size={32} />
              Stock Screener
            </h1>
            <p className="text-slate-400 mt-2 text-lg">
              Filter top performing global equities using advanced financial criteria.
            </p>
          </div>
          
          <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-500 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md">
            <Target size={16} className="text-emerald-500" />
            <span>Scanning top 50 active global tickers</span>
          </div>
        </div>

        {/* Dynamic Filters */}
        <ScreenerFilters onFilterChange={setFilters} />

        {/* Error State */}
        {error && (
          <div className="w-full p-4 mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Results Table */}
        <ScreenerResultsTable assets={assets} isLoading={isLoading} />
        
      </div>
    </div>
  );
};

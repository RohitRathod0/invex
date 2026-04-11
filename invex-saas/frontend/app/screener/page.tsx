"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Search } from 'lucide-react';
import { ScreenerFilters, ScreenerFilterState } from '@/components/screener/ScreenerFilters';
import { ScreenerResultsTable, ScreenerAsset } from '@/components/screener/ScreenerResultsTable';

export default function ScreenerPage() {
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

      const response = await fetch(`http://127.0.0.1:8000/api/v1/market/screener?${params.toString()}`);
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
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchScreenerData(filters);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [filters, fetchScreenerData]);

  return (
    <div className="flex-1 overflow-auto text-slate-200" style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Search color="#C8F135" size={32} />
              Indian Equities Screener
            </h1>
            <p className="text-slate-400 mt-2 text-lg">
              Filter top-performing NIFTY stocks using live pricing and advanced financial criteria.
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }} className="hidden md:flex items-center space-x-2 text-sm text-slate-400 px-4 py-2 rounded-full backdrop-blur-md">
            <Target size={16} color="#C8F135" />
            <span className="font-medium text-slate-200">Scanning NIFTY 50 Universe</span>
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
}

"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Target, Search, Sparkles, AlertCircle } from 'lucide-react';
import { ScreenerFilters, ScreenerFilterState } from '@/components/screener/ScreenerFilters';
import { ScreenerResultsTable, ScreenerAsset } from '@/components/screener/ScreenerResultsTable';

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilterState>({
    sector: 'All',
    min_pe: '',
    max_pe: '',
    min_market_cap: '',
    max_market_cap: '',
    min_roe: '',
    max_debt_equity: '',
    min_eps_growth: '',
    min_rsi: '',
    max_rsi: '',
    volume_spike: false,
    wk52_high_breakout: false,
    above_dma_50: false,
    above_dma_200: false,
    sort_by: 'total_score',
    sort_desc: true
  });
  
  const [assets, setAssets] = useState<ScreenerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiInsights, setAiInsights] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchScreenerData = useCallback(async (currentFilters: ScreenerFilterState) => {
    setIsLoading(true);
    setError(null);
    setAiInsights("");
    
    try {
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([k, v]) => {
          if (v === true) params.append(k, 'true');
          else if (v === false) params.append(k, 'false');
          else if (typeof v === 'string' && v.trim() !== '' && v !== 'All') {
              params.append(k, v);
          }
      });

      const response = await fetch(`http://127.0.0.1:8000/api/v1/market/screener?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch screener data');
      }
      const data = await response.json();
      const fetchedAssets = data.results || [];
      setAssets(fetchedAssets);

      // Fetch AI insights for the top 5
      if (fetchedAssets.length > 0) {
          fetchAiInsights(fetchedAssets.slice(0, 5).map((a: any) => a.symbol));
      }

    } catch (err) {
      console.error("Error fetching screener:", err);
      setError('Could not retrieve market data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAiInsights = async (symbols: string[]) => {
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/v1/market/screener/ai-insights`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbols })
          });
          const data = await res.json();
          if (data && data.insights) {
              setAiInsights(data.insights);
          }
      } catch(e) {
          console.error("Failed to fetch AI insights", e);
      }
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiLoading(true);
    setAiMessage("");
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/market/screener/ai-assistant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery })
        });
        const data = await res.json();
        
        if (data.is_ambiguous) {
            setAiMessage(data.message);
        } else {
            // Apply the AI extracted filters
            const newFilters = { ...filters };
            // reset previous
            Object.keys(newFilters).forEach(k => {
                if(k !== 'sector' && k !== 'sort_by' && k !== 'sort_desc') {
                    (newFilters as any)[k] = typeof (newFilters as any)[k] === 'boolean' ? false: '';
                }
            });
            
            if (data.filters) {
                Object.keys(data.filters).forEach(k => {
                   if(newFilters.hasOwnProperty(k)){
                       (newFilters as any)[k] = data.filters[k];
                   }
                });
            }
            setFilters(newFilters);
            setAiMessage("Applied AI generated filters!");
            if (data.results && data.results.length > 0) {
               setAssets(data.results);
               fetchAiInsights(data.results.slice(0, 5).map((a: any) => a.symbol));
            } else {
               fetchScreenerData(newFilters);
            }
        }
    } catch(e) {
        setAiMessage("Failed to process AI query");
    } finally {
        setIsAiLoading(false);
    }
  };

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
              AI Powered Screener
            </h1>
            <p className="text-slate-400 mt-2 text-lg">
              Find top-performing Indian stocks using natural language or advanced filters.
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }} className="hidden md:flex items-center space-x-2 text-sm text-slate-400 px-4 py-2 rounded-full backdrop-blur-md">
            <Target size={16} color="#C8F135" />
            <span className="font-medium text-slate-200">Scanning Top 500</span>
          </div>
        </div>

        {/* AI Search Bar */}
        <div className="mb-8 relative max-w-3xl">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Sparkles className={`w-5 h-5 ${isAiLoading ? "text-[#C8F135] animate-pulse" : "text-slate-400"}`} />
           </div>
           <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="E.g. Find me undervalued auto stocks with high dividend yields and momentum..."
              className="w-full bg-[#111] border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white placeholder-slate-500 focus:outline-none focus:border-[#C8F135]/50 focus:ring-1 focus:ring-[#C8F135]/50 transition-all text-lg shadow-xl shadow-black/50"
           />
           <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button 
                  onClick={handleAiSearch}
                  disabled={isAiLoading || !searchQuery.trim()}
                  className="bg-[#C8F135] hover:bg-[#b0d82d] text-black font-semibold py-2 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isAiLoading ? "Thinking..." : "Search"}
              </button>
           </div>
           {aiMessage && (
               <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${aiMessage.includes('Applied') ? 'text-[#C8F135]' : 'text-amber-400'}`}>
                 <AlertCircle size={14} />
                 {aiMessage}
               </div>
           )}
        </div>

        {/* Dynamic Filters */}
        <ScreenerFilters filters={filters} onFilterChange={setFilters} />

        {/* Error State */}
        {error && (
          <div className="w-full p-4 mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Results Table */}
        <ScreenerResultsTable assets={assets} isLoading={isLoading} aiInsights={aiInsights} />
        
      </div>
    </div>
  );
}

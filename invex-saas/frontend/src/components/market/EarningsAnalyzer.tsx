"use client"

import React, { useState } from 'react';
import { Mic, BarChart2, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface EarningsResult {
  company: string;
  quarter: string;
  sentiment_analysis: {
    management_discussion: { overall_sentiment: string };
    qa_session: { overall_sentiment: string };
  };
  financial_guidance: {
    revenue_guidance: string;
    profit_guidance: string;
  };
  vs_previous_quarter: {
    sentiment_improving: boolean;
  };
  trading_signal: {
    action: string;
    confidence: number;
  };
  key_takeaways: {
    positives: string[];
    concerns: string[];
  };
}

export function EarningsAnalyzer() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [quarter, setQuarter] = useState('Q3 2024');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EarningsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol || !quarter) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/earnings/analyze?symbol=${symbol}&quarter=${quarter}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Failed to analyze earnings call");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'POSITIVE' || sentiment === 'RAISED') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (sentiment === 'NEGATIVE' || sentiment === 'LOWERED') return 'text-red-500 bg-red-50 border-red-100';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-500" /> AI Earnings Call Analyzer
          </h2>
          <p className="text-sm text-gray-500 mt-1">Real-time NLP sentiment extraction from management commentary.</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input 
            type="text" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (e.g. INFY)" 
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
          />
          <input 
            type="text" 
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            placeholder="Quarter (e.g. Q4 2024)" 
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Analyze Call
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}
        
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Signal Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">AI Trading Signal</span>
                <span className={`text-xl font-extrabold ${
                  result.trading_signal.action.includes('BUY') ? 'text-emerald-600' : 
                  result.trading_signal.action.includes('SELL') ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {result.trading_signal.action}
                </span>
                <span className="text-xs text-gray-400 mt-1">Confidence {result.trading_signal.confidence}%</span>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2 text-center">Sentiment Tone</span>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Management</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSentimentColor(result.sentiment_analysis.management_discussion.overall_sentiment)}`}>
                    {result.sentiment_analysis.management_discussion.overall_sentiment}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Q&A Session</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSentimentColor(result.sentiment_analysis.qa_session.overall_sentiment)}`}>
                    {result.sentiment_analysis.qa_session.overall_sentiment}
                  </span>
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2 text-center">Forward Guidance</span>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Revenue</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSentimentColor(result.financial_guidance.revenue_guidance)}`}>
                    {result.financial_guidance.revenue_guidance}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Profits</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSentimentColor(result.financial_guidance.profit_guidance)}`}>
                    {result.financial_guidance.profit_guidance}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Takeaways */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Key Positives
                </h3>
                <ul className="space-y-2">
                  {result.key_takeaways.positives.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Key Concerns
                </h3>
                <ul className="space-y-2">
                  {result.key_takeaways.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

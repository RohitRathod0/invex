"use client"

import React, { useState } from 'react';
import { MessageCircle, TrendingUp, TrendingDown, AlertTriangle, Hash, Loader2, Twitter, Activity } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface SentimentResult {
  symbol: string;
  overall_sentiment: string;
  sentiment_score: number;
  social_stats: {
    total_mentions: number;
    viral_activity: boolean;
    trending_topics: string[];
  };
  signal: {
    action: string;
    reason: string;
    confidence: number;
    warning?: string;
  };
  posts_sample: Array<{
    source: string;
    author: string;
    text: string;
  }>;
}

export function SocialSentiment() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await apiClient.get(`/market/sentiment/${symbol}`);
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze social sentiment');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-emerald-500';
    if (score <= 40) return 'text-red-500';
    return 'text-amber-500';
  };

  const getBgScoreColor = (score: number) => {
    if (score >= 60) return 'bg-emerald-50 border-emerald-200';
    if (score <= 40) return 'bg-red-50 border-red-200';
    return 'bg-amber-50 border-amber-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" /> Social Sentiment Intelligence
          </h2>
          <p className="text-sm text-gray-500 mt-1">Real-time analysis of Twitter & Reddit in English and Hindi.</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input 
            type="text" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Stock Symbol (e.g. RELIANCE)" 
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Analyze Chatter
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 flex flex-col justify-center items-center text-center rounded-xl border ${getBgScoreColor(result.sentiment_score)}`}>
                <span className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Bull/Bear Index</span>
                <span className={`text-4xl font-black ${getScoreColor(result.sentiment_score)}`}>
                  {result.sentiment_score}
                </span>
                <span className="text-sm font-semibold mt-1 uppercase opacity-80">{result.overall_sentiment}</span>
                {result.social_stats.viral_activity && (
                  <span className="mt-3 text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse">
                    🔥 VIRAL ACTIVITY DETECTED
                  </span>
                )}
              </div>
              
              <div className="p-5 border border-gray-200 bg-gray-50 rounded-xl flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" /> Trending Themes
                </span>
                <ul className="space-y-2">
                  {result.social_stats.trending_topics.length > 0 ? (
                    result.social_stats.trending_topics.map((topic, i) => (
                      <li key={i} className="text-sm font-medium text-gray-800 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span> {topic}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No significant themes detected</li>
                  )}
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Total Mentions Monitored</span>
                  <span className="font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-full">{result.social_stats.total_mentions}</span>
                </div>
              </div>
            </div>

            {/* AI Signal */}
            <div className={`p-4 border rounded-xl flex items-start gap-3 ${
              result.signal.action.includes('BUY') ? 'bg-emerald-50 border-emerald-100' :
              result.signal.action.includes('AVOID') ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'
            }`}>
              {result.signal.action.includes('BUY') ? <TrendingUp className="w-6 h-6 text-emerald-600 mt-1" /> :
               result.signal.action.includes('AVOID') ? <TrendingDown className="w-6 h-6 text-red-600 mt-1" /> :
               <Activity className="w-6 h-6 text-gray-600 mt-1" />
              }
              <div>
                <h4 className="font-bold text-gray-900">{result.signal.action}</h4>
                <p className="text-sm text-gray-700 mt-1">{result.signal.reason}</p>
                {result.signal.warning && (
                  <p className="text-xs font-semibold text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {result.signal.warning}
                  </p>
                )}
              </div>
            </div>

            {/* Posts Sample */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1 flex items-center gap-2">
                <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Live Feed Sample
              </h3>
              <div className="space-y-3">
                {result.posts_sample.map((post, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-xs">{post.author}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{post.source}</span>
                    </div>
                    <p className="text-gray-700">{post.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

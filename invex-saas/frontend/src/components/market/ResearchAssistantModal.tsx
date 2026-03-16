"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, ChevronDown, Sparkles, Loader2, BookOpen } from 'lucide-react';
import apiClient from '@/api/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export function ResearchAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [symbol, setSymbol] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I am your AI Research Assistant. Ask me anything about Indian stocks, recent earnings, or market trends. Need insights on a specific stock? Enter the symbol below."
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/research/query', { 
        question: userMessage.content,
        symbol: symbol.trim() || undefined
      });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources_used
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error connecting to research engine: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-110 transition-transform z-50 text-white group"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className={`fixed right-6 z-50 transition-all duration-300 ease-in-out bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden ${isMinimized ? 'bottom-6 h-16 w-80' : 'bottom-6 h-[600px] w-[400px]'}`}>
      
      {/* Header */}
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className="bg-indigo-600 p-4 flex items-center justify-between cursor-pointer text-white flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Research Assistant</h3>
            {!isMinimized && <p className="text-xs text-indigo-200">RAG-powered Knowledge Base</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white">
            <ChevronDown className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
            className="p-1 hover:bg-red-500 rounded-md transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Target Symbol Input */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex items-center gap-2">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest w-16">Filter:</span>
             <input 
                type="text" 
                placeholder="Target Symbol (Optional, e.g. TCS)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
             />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-gray-600" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  
                  {/* Sources display */}
                  {msg.sources && msg.sources.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-2">
                           <BookOpen className="w-3 h-3" /> Sources Cited
                        </div>
                        <ul className="space-y-1">
                           {msg.sources.map((s, idx) => (
                              <li key={idx} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mr-1 mb-1">
                                {s}
                              </li>
                           ))}
                        </ul>
                     </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm border border-gray-100 p-4">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text"
                placeholder="Ask your research query..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-gray-50"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <p className="text-[10px] text-center text-gray-400 mt-2">
               AI can make mistakes. Verify important information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

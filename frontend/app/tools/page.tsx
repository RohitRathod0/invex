import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BarChart3, Calculator, Activity, TrendingUp, ArrowRight } from 'lucide-react';

const TOOLS = [
    {
        icon: BarChart3,
        name: 'Portfolio Analyzer',
        desc: 'Upload your portfolio and get an AI-powered analysis of risk, diversification, and growth potential.',
        tags: ['Free', 'AI-powered'],
        color: '#C8F135',
    },
    {
        icon: Activity,
        name: 'Market Scanner',
        desc: 'Scan NSE, BSE, and global markets in real-time for opportunities matching your investment criteria.',
        tags: ['Real-time', 'NSE/BSE'],
        color: '#3b82f6',
    },
    {
        icon: Calculator,
        name: 'Risk Calculator',
        desc: 'Input your portfolio and get a comprehensive risk score with suggestions for reducing exposure.',
        tags: ['Free', 'Interactive'],
        color: '#f97316',
    },
    {
        icon: TrendingUp,
        name: 'Forecast Engine',
        desc: 'AI-predicted 90-day forecast for your income, expenses, and portfolio value with confidence scores.',
        tags: ['AI', 'Predictive'],
        color: '#8b5cf6',
    },
];

export default function ToolsPage() {
    return (
        <main className="min-h-screen bg-[#0A0A0A]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
                <div className="text-center mb-16">
                    <p className="text-xs tracking-widest uppercase text-gray-500 mb-3">AI Tools</p>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Intelligent financial
                        <br />
                        <span className="italic" style={{ fontFamily: 'var(--font-playfair)' }}>tools at your disposal</span>
                    </h1>
                    <p className="text-gray-400 max-w-md mx-auto">Powerful AI tools designed to help you make smarter investment decisions every day.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {TOOLS.map((tool, i) => (
                        <div key={i}
                            className="group bg-[#111] border border-white/8 hover:border-white/16 rounded-3xl p-8 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${tool.color}18`, border: `1px solid ${tool.color}25` }}>
                                    <tool.icon size={24} style={{ color: tool.color }} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white text-xl font-semibold mb-2">{tool.name}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{tool.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-white/8">
                                <div className="flex gap-2">
                                    {tool.tags.map(tag => (
                                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <button className="flex items-center gap-1.5 text-sm font-medium transition-colors group-hover:text-white text-gray-500">
                                    Try it <ArrowRight size={14} style={{ color: tool.color }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </main>
    );
}

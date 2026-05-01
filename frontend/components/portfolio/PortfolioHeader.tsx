import { Plus } from 'lucide-react';

interface PortfolioHeaderProps {
    onAddClick: () => void;
}

export const PortfolioHeader = ({ onAddClick }: PortfolioHeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Your Portfolio</h1>
                <p className="text-sm text-gray-400 mt-1">Track your holdings and analyze performance in real-time.</p>
            </div>
            <button
                onClick={onAddClick}
                className="flex items-center justify-center gap-2 bg-[#C8F135] hover:bg-[#bce628] text-black font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(200,241,53,0.2)]"
            >
                <Plus size={18} />
                Add Holding
            </button>
        </div>
    );
};

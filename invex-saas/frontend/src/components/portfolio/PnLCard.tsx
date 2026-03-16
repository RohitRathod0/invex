import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PnLCardProps {
    title: string;
    value: string;
    subValue?: string;
    positive?: boolean;
    isMain?: boolean;
}

export const PnLCard = ({ title, value, subValue, positive, isMain }: PnLCardProps) => {
    return (
        <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-6 relative overflow-hidden">
            {isMain && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
            )}
            <p className="text-xs tracking-[0.15em] uppercase text-gray-500 mb-2">{title}</p>
            <div className="flex items-baseline gap-3">
                <h2 className={cn("text-4xl font-bold tracking-tight", isMain ? "text-white" : positive === false ? "text-red-400" : "text-[#C8F135]")}>
                    {value}
                </h2>
                {subValue && (
                    <div className={cn(
                        "flex items-center text-sm font-semibold",
                        positive === false ? "text-red-400" : "text-[#C8F135]"
                    )}>
                        {positive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    );
};

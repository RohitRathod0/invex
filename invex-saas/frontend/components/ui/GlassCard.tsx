import { cn } from '@/lib/utils';
import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
    return (
        <div className={cn(
            'rounded-2xl',
            'backdrop-blur-[12px]',
            'bg-white/5',
            'border border-white/8',
            hover && 'transition-all duration-300 hover:-translate-y-1 hover:bg-white/8 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)]',
            className
        )}>
            {children}
        </div>
    );
}

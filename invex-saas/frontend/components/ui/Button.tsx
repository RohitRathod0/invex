'use client';
import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'dark';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
    primary: 'bg-[#C8F135] text-black font-semibold hover:bg-[#d6f855] hover:shadow-[0_0_30px_rgba(200,241,53,0.35)]',
    ghost: 'border border-white/20 text-white hover:bg-white/10 hover:border-white/40',
    dark: 'bg-[#111] text-white border border-white/10 hover:bg-white/5',
};

export function Button({ variant = 'primary', size = 'md', href, children, className, ...props }: ButtonProps) {
    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
    };

    const base = `inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 cursor-pointer select-none whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]}`;

    if (href) {
        return (
            <a href={href} className={cn(base, className)}>
                {children}
            </a>
        );
    }
    return (
        <button className={cn(base, className)} {...props}>
            {children}
        </button>
    );
}

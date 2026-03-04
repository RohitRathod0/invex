import React from 'react';

export type TestimonialData = {
    quote: string;
    name: string;
    title: string;
    gradient: string;
    photo?: string;
};

export function TestimonialCard({ quote, name, title, gradient, photo }: TestimonialData) {
    return (
        <div
            className="rounded-2xl p-6 min-w-[300px] max-w-[320px] flex flex-col justify-between gap-6 h-[240px] flex-shrink-0 transition-transform duration-300 hover:-translate-y-1"
            style={{ background: gradient }}
        >
            {/* Quote */}
            <p className="text-white text-sm leading-relaxed">
                &ldquo;{quote}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 mt-auto">
                {photo ? (
                    <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-black/30 border border-white/20 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{name[0]}</span>
                    </div>
                )}
                <div>
                    <p className="text-white font-semibold text-sm italic font-serif">{name}</p>
                    <p className="text-white/60 text-xs">{title}</p>
                </div>
            </div>
        </div>
    );
}

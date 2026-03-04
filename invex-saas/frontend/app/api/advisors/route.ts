import { NextResponse } from 'next/server';

const ADVISORS = [
    { id: '1', name: 'Sarah Chen', specialty: 'Growth Investing', rating: 4.9, photo: 'https://randomuser.me/api/portraits/women/44.jpg', bio: 'Former Goldman Sachs analyst specializing in high-growth tech and emerging markets.' },
    { id: '2', name: 'Marcus Williams', specialty: 'Risk Management', rating: 4.8, photo: 'https://randomuser.me/api/portraits/men/32.jpg', bio: 'Certified risk manager with 15 years hedging portfolio volatility for HNI clients.' },
    { id: '3', name: 'Priya Patel', specialty: 'Retirement Planning', rating: 4.95, photo: 'https://randomuser.me/api/portraits/women/68.jpg', bio: 'Retirement specialist helping clients build tax-efficient long-term wealth.' },
    { id: '4', name: 'James Park', specialty: 'Cryptocurrency', rating: 4.7, photo: 'https://randomuser.me/api/portraits/men/75.jpg', bio: 'DeFi expert advising on crypto portfolio construction and on-chain yield strategies.' },
];

export async function GET() {
    return NextResponse.json({ advisors: ADVISORS });
}

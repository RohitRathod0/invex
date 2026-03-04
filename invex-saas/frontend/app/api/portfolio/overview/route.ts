import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        totalBalance: 14250,
        income: 15500,
        investments: 4250,
        expenses: 8200,
        monthlyChange: 2.4,
    });
}

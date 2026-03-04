import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { message } = await req.json();

    // Mock AI response — replace with OpenAI/Claude in production
    const responses: Record<string, string> = {
        default: "Based on your financial profile, I can help you make smarter investment decisions. What would you like to know?",
        invest: "Based on your current income and expenses, you'll have around $800 in available balance. Investing $500 is within reach — that still leaves a comfortable $300 buffer. I'd recommend starting with a diversified ETF.",
        portfolio: "Your current portfolio shows a well-balanced allocation with 45% stocks, 30% mutual funds, 15% gold, and 10% crypto. Risk level: moderate.",
    };

    const lower = message.toLowerCase();
    let reply = responses.default;
    if (lower.includes('invest') || lower.includes('afford')) reply = responses.invest;
    if (lower.includes('portfolio')) reply = responses.portfolio;

    return NextResponse.json({
        reply,
        suggestions: [
            "What's my risk exposure?",
            "Show me this month's cash flow",
            "Recommend a safe investment option",
        ],
    });
}

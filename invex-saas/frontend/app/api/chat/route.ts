import { NextRequest, NextResponse } from 'next/server';

// ─── Mode-specific system prompts ────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
    'agent-debrief': `You are the Invex AI debrief assistant. A CrewAI analysis report was just completed. The user wants to understand specific decisions. Rules:
1. Answer in plain, jargon-free English as if talking to a first-time investor
2. Attribute insights to specific agents: 🔵 Market Analyst, 🔴 Risk Manager, 🟡 Macro Economist, 🟢 Sector Specialist
3. End every answer with a confidence level: "Confidence: HIGH/MEDIUM/LOW — reason"
4. Keep answers concise (3-5 sentences max)
5. If user asks about a recommendation, explain the specific data/event that drove it
Context: {analysis_context}`,

    'news-radar': `You are the Invex AI News Radar. The user wants to know how today's financial news affects their portfolio. Rules:
1. For each news item, calculate specific % impact on Indian assets (Nifty, HDFC Bank, Gold, etc.)
2. Format: "[News headline] → Impact on [Asset]: [+/-X%] because [1-sentence reason]"
3. End with: "PORTFOLIO SIGNAL: BUY/SELL/HOLD [asset] — [brief reason]"
4. Be direct and specific. No hedging. The user needs actionable information.
5. If news is very impactful, say "⚠️ HIGH IMPACT" at the start`,

    'what-if': `You are the Invex AI What-If Simulator. The user wants to run a historical investment scenario.
You MUST respond with valid JSON in this exact format:
{
  "explanation": "1-2 sentence plain English explanation of the outcome",
  "pnl": "+₹12,400 (24.8% return)",
  "cagr": "28.4% CAGR",
  "vs_benchmark": "Nifty 50 gave 18% in same period — you beat the market",
  "chartData": [{"date": "Jan 2024", "value": 100000}, {"date": "Feb 2024", "value": 108000}, ...],
  "suggestions": ["What if you added ₹5K every month (SIP)?", "Compare with Gold ETF instead"],
  "verdict": "GOOD_DECISION" | "BAD_DECISION" | "NEUTRAL"
}
Generate realistic Indian market data. chartData must have 12+ data points. Use ₹ for currency.`,

    'calm-mode': `You are the Calm Mode guardian for Invex AI. The user is emotionally reacting to market news. Rules:
1. ALWAYS start with empathy. Acknowledge their fear first. ("I understand — watching numbers fall is genuinely uncomfortable.")
2. Then show data: "But here's what history says about this exact situation..."
3. Show the NIFTY 50 historical recovery pattern: avg recovery from 2% drops = 11 trading days
4. Ask ONE clarifying question before any action: "Before we do anything, what specifically worries you most?"
5. If they still want to sell, ask 3 confirmation questions, one at a time
6. NEVER tell them what to do. Guide them to their own conclusion.
7. Tone: warm friend who happens to know finance. Not a robot. Not alarmist.
8. Include this recovery stat: "In 87% of market drops >2%, NIFTY recovered fully within 3 weeks."`,

    'memory': `You are the Invex AI Memory Assistant. You have access to the user's stored profile and past decisions. Rules:
1. Reference specific past interactions: "Last time you asked about X..."
2. Track decisions: "You chose to invest ₹50K in Nifty on [date]. Here's how it's performing..."  
3. Proactively share updates: "Since your last question about HDFC Bank, their Q3 results are out..."
4. Speak personally. Use the user's name. Reference their specific risk tolerance and goals.
5. Help them see patterns in their own behavior (good and bad)
User Memory: {memory_context}`,

    'default': `You are Invex AI — India's most intelligent investment co-pilot. Rules:
1. Answer in plain English. No jargon unless explained.
2. Always ground answers in Indian market context (NSE/BSE, RBI, SEBI)
3. Give specific, actionable answers — not generic advice
4. Use ₹ for currency. Reference real Indian financial instruments.
5. Be concise: 3-5 sentences max unless user asks for detail`,
};

// ─── Panic trigger detection ──────────────────────────────────────────────────
function detectPanicTrigger(message: string): boolean {
    const words = ['scared', 'panic', 'crash', 'should i sell', 'losing', 'worried', 'falling', 'drop', 'sell everything', 'pull out'];
    return words.some(w => message.toLowerCase().includes(w));
}

// ─── What-if data extraction ──────────────────────────────────────────────────
function parseWhatIfResponse(text: string): {
    isWhatIf: boolean;
    parsed?: Record<string, unknown>;
    raw: string;
} {
    try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.chartData) return { isWhatIf: true, parsed, raw: text };
        }
    } catch { }
    return { isWhatIf: false, raw: text };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const { message, mode = 'default', context = {}, memoryContext = '' } = await req.json();

        // Auto-upgrade to calm mode if panic detected
        const effectiveMode = detectPanicTrigger(message) ? 'calm-mode' : mode;

        let systemPrompt = SYSTEM_PROMPTS[effectiveMode] || SYSTEM_PROMPTS.default;
        systemPrompt = systemPrompt
            .replace('{analysis_context}', context.analysisReport || 'No recent analysis loaded.')
            .replace('{memory_context}', memoryContext || 'No saved memory yet.');

        // Build the full prompt for the backend
        const fullPrompt = `${systemPrompt}\n\n---\nUser: ${message}`;

        // Call the backend agent endpoint
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

        // First create/get a session
        let sessionId = context.sessionId;
        if (!sessionId) {
            const sessionRes = await fetch(`${backendUrl}/api/v1/sessions/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_name: context.userName || 'Invex User' }),
            });
            if (sessionRes.ok) {
                const sd = await sessionRes.json();
                sessionId = sd.session_id;
            }
        }

        // Run the agent with the mode-specific prompt
        const agentRes = await fetch(`${backendUrl}/api/v1/agents/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                message: fullPrompt,
                inputs: context.inputs || {},
            }),
        });

        if (!agentRes.ok) throw new Error(`Backend error: ${agentRes.status}`);
        const agentData = await agentRes.json();

        if (agentData.status === 'failed') throw new Error(agentData.error || 'Agent failed');

        const replyText: string = agentData.result || agentData.output || "I couldn't process that. Try again.";

        // Check if what-if mode — parse chart data
        const { isWhatIf, parsed: whatIfData } = parseWhatIfResponse(replyText);

        // Mode-specific quick suggestions
        const SUGGESTIONS: Record<string, string[]> = {
            'agent-debrief': ["Why did you rate this BUY?", "What's the biggest risk in this analysis?", "How confident are you?"],
            'news-radar': ["How does this affect my Nifty ETF?", "Any buying opportunities in this news?", "Should I hedge?"],
            'what-if': ["What if I invested monthly instead?", "Compare with Gold ETF", "What's the best entry point?"],
            'calm-mode': ["Show me the recovery history", "What should I avoid doing now?", "Is this different from 2020?"],
            'memory': ["What have I asked before?", "How are my past decisions performing?", "Update my risk profile"],
            'default': ["Analyze my portfolio risk", "Best SIP options right now", "Should I buy gold now?"],
        };

        return NextResponse.json({
            mode: effectiveMode,
            panicTriggered: effectiveMode === 'calm-mode' && mode !== 'calm-mode',
            reply: isWhatIf ? (whatIfData as Record<string, unknown>)?.explanation || replyText : replyText,
            type: isWhatIf ? 'chart' : 'text',
            chartData: isWhatIf ? whatIfData : null,
            suggestions: SUGGESTIONS[effectiveMode] || SUGGESTIONS.default,
            sessionId,
        });

    } catch (err: unknown) {
        const error = err as Error;
        // Fallback responses when backend is down
        const FALLBACKS: Record<string, string> = {
            'calm-mode': "I understand the market drop is unsettling. Here's the key stat: NIFTY 50 has recovered from drops >2% in an average of 11 trading days, 87% of the time. Before you make any decisions, tell me — what specifically worries you most about your current holdings?",
            'agent-debrief': "Let me walk you through the analysis. The Market Analyst 🔵 flagged current valuation concerns, while the Risk Manager 🔴 highlighted volatility. What specific aspect would you like me to explain?",
            'default': "I'm having trouble connecting to the analysis engine right now. Please ensure the backend is running on port 8000. In the meantime, what would you like to know about your investments?",
        };
        return NextResponse.json({
            error: error.message,
            reply: FALLBACKS[error.message] || FALLBACKS.default,
            type: 'text',
            mode: 'default',
            suggestions: ["Try again", "Check backend connection", "View news instead"],
        }, { status: 200 }); // Return 200 so UI still shows fallback
    }
}

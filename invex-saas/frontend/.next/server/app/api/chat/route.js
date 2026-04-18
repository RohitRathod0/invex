"use strict";(()=>{var e={};e.id=744,e.ids=[744],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},12331:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>f,requestAsyncStorage:()=>h,routeModule:()=>d,serverHooks:()=>p,staticGenerationAsyncStorage:()=>u});var s={};a.r(s),a.d(s,{POST:()=>c});var n=a(49303),i=a(88716),o=a(60670),r=a(87070);let l={"agent-debrief":`You are the Invex AI debrief assistant. A CrewAI analysis report was just completed. The user wants to understand specific decisions. Rules:
1. Answer in plain, jargon-free English as if talking to a first-time investor
2. Attribute insights to specific agents: 🔵 Market Analyst, 🔴 Risk Manager, 🟡 Macro Economist, 🟢 Sector Specialist
3. End every answer with a confidence level: "Confidence: HIGH/MEDIUM/LOW — reason"
4. Keep answers concise (3-5 sentences max)
5. If user asks about a recommendation, explain the specific data/event that drove it
Context: {analysis_context}`,"news-radar":`You are the Invex AI News Radar. The user wants to know how today's financial news affects their portfolio. Rules:
1. For each news item, calculate specific % impact on Indian assets (Nifty, HDFC Bank, Gold, etc.)
2. Format: "[News headline] → Impact on [Asset]: [+/-X%] because [1-sentence reason]"
3. End with: "PORTFOLIO SIGNAL: BUY/SELL/HOLD [asset] — [brief reason]"
4. Be direct and specific. No hedging. The user needs actionable information.
5. If news is very impactful, say "⚠️ HIGH IMPACT" at the start`,"what-if":`You are the Invex AI What-If Simulator. The user wants to run a historical investment scenario.
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
Generate realistic Indian market data. chartData must have 12+ data points. Use ₹ for currency.`,"calm-mode":`You are the Calm Mode guardian for Invex AI. The user is emotionally reacting to market news. Rules:
1. ALWAYS start with empathy. Acknowledge their fear first. ("I understand — watching numbers fall is genuinely uncomfortable.")
2. Then show data: "But here's what history says about this exact situation..."
3. Show the NIFTY 50 historical recovery pattern: avg recovery from 2% drops = 11 trading days
4. Ask ONE clarifying question before any action: "Before we do anything, what specifically worries you most?"
5. If they still want to sell, ask 3 confirmation questions, one at a time
6. NEVER tell them what to do. Guide them to their own conclusion.
7. Tone: warm friend who happens to know finance. Not a robot. Not alarmist.
8. Include this recovery stat: "In 87% of market drops >2%, NIFTY recovered fully within 3 weeks."`,memory:`You are the Invex AI Memory Assistant. You have access to the user's stored profile and past decisions. Rules:
1. Reference specific past interactions: "Last time you asked about X..."
2. Track decisions: "You chose to invest ₹50K in Nifty on [date]. Here's how it's performing..."  
3. Proactively share updates: "Since your last question about HDFC Bank, their Q3 results are out..."
4. Speak personally. Use the user's name. Reference their specific risk tolerance and goals.
5. Help them see patterns in their own behavior (good and bad)
User Memory: {memory_context}`,default:`You are Invex AI — India's most intelligent investment co-pilot. Rules:
1. Answer in plain English. No jargon unless explained.
2. Always ground answers in Indian market context (NSE/BSE, RBI, SEBI)
3. Give specific, actionable answers — not generic advice
4. Use ₹ for currency. Reference real Indian financial instruments.
5. Be concise: 3-5 sentences max unless user asks for detail`};async function c(e){try{let{message:t,mode:a="default",context:s={},memoryContext:n=""}=await e.json(),i=["scared","panic","crash","should i sell","losing","worried","falling","drop","sell everything","pull out"].some(e=>t.toLowerCase().includes(e))?"calm-mode":a,o=l[i]||l.default;o=o.replace("{analysis_context}",s.analysisReport||"No recent analysis loaded.").replace("{memory_context}",n||"No saved memory yet.");let c=`${o}

---
User: ${t}`,d="http://localhost:8000",h=s.sessionId;if(!h){let e=await fetch(`${d}/api/v1/sessions/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_name:s.userName||"Invex User"})});e.ok&&(h=(await e.json()).session_id)}let u=await fetch(`${d}/api/v1/chat/message`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:c,session_id:h,context:s.inputs||{}})});if(!u.ok)throw Error(`Backend error: ${u.status}`);let p=await u.json();if("failed"===p.status)throw Error(p.reply||"Chat engine failed");let m=p.reply||"I couldn't process that. Try again.",{isWhatIf:f,parsed:y}=function(e){try{let t=e.match(/\{[\s\S]*\}/);if(t){let a=JSON.parse(t[0]);if(a.chartData)return{isWhatIf:!0,parsed:a,raw:e}}}catch{}return{isWhatIf:!1,raw:e}}(m),g={"agent-debrief":["Why did you rate this BUY?","What's the biggest risk in this analysis?","How confident are you?"],"news-radar":["How does this affect my Nifty ETF?","Any buying opportunities in this news?","Should I hedge?"],"what-if":["What if I invested monthly instead?","Compare with Gold ETF","What's the best entry point?"],"calm-mode":["Show me the recovery history","What should I avoid doing now?","Is this different from 2020?"],memory:["What have I asked before?","How are my past decisions performing?","Update my risk profile"],default:["Analyze my portfolio risk","Best SIP options right now","Should I buy gold now?"]};return r.NextResponse.json({mode:i,panicTriggered:"calm-mode"===i&&"calm-mode"!==a,reply:f&&y?.explanation||m,type:f?"chart":"text",chartData:f?y:null,suggestions:g[i]||g.default,sessionId:h})}catch(t){let e={"calm-mode":"I understand the market drop is unsettling. Here's the key stat: NIFTY 50 has recovered from drops >2% in an average of 11 trading days, 87% of the time. Before you make any decisions, tell me — what specifically worries you most about your current holdings?","agent-debrief":"Let me walk you through the analysis. The Market Analyst \uD83D\uDD35 flagged current valuation concerns, while the Risk Manager \uD83D\uDD34 highlighted volatility. What specific aspect would you like me to explain?",default:"I'm having trouble connecting to the analysis engine right now. Please ensure the backend is running on port 8000. In the meantime, what would you like to know about your investments?"};return r.NextResponse.json({error:t.message,reply:e[t.message]||e.default,type:"text",mode:"default",suggestions:["Try again","Check backend connection","View news instead"]},{status:200})}}let d=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/chat/route",pathname:"/api/chat",filename:"route",bundlePath:"app/api/chat/route"},resolvedPagePath:"C:\\Users\\rohit\\OneDrive\\Desktop\\invex\\invex-saas\\frontend\\app\\api\\chat\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:h,staticGenerationAsyncStorage:u,serverHooks:p}=d,m="/api/chat/route";function f(){return(0,o.patchFetch)({serverHooks:p,staticGenerationAsyncStorage:u})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[948,972],()=>a(12331));module.exports=s})();
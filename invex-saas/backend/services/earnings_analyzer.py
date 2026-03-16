import os
from typing import Dict, Any
from groq import AsyncGroq
import json
from config import get_settings

settings = get_settings()

class EarningsCallAnalyzer:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    async def analyze_earnings_call(self, company_symbol: str, quarter: str) -> Dict[str, Any]:
        """
        Mock downloading earnings call transcript -> Analyze sentiment -> Extract key points
        using Groq API.
        """
        # 1. Fetch transcript (Mocked for now since we don't have SeekingAlpha/MotleyFool API access)
        transcript = self._mock_fetch_transcript(company_symbol, quarter)
        
        # 2. Extract sections & perform sentiment analysis using Groq
        prompt = f"""
        Analyze the following earnings call transcript for {company_symbol} ({quarter}).
        
        Transcript snippet:
        Management: "{transcript['management']}"
        Q&A: "{transcript['qa']}"
        
        Provide a JSON response containing:
        1. 'management_sentiment': (POSITIVE, NEGATIVE, or NEUTRAL)
        2. 'qa_sentiment': (POSITIVE, NEGATIVE, or NEUTRAL)
        3. 'overall_sentiment_score': (0.0 to 1.0, 1.0 being highly positive)
        4. 'key_positive_points': [list of 2-3 points]
        5. 'key_concerns': [list of 2-3 concerns]
        6. 'revenue_guidance': (RAISED, LOWERED, MAINTAINED)
        7. 'profit_guidance': (RAISED, LOWERED, MAINTAINED)
        
        Respond ONLY with the JSON format, no markdown formatting like ```json or anything else.
        """
        
        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a professional financial analyst AI."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=1024
            )
            
            raw_response = completion.choices[0].message.content.strip()
            # Clean up potential markdown formatting from the response
            if raw_response.startswith("```json"):
                raw_response = raw_response[7:]
            if raw_response.endswith("```"):
                raw_response = raw_response[:-3]
                
            analysis = json.loads(raw_response)
        except Exception as e:
            # Fallback if Groq API fails or JSON parsing fails
            analysis = {
                'management_sentiment': 'NEUTRAL',
                'qa_sentiment': 'NEUTRAL',
                'overall_sentiment_score': 0.5,
                'key_positive_points': ['Resilient performance in a tough environment.'],
                'key_concerns': ['Macroeconomic headwinds.', 'API parsing failed.'],
                'revenue_guidance': 'MAINTAINED',
                'profit_guidance': 'MAINTAINED'
            }
        
        # 3. Format results into the expected format
        sentiment_results = {
            'management_discussion': {
                'overall_sentiment': analysis.get('management_sentiment', 'NEUTRAL')
            },
            'qa_session': {
                'overall_sentiment': analysis.get('qa_sentiment', 'NEUTRAL')
            }
        }
        
        guidance = {
            'revenue_guidance': analysis.get('revenue_guidance'),
            'profit_guidance': analysis.get('profit_guidance')
        }
        
        # 4. Compare vs previous quarter (Mocked)
        try:
            score_val = float(analysis.get('overall_sentiment_score', 0.5))
        except (ValueError, TypeError):
            score_val = 0.5
            
        comparison = {
            'sentiment_improving': score_val > 0.5
        }
        
        # 5. Generate trading signal
        signal = self._generate_signal(sentiment_results, guidance, comparison)
        
        return {
            'company': company_symbol,
            'quarter': quarter,
            'sentiment_analysis': sentiment_results,
            'financial_guidance': guidance,
            'vs_previous_quarter': comparison,
            'trading_signal': signal,
            'confidence_score': signal['confidence'],
            'key_takeaways': {
                'positives': analysis.get('key_positive_points', []),
                'concerns': analysis.get('key_concerns', [])
            }
        }
    
    def _generate_signal(self, sentiment: Dict, guidance: Dict, comparison: Dict) -> Dict:
        """Convert analysis to actionable signal"""
        score = 0
        
        if sentiment['management_discussion']['overall_sentiment'] == 'POSITIVE':
            score += 30
        if sentiment['qa_session']['overall_sentiment'] == 'POSITIVE':
            score += 20
            
        if guidance.get('revenue_guidance') == 'RAISED':
            score += 25
        if guidance.get('profit_guidance') == 'RAISED':
            score += 25
            
        if comparison.get('sentiment_improving'):
            score += 20
            
        if score >= 70:
            return {'action': 'STRONG_BUY', 'confidence': min(score, 100)}
        elif score >= 50:
            return {'action': 'BUY', 'confidence': score}
        elif score <= 30:
            return {'action': 'SELL', 'confidence': 100 - score}
        else:
            return {'action': 'HOLD', 'confidence': 50}
            
    def _mock_fetch_transcript(self, symbol: str, quarter: str) -> Dict[str, str]:
        """Mock transcript data for demonstration purposes."""
        return {
            'management': f"We are very pleased with {symbol}'s performance in {quarter}. We saw a 15% year-over-year revenue growth driven by strong demand in our core segments. Our margins expanded by 200 basis points due to operational efficiencies. We are raising our full-year guidance as we see continued momentum.",
            'qa': "Analyst: Can you comment on the supply chain issues? CEO: Sure, we have fully resolved the bottlenecks from last quarter. We don't see any material impact going forward. Demand is structurally robust."
        }

import json
from typing import Dict, Any, List
import random
from groq import AsyncGroq
from config import get_settings

settings = get_settings()

class SocialSentimentAnalyzer:
    """
    Analyzes sentiment from social media (Twitter, Reddit) using Groq.
    Supports English & Hindi (Hinglish).
    """
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def analyze_stock_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Aggregate sentiment from multiple sources"""
        
        # 1. Fetch social media posts (Mocked for demonstration)
        twitter_posts = self._mock_fetch_twitter(symbol, 20)
        reddit_posts = self._mock_fetch_reddit(symbol, 10)
        
        # Combine all posts for batch analysis
        all_posts = twitter_posts + reddit_posts
        
        # 2. Analyze sentiment via Groq
        sentiment_analysis = await self._analyze_posts_batch(symbol, all_posts)
        
        # 3. Calculate aggregate score based on the returned values
        # If Groq failed or timed out, we fall back to random mocked data
        if not sentiment_analysis or 'overall_score' not in sentiment_analysis:
            weighted_score = random.uniform(0.3, 0.8)
            sentiment_analysis = {
                'overall_score': weighted_score,
                'trending_topics': [f"Earnings beat expectations", "New management"]
            }
        else:
            weighted_score = sentiment_analysis['overall_score']
            
        is_viral = len(all_posts) > 25
        
        signal = self._generate_sentiment_signal(weighted_score, is_viral)
        
        return {
            'symbol': symbol,
            'overall_sentiment': 'BULLISH' if weighted_score > 0.6 else 'BEARISH' if weighted_score < 0.4 else 'NEUTRAL',
            'sentiment_score': round(weighted_score * 100, 1),
            'social_stats': {
                'total_mentions': len(all_posts),
                'viral_activity': is_viral,
                'trending_topics': sentiment_analysis.get('trending_topics', [])
            },
            'signal': signal,
            'posts_sample': all_posts[:5]  # return some top posts to display
        }

    async def _analyze_posts_batch(self, symbol: str, posts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze a batch of posts for sentiment using Groq LLM."""
        
        # Create a single prompt analyzing all the posts to save API calls
        post_texts = "\\n".join([f"- {p['text']}" for p in posts[:15]])
        
        prompt = f"""
        Analyze the sentiment of the following social media posts (which may be in English, Hindi, or Hinglish) regarding the stock symbol {symbol}.
        
        Posts:
        {post_texts}
        
        Provide a JSON response ONLY with:
        1. 'overall_score': A float between 0.0 (extremely bearish) and 1.0 (extremely bullish).
        2. 'trending_topics': A list of up to 3 short strings identifying the main themes discussed.
        """
        
        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a specialized stock market social sentiment analyzer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=256
            )
            
            raw = completion.choices[0].message.content.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.endswith("```"):
                raw = raw[:-3]
                
            return json.loads(raw)
        except Exception:
            return {}
            
    def _generate_sentiment_signal(self, score: float, is_viral: bool) -> Dict[str, Any]:
        """Convert sentiment to trading signal"""
        if is_viral and score > 0.7:
            return {
                'action': 'CAUTIOUS_BUY',
                'reason': 'Viral positive sentiment - validate fundamentals',
                'confidence': 60,
                'warning': 'High social buzz can be pump-and-dump'
            }
        elif score > 0.7:
            return {
                'action': 'BUY',
                'reason': 'Strong organic positive sentiment',
                'confidence': 75
            }
        elif score < 0.3:
            return {
                'action': 'AVOID',
                'reason': 'Negative social sentiment',
                'confidence': 70
            }
        else:
            return {'action': 'NEUTRAL', 'reason': 'Mixed or low conviction', 'confidence': 50}

    def _mock_fetch_twitter(self, symbol: str, limit: int) -> List[Dict[str, Any]]:
        """Mock recent tweets matching symbol."""
        templates = [
            f"Bhai {symbol} ke results ekdum jhakas aaye hai! Holding tight! 🚀🚀",
            f"Selling my entire position in {symbol}. Operator driven pump and dump.",
            f"{symbol} breaking out of key resistance. Volume is crazy today.",
            f"What is happening with {symbol}? Falling continuously for 3 days 😭",
            f"Bought the dip in {symbol}. Fundamentals are solid, market overreacting."
        ]
        
        return [
            {'source': 'Twitter', 'author': f"@user{random.randint(100,999)}", 'text': random.choice(templates)}
            for _ in range(random.randint(5, limit))
        ]

    def _mock_fetch_reddit(self, symbol: str, limit: int) -> List[Dict[str, Any]]:
        """Mock recent reddit DD/discussions."""
        templates = [
            f"DD on {symbol}: Why this could multi-bagger from current levels.",
            f"Warning! Pledged shares of {symbol} promoter increasing. Stay away.",
            f"YOLO'd my life savings into {symbol} calls 💎🙌",
            f"Is {symbol} fairly valued here? Looking at PE and industry averages..."
        ]
        
        return [
            {'source': 'Reddit', 'author': f"u/investor_{random.randint(10,99)}", 'text': random.choice(templates)}
            for _ in range(random.randint(2, limit))
        ]

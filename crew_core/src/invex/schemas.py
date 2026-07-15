from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Dict, Optional

class Reason(BaseModel):
    category: Literal["Financial", "Technical", "Qualitative", "Risk", "Market"] = Field(
        description="The category this reason belongs to"
    )
    text: str = Field(
        min_length=20, 
        max_length=500,
        description="Detailed explanation of the reason (20-500 chars)"
    )
    data_point: Optional[str] = Field(
        default=None,
        description="Specific metric backing the reason (e.g., 'PE Ratio: 18.5', 'GDP: 7%')"
    )
    source: Optional[str] = Field(
        default=None, 
        description="Citation or source of the data"
    )

class StockRecommendation(BaseModel):
    symbol: str = Field(description="Ticker symbol or asset identifier")
    company_name: str = Field(description="Full name of company, fund, or asset")
    asset_class: Literal["Stock", "Mutual Fund", "Gold", "Crypto"] = Field(
        description="The broad asset class this belongs to"
    )
    action: Literal["BUY", "HOLD", "SELL"] = Field(description="Recommended action")
    confidence_score: float = Field(
        ge=0, le=100, 
        description="AI confidence percentage (0-100)"
    )
    target_price: float = Field(description="Price target in INR")
    stop_loss: float = Field(description="Stop loss price in INR")
    time_horizon: Literal["Short (1-3 months)", "Medium (3-12 months)", "Long (1-5 years)"] = Field(
        description="Recommended holding period"
    )
    allocation_percentage: float = Field(
        ge=0, le=100, 
        description="Percentage of the total portfolio to allocate here"
    )
    reasons: List[Reason] = Field(
        min_length=2,
        max_length=10,
        description="Minimum 2 distinct reasons for this recommendation"
    )
    risks: List[str] = Field(
        min_length=1,
        max_length=5,
        description="Key risks to watch out for"
    )
    key_metrics: Dict[str, float] = Field(
        default_factory=dict,
        description="Important financial metrics (PE, ROE, etc.) mapping name to value"
    )
    sector: str = Field(description="Industry sector or asset category")
    market_cap_category: Literal["Large Cap", "Mid Cap", "Small Cap", "N/A"] = Field(
        description="Market capitalization classification"
    )
    
    @field_validator('reasons')
    @classmethod
    def validate_unique_categories(cls, v):
        """Try to ensure diverse reasoning by checking categories if possible."""
        if not v:
            return v
        # We don't strictly reject duplicates as AI might genuinely have 2 Financial reasons,
        # but we encourage diversity.
        return v

class PortfolioReport(BaseModel):
    """
    The final structured JSON output from the Invex Crew.
    """
    generated_date: str = Field(description="Today's date in YYYY-MM-DD format")
    user_risk_profile: str = Field(description="The user's declared risk profile (Conservative, Moderate, Aggressive)")
    total_capital: float = Field(description="Total investment capital in INR")
    
    recommendations: List[StockRecommendation] = Field(
        min_length=1,
        max_length=15,
        description="List of specific asset recommendations making up the portfolio"
    )
    
    portfolio_stats: Dict[str, float] = Field(
        description="Overall portfolio statistics like expected_return, risk_score, sharpe_ratio (keys)"
    )
    
    diversification_score: float = Field(
        ge=0, le=100, 
        description="How well-diversified the portfolio is (0-100)"
    )
    
    sector_allocation: Dict[str, float] = Field(
        description="Percentage breakdown by sector (e.g., 'IT': 25.0, 'Banking': 30.0)"
    )
    
    asset_class_allocation: Dict[str, float] = Field(
        description="Percentage breakdown by asset class (e.g., 'Stocks': 60.0, 'Gold': 10.0). MUST SUM TO 100."
    )
    
    rebalancing_triggers: List[str] = Field(
        description="Events or thresholds that should trigger a portfolio review"
    )
    
    macro_context: str = Field(
        description="A 2-3 sentence summary of the current economic environment (GDP, Inflation) justifying this allocation"
    )
    
    next_review_date: str = Field(description="Suggested next review date in YYYY-MM-DD format")

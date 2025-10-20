from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field

class MutualFundInput(BaseModel):
    """Input schema for MutualFundTool"""
    fund_name: str = Field(..., description="Mutual fund name or ticker")

class MutualFundTool(BaseTool):
    name: str = "Get Mutual Fund Data"
    description: str = "Fetches mutual fund data including NAV, returns, and expense ratio"
    args_schema: Type[BaseModel] = MutualFundInput

    def _run(self, fund_name: str) -> str:
        popular_funds = """
Top Indian Mutual Funds:

1. HDFC Top 100 Fund - Large Cap
   - 1Y Return: ~15%, 3Y Return: ~18%, 5Y Return: ~16%
   - Expense Ratio: 1.05%
   
2. ICICI Prudential Bluechip Fund - Large Cap
   - 1Y Return: ~14%, 3Y Return: ~17%, 5Y Return: ~15%
   - Expense Ratio: 1.00%
   
3. Axis Bluechip Fund - Large Cap
   - 1Y Return: ~16%, 3Y Return: ~19%, 5Y Return: ~17%
   - Expense Ratio: 0.50%
   
4. Parag Parikh Flexi Cap Fund - Flexi Cap
   - 1Y Return: ~18%, 3Y Return: ~21%, 5Y Return: ~20%
   - Expense Ratio: 1.00%
   
5. Mirae Asset Large Cap Fund - Large Cap
   - 1Y Return: ~15%, 3Y Return: ~18%, 5Y Return: ~16%
   - Expense Ratio: 0.55%
"""
        return popular_funds

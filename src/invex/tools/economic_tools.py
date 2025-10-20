from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel

# Empty input schema for tools with no arguments
class EmptyInput(BaseModel):
    """Empty input schema for tools that take no arguments"""
    pass

class IndiaGDPTool(BaseTool):
    name: str = "Get India GDP Growth"
    description: str = "Fetches India's GDP growth rate"
    args_schema: Type[BaseModel] = EmptyInput  # ADD TYPE ANNOTATION

    def _run(self) -> str:
        try:
            import wbgapi as wb
            data = wb.data.DataFrame('NY.GDP.MKTP.KD.ZG', 'IND', time=range(2020, 2025), numericTimeKeys=True)
            latest_year = 2024
            gdp_growth = data.iloc[-1, 0] if not data.empty else 6.5
            return f"India GDP Growth Rate ({latest_year}): {gdp_growth:.2f}%"
        except:
            return "India GDP Growth Rate (Est. 2024): 6.5% (estimated)"

class IndiaCPITool(BaseTool):
    name: str = "Get India CPI Inflation"
    description: str = "Fetches India's CPI inflation rate"
    args_schema: Type[BaseModel] = EmptyInput  # ADD TYPE ANNOTATION

    def _run(self) -> str:
        try:
            import wbgapi as wb
            data = wb.data.DataFrame('FP.CPI.TOTL.ZG', 'IND', time=range(2020, 2025), numericTimeKeys=True)
            latest_year = 2024
            cpi = data.iloc[-1, 0] if not data.empty else 5.4
            return f"India CPI Inflation ({latest_year}): {cpi:.2f}%"
        except:
            return "India CPI Inflation (Est. 2024): 5.4% (estimated)"

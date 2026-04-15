import requests
from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field


class MutualFundInput(BaseModel):
    """Input schema for MutualFundTool"""
    fund_name: str = Field(..., description="Mutual fund name or keyword (e.g. 'HDFC Top 100', 'large cap', 'flexi cap')")


class MutualFundTool(BaseTool):
    name: str = "Get Mutual Fund Data"
    description: str = "Fetches live mutual fund NAV and performance data from mfapi.in (free, no auth). Pass a fund name or category keyword."
    args_schema: Type[BaseModel] = MutualFundInput

    def _run(self, fund_name: str) -> str:
        try:
            # mfapi.in free search endpoint — no auth needed
            search_url = f"https://api.mfapi.in/mf/search?q={requests.utils.quote(fund_name)}"
            search_res = requests.get(search_url, timeout=8)
            search_res.raise_for_status()
            results = search_res.json()

            if not results:
                return f"No mutual funds found matching '{fund_name}'. Try a broader term like 'large cap' or 'HDFC'."

            output = f"Mutual Funds matching '{fund_name}' (Live NAV from mfapi.in):\n\n"

            # Fetch NAV for top 5 results
            for fund in results[:5]:
                scheme_code = fund.get("schemeCode")
                scheme_name = fund.get("schemeName", "Unknown Fund")

                try:
                    nav_url = f"https://api.mfapi.in/mf/{scheme_code}"
                    nav_res = requests.get(nav_url, timeout=6)
                    nav_data = nav_res.json()

                    meta = nav_data.get("meta", {})
                    nav_records = nav_data.get("data", [])

                    if not nav_records:
                        continue

                    latest_nav = float(nav_records[0]["nav"])
                    latest_date = nav_records[0]["date"]

                    # Calculate returns if we have enough history
                    returns_1y = "N/A"
                    returns_3m = "N/A"
                    if len(nav_records) >= 252:
                        nav_1y_ago = float(nav_records[252]["nav"])
                        returns_1y = f"{((latest_nav - nav_1y_ago) / nav_1y_ago) * 100:.2f}%"
                    if len(nav_records) >= 63:
                        nav_3m_ago = float(nav_records[63]["nav"])
                        returns_3m = f"{((latest_nav - nav_3m_ago) / nav_3m_ago) * 100:.2f}%"

                    output += f"• **{scheme_name}**\n"
                    output += f"  - NAV: ₹{latest_nav:.4f} (as of {latest_date})\n"
                    output += f"  - 1Y Return: {returns_1y} | 3M Return: {returns_3m}\n"
                    output += f"  - Fund House: {meta.get('fund_house', 'N/A')}\n"
                    output += f"  - Category: {meta.get('scheme_category', 'N/A')}\n\n"

                except Exception:
                    # Skip individual fund fetch failures silently
                    output += f"• {scheme_name} — NAV data unavailable\n\n"
                    continue

            return output

        except requests.exceptions.Timeout:
            return "Mutual fund API timed out. mfapi.in may be slow — please retry."
        except Exception as e:
            return f"Error fetching mutual fund data: {str(e)}"

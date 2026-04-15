import time
import logging
from typing import Dict, Any

from invex.crew import Invex
from langsmith import traceable
from crewai import Crew, Task
logger = logging.getLogger("invex.deep_engine")

class DeepEngine:
    """
    Wrapper for the existing CrewAI architecture.
    Provides comprehensive analysis but takes 2-5 minutes.
    """
    
    @traceable(name="deep_engine_crew")
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        logger.info("Starting DEEP analysis using CrewAI...")
        
        # Instantiate the existing crew
        invex_crew = Invex()
        
        # Inject preferences
        if 'asset_preferences' in inputs:
            invex_crew.user_preferences = inputs['asset_preferences']
            
        try:
            # CrewAI runs synchronously
            raw_result = invex_crew.crew().kickoff(inputs=inputs)
            
            # CrewAI v0.11+ returns a CrewOutput, which has .pydantic or .json_dict if output_json was used.
            structured_data = None
            if getattr(raw_result, "json_dict", None):
                structured_data = raw_result.json_dict
            elif getattr(raw_result, "pydantic", None):
                structured_data = raw_result.pydantic.model_dump()
                
            # Schema Validation Retry Loop
            max_retries = 2
            attempt = 0
            while structured_data is None and attempt < max_retries:
                attempt += 1
                logger.warning(f"Schema Validation failed. Retrying report_writer (attempt {attempt}/{max_retries})")
                
                error_msg = "Invalid JSON structure. Ensure you strictly follow the PortfolioReport schema without markdown blocks."
                
                from invex.schemas import PortfolioReport
                fix_task = Task(
                    description=f"Your previous output was invalid.\nError: {error_msg}\n\nPrevious Raw Output:\n{raw_result.raw if hasattr(raw_result, 'raw') else str(raw_result)}\n\nFix it and output ONLY valid JSON matching the PortfolioReport schema perfectly.",
                    expected_output="A JSON object matching the PortfolioReport Pydantic schema perfectly.",
                    agent=invex_crew.report_writer(),
                    output_json=PortfolioReport
                )
                
                fix_crew = Crew(
                    agents=[invex_crew.report_writer()],
                    tasks=[fix_task],
                    verbose=True
                )
                retry_result = fix_crew.kickoff()
                
                if getattr(retry_result, "json_dict", None):
                    structured_data = retry_result.json_dict
                elif getattr(retry_result, "pydantic", None):
                    structured_data = retry_result.pydantic.model_dump()
                else:
                    raw_result = retry_result
                    
            if structured_data is None:
                raise ValueError("Failed to obtain valid structured JSON from crew after retries.")
                
            return {
                "mode": "deep",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": str(raw_result),
                    "structured_data": structured_data
                },
                "status": "success",
                "error": None
            }
        except Exception as e:
            logger.error(f"DEEP Engine failed: {e}")
            return {
                "mode": "deep",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": f"Error: {e}",
                    "structured_data": None
                },
                "status": "failed",
                "error": str(e)
            }

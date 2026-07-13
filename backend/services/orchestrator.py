import json
import logging
from google import genai

logger = logging.getLogger(__name__)

DEFAULT_OPENING_QUESTION   = "What is your primary investment goal right now?"
DEFAULT_FOLLOW_UP_QUESTION = "How would you react if your portfolio dropped by 20% in a month?"
DEFAULT_RETRY_REPLY        = "I didn't fully catch that. Could you please answer the question again in one or two simple sentences?"
DEFAULT_HOST_FAILURE_REPLY = "Let's continue the risk profiling interview. Could you tell me your primary investment goal?"

INTERVIEW_QUESTIONS = [
    "What is your primary investment goal right now?",
    "How would you react if your portfolio dropped by 20% in a month?",
    "How many months of expenses do you have saved as an emergency fund?",
    "How stable is your employment and monthly income right now?",
    "Do you have any major financial liabilities like a home loan or car loan?",
    "Are there any sectors you prefer to avoid investing in (e.g. tobacco, gambling)?",
    "Over how many years do you plan to stay invested?",
]
INTERVIEW_DONE_AFTER = 5   # complete after at least this many answered questions


async def evaluator_agent(question: str, user_answer: str) -> dict:
    """Evaluates if the user's answer is relevant."""
    prompt = f"""
    Question: {question}
    Answer: {user_answer}

    Check:
    - Is the answer relevant?
    - Is it specific?
    - Return valid JSON only without markdown.

    Return JSON:
    {{ "valid": true/false, "feedback": "brief reason" }}
    """
    client = genai.Client()
    try:
        res = await client.aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = res.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Error in evaluator: {e}")
        return {"valid": True, "feedback": "fallback to true"}


async def risk_agent(state: dict) -> str:
    """Generates the next profiling question."""
    answered = list(state.get("answers", {}).keys())
    answered_count = len(answered)

    # Use preset questions in order first
    if answered_count < len(INTERVIEW_QUESTIONS):
        return INTERVIEW_QUESTIONS[answered_count]

    prompt = f"""
    You are an expert risk profiler. Generate ONE final clarifying question.
    Previous answers: {json.dumps(state.get("answers", {}))}
    Ask something that helps determine their asset preference or loss tolerance more precisely.
    """
    client = genai.Client()
    try:
        res = await client.aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return res.text
    except Exception as e:
        logger.error(f"Error in risk agent: {e}")
        return "Any final thoughts on how aggressively you'd like to invest?"


async def host_agent(input_text: str) -> str:
    """Translates raw system instructions into friendly spoken response."""
    client = genai.Client()
    system_instruction = "You are a friendly financial assistant for Invex. Speak simply and conversationally. Do not use asterisks or markdown. Just output the spoken words."
    try:
        res = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=input_text,
            config=genai.types.GenerateContentConfig(system_instruction=system_instruction)
        )
        return res.text
    except Exception as e:
        logger.error(f"Error in host agent: {e}")
        return input_text if isinstance(input_text, str) and input_text.strip() else DEFAULT_HOST_FAILURE_REPLY


async def build_profile_from_state(state: dict) -> dict:
    """Uses Gemini to extract a structured risk profile from the full Q&A history."""
    answers = state.get("answers", {})
    prompt = f"""
You are a risk profile extractor for an Indian investment platform.
Given the Q&A below from a voice interview, extract a structured risk profile.

Q&A:
{json.dumps(answers, indent=2)}

Return ONLY valid JSON (no markdown) matching this exact schema:
{{
  "risk_score": <float 0-100>,
  "risk_label": "<conservative|moderate_conservative|moderate|aggressive>",
  "horizon_years": <int or null>,
  "loss_tolerance_pct": <float or null>,
  "income_stability": "<salaried_stable|freelance|business|retired|student|null>",
  "dependents": <int or null>,
  "liabilities": ["home_loan", "car_loan", ...],
  "excluded_sectors": ["tobacco", "gambling", ...],
  "preferred_sectors": ["pharma", "it", ...],
  "emergency_fund_months": <float or null>,
  "dimension_scores": {{
    "risk_appetite": <0-100>,
    "horizon": <0-100>,
    "stability": <0-100>,
    "liquidity": <0-100>
  }}
}}
"""
    client = genai.Client()
    try:
        res = await client.aio.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = res.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Profile extraction failed: {e}")
        return {"risk_score": 50.0, "risk_label": "moderate", "horizon_years": None, "loss_tolerance_pct": None,
                "income_stability": None, "dependents": None, "liabilities": [], "excluded_sectors": [],
                "preferred_sectors": [], "emergency_fund_months": None, "dimension_scores": {}}


async def run_orchestrator(
    user_text: str,
    state: dict,
    extract_profile: bool = False,
) -> tuple:
    """
    Executes the Evaluator → Risk → Host pipeline.
    Returns (reply, new_state, is_complete, profile_or_None).
    """
    current_question = state.get("currentQuestion", DEFAULT_OPENING_QUESTION)

    # 1. Evaluate answer
    eval_result = await evaluator_agent(current_question, user_text)

    if not eval_result.get("valid"):
        retry_prompt = f"The user's answer ({user_text}) was unclear to: '{current_question}'. Ask again politely."
        retry_reply = await host_agent(retry_prompt) or DEFAULT_RETRY_REPLY
        return retry_reply, state, False, None

    # 2. Save answer
    if "answers" not in state:
        state["answers"] = {}
    state["answers"][current_question] = user_text
    answered_count = len(state["answers"])

    # 3. Check if interview is complete
    if answered_count >= INTERVIEW_DONE_AFTER:
        closing = "Thank you! I have everything I need to build your personalised risk profile. Give me a moment..."
        friendly_close = await host_agent(closing) or closing
        profile = None
        if extract_profile:
            profile = await build_profile_from_state(state)
        state["completed"] = True
        return friendly_close, state, True, profile

    # 4. Next question
    next_q = await risk_agent(state)
    state["currentQuestion"] = next_q
    friendly_reply = await host_agent(next_q) or next_q

    return friendly_reply, state, False, None


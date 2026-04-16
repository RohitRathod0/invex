import json
import logging
from google import genai

logger = logging.getLogger(__name__)

DEFAULT_OPENING_QUESTION = "What is your primary investment goal right now?"
DEFAULT_FOLLOW_UP_QUESTION = "How would you react if your portfolio dropped by 20% in a month?"
DEFAULT_RETRY_REPLY = "I didn't fully catch that. Could you please answer the question again in one or two simple sentences?"
DEFAULT_HOST_FAILURE_REPLY = "Let's continue the risk profiling interview. Could you tell me your primary investment goal?"

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
        res = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
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
    prompt = f"""
    You are an expert risk profiler determining a user's risk tolerance.
    Generate the VERY NEXT risk profiling question to ask. Do NOT provide an introduction.
    Previous answers: {json.dumps(state.get("answers", {}))}
    
    If they haven't clarified risk tolerance, ask about their reaction to a 20% portfolio drop.
    If they answered that, ask about emergency funds.
    If they answered that, ask about their employment stability.
    """
    client = genai.Client()
    try:
        res = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return res.text
    except Exception as e:
        logger.error(f"Error in risk agent: {e}")
        answers = state.get("answers", {})
        if any("20% portfolio drop" in question for question in answers):
            return "How stable is your employment and monthly income right now?"
        return DEFAULT_FOLLOW_UP_QUESTION


async def host_agent(input_text: str) -> str:
    """Translates raw system instructions into friendly spoken response."""
    client = genai.Client()
    system_instruction = "You are a friendly financial assistant for Invex. Speak simply and conversationally. Do not use asterisks or markdown. Just output the spoken words."
    try:
        res = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=input_text,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        return res.text
    except Exception as e:
        logger.error(f"Error in host agent: {e}")
        return input_text if isinstance(input_text, str) and input_text.strip() else DEFAULT_HOST_FAILURE_REPLY


async def run_orchestrator(user_text: str, state: dict) -> tuple[str, dict]:
    """
    Executes the Evaluator -> Risk -> Host pipeline.
    """
    current_question = state.get("currentQuestion", DEFAULT_OPENING_QUESTION)
    
    # 1. Evaluate answer
    eval_result = await evaluator_agent(current_question, user_text)
    
    if not eval_result.get("valid"):
        # 2. Ask again via host
        retry_prompt = f"The user's answer ({user_text}) was unclear or evasive to the question: '{current_question}'. Ask them the question again clearly and politely."
        retry_reply = await host_agent(retry_prompt)
        if not retry_reply:
            retry_reply = DEFAULT_RETRY_REPLY
        return retry_reply, state
        
    # 3. Save answer
    if "answers" not in state:
        state["answers"] = {}
    state["answers"][current_question] = user_text
    
    # 4. Get Next Question
    next_q = await risk_agent(state)
    state["currentQuestion"] = next_q
    
    # 5. Host formats the question
    friendly_reply = await host_agent(next_q)
    if not friendly_reply:
        friendly_reply = next_q or DEFAULT_HOST_FAILURE_REPLY
    
    return friendly_reply, state

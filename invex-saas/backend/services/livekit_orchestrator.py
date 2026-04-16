import json
import logging
import copy
from typing import Optional

from livekit.agents import JobContext, JobProcess, WorkerOptions, run_app, llm, stt, tts, cli
from livekit.plugins import openai, silero, google
import os
from google import genai

logger = logging.getLogger(__name__)

# Mock database/state for the example
class InterviewState:
    def __init__(self):
        self.current_question = "Hi, I'm your Invex financial assistant. What is your primary investment goal right now?"
        self.answers = {}
        self.retries = 0

async def evaluator_agent(question: str, user_answer: str) -> dict:
    """Evaluates if the answer is relevant and specific using OpenAI."""
    prompt = f"""
    Question: {question}
    Answer: {user_answer}

    Check:
    - Is it relevant?
    - Is it specific?
    - Return valid JSON only without markdown.

    Return JSON:
    {{ "valid": true/false, "feedback": "brief reason" }}
    """
    
    # We use the built-in google-genai client
    client = genai.Client() # Uses GEMINI_API_KEY from environment
    
    try:
        res = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        # Attempt to parse json from text
        text = res.text
        # Strip markdown json block if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Error in evaluator: {e}")
        return {"valid": True, "feedback": "fallback to true"}


async def risk_agent(state: InterviewState) -> str:
    """Generates the next profiling question."""
    prompt = f"""
    You are an expert risk profiler determining a user's risk tolerance.
    Generate the VERY NEXT risk profiling question to ask. Do NOT provide an introduction.
    Previous answers: {json.dumps(state.answers)}
    
    If they haven't clarified risk tolerance, ask about loss reaction.
    If they answered that, ask about emergency funds.
    """
    client = genai.Client()
    
    res = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return res.text


async def host_agent_instructions(input_text: str) -> str:
    """
    Translate raw system instructions into a friendly, spoken response.
    """
    client = genai.Client()
    system_instruction = "You are a friendly financial assistant for Invex. Speak simply and conversationally. Do not use asterisks or formatting. Just output the spoken words."
    res = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=input_text,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_instruction
        )
    )
    return res.text


def orchestrate_logic(state: InterviewState):
    """
    A factory function returning a before_llm_cb handler for VoicePipelineAgent.
    This intercepts the user's STT (speech-to-text) before it hits the main LLM.
    We inject our Multi-Agent Evaluator -> Risk -> Host logic here!
    """
    async def before_llm_cb(assistant, chat_ctx: llm.ChatContext):
        # 1. Grab the user's last transcribed text from the context
        user_msg = chat_ctx.messages[-1]
        user_text = user_msg.content
        
        logger.info(f"Orchestrator received text: {user_text}")

        # 2. Run Evaluator Agent
        eval_result = await evaluator_agent(state.current_question, user_text)
        
        if not eval_result.get("valid"):
            # If invalid, ask the Host to retry
            retry_raw = f"The user answer '{user_text}' was unclear for the question '{state.current_question}'. Ask them again clearly and politely."
            friendly_retry = await host_agent_instructions(retry_raw)
            
            # Modify the context so the pipeline Assistant just reads out our Host Agent response
            # We wipe the context and just feed the LLM exactly what to say via a system prompt
            new_ctx = llm.ChatContext()
            new_ctx.append(text=f"Respond EXACTLY with this text: {friendly_retry}", role="system")
            return new_ctx
            
        # 3. Valid answer: Save state
        state.answers[state.current_question] = user_text
        
        # 4. Get next Question from Risk Agent
        next_raw_q = await risk_agent(state)
        state.current_question = next_raw_q
        
        # 5. Host asks it nicely
        friendly_q = await host_agent_instructions(next_raw_q)
        
        # 6. Override the LLM context to bypass standard AI and force it to say exactly what our Host Agent produced
        new_ctx = llm.ChatContext()
        new_ctx.append(text=f"Respond EXACTLY with this text and nothing else: {friendly_q}", role="system")
        return new_ctx

    return before_llm_cb


async def entrypoint(ctx: JobContext):
    """
    LiveKit Agent Entrypoint. Connects to the room and starts the VoicePipeline.
    """
    state_instance = InterviewState()
    
    # 1. Provide a base chat context (though our orchestrator overwrites it at runtime)
    initial_ctx = llm.ChatContext().append(
        role="system",
        text="You are a voice assistant."
    )

    await ctx.connect(auto_subscribe=api.AutoSubscribe.AUDIO_ONLY)
    
    logger.info(f"Connected to room: {ctx.room.name}")

    from livekit.agents.pipeline import VoicePipelineAgent
    from livekit import api

    # Set up the Voice Pipeline using Google for TTS and Gemini for LLM
    assistant = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=openai.STT(base_url="https://api.groq.com/openai/v1", api_key=os.environ.get("GROQ_API_KEY"), model="whisper-large-v3"),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=google.TTS(),
        chat_ctx=initial_ctx,
        before_llm_cb=orchestrate_logic(state_instance),
    )

    assistant.start(ctx.room)

    # Initial greeting via Host Agent
    greeting = state_instance.current_question
    await assistant.say(greeting, allow_interruptions=True)

if __name__ == "__main__":
    # When run directly, starts the LiveKit Worker
    cli.run_app(WorkerOptions(entrypoint=entrypoint))

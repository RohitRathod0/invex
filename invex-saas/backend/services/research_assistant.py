import json
from typing import List, Dict, Any, Optional, Tuple
from groq import AsyncGroq
from config import get_settings
import re

settings = get_settings()

class AIResearchAssistant:
    """
    RAG-based AI Research Assistant.
    Retrieves context from a simulated vector database of financial reports 
    and uses Groq to answer complex analytical questions.
    """
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.knowledge_base = self._load_mock_knowledge_base()
        
    async def query(self, question: str, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Process user query using RAG pattern."""
        
        # 1. Retrieval Phase: Get relevant documents
        # In a real app, this uses FAISS/Pinecone similarity_search with embeddings
        relevant_docs = self._mock_retrieve(question, symbol)
        
        # 2. Augmentation Phase: Construct prompt with context
        context_text = "\\n\\n".join([
            f"Source: {doc['source']} (Date: {doc['date']})\\nExcerpt: {doc['content']}" 
            for doc in relevant_docs
        ])
        
        system_prompt = """
        You are a highly analytical AI financial research assistant. 
        Your goal is to answer the user's question based strictly on the provided Context.
        If the Context does not contain the answer, say "Based on the available research, I cannot answer this reliably."
        Always be professional, objective, and cite sources when applicable.
        """
        
        user_prompt = f"""
        User Question: {question}
        
        Target Symbol (if any): {symbol}
        
        Context (Retrieved Research Documents):
        {context_text}
        
        Provide a concise, detailed, and structured answer.
        """
        
        # 3. Generation Phase: Call LLM
        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=512
            )
            
            answer = completion.choices[0].message.content.strip()
            
            return {
                "question": question,
                "answer": answer,
                "sources_used": [doc['source'] for doc in relevant_docs],
                "confidence": 85 if len(relevant_docs) > 0 else 10
            }
            
        except Exception as e:
            return {
                "question": question,
                "answer": f"Error running analysis: {str(e)}",
                "sources_used": [],
                "confidence": 0
            }

    def _mock_retrieve(self, query: str, symbol: Optional[str]) -> List[Dict[str, Any]]:
        """
        Simulate a Vector DB similarity search (FAISS/Pinecone).
        """
        keywords = set(re.findall(r'\w+', query.lower()))
        if symbol: keywords.add(symbol.lower())
        
        scored_docs: List[Tuple[int, Dict[str, Any]]] = []
        for doc in self.knowledge_base:
            doc_text = (doc['title'] + " " + doc['content']).lower()
            score = sum(1 for kw in keywords if kw in doc_text)
            if symbol and symbol.lower() in doc_text:
                score += 5 # heavily weight symbol matches
            
            if score > 0:
                scored_docs.append((score, doc))
                
        # Sort by relevance and take top 3
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in scored_docs[:3]]

    def _load_mock_knowledge_base(self) -> List[Dict[str, Any]]:
        """Provides a static knowledge base to simulate vector store contents."""
        return [
            {
                "id": "doc1",
                "title": "Reliance Industries Q3 Earnings Note",
                "source": "Motilal Oswal Report",
                "date": "2024-01-20",
                "content": "Reliance Retail margins expanded by 50 bps YoY. Jio subscriber additions decelerated but ARPU increased to Rs 181. O2C business remains under pressure due to weak gross refining margins (GRMs)."
            },
            {
                "id": "doc2",
                "title": "Tata Motors EV Guidance 2025",
                "source": "ICICI Direct Analysis",
                "date": "2024-02-15",
                "content": "Tata Motors expects EV penetration to hit 25% of its total portfolio by 2025. Margin improvement is largely driven by JLR's strong order book and unwinding of semiconductor supply constraints."
            },
            {
                "id": "doc3",
                "title": "HDFC Bank Merger Synergies",
                "source": "Goldman Sachs Institutional",
                "date": "2024-02-05",
                "content": "Post-merger integration costs are weighing on HDFC Bank's near-term RoA. However, cross-selling mortgages to the existing bank customer base is expected to drive 15% loan growth over the next 3 years."
            },
            {
                "id": "doc4",
                "title": "IT Sector Headwinds",
                "source": "Macro Economic Review",
                "date": "2024-01-10",
                "content": "Indian IT faces headwinds from delayed US client decision cycles. Infosys and TCS highlight massive cost optimization deal wins, but discretionary spending remains muted until rate cuts begin."
            }
        ]

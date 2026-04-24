# InveX - Advanced AI-Powered Financial & Portfolio Analysis Platform

Welcome to the **InveX** monorepo! InveX is an advanced, production-ready SaaS application designed to empower investors with real-time portfolio tracking, comprehensive market news, highly customized AI-driven financial analysis, voice-activated onboarding, and stringent compliance tracking.

---

## 🏗 System Architecture

The project adopts a modern, highly scalable architecture with clear separation of concerns across the user interface, backend APIs, and the AI intelligence core.

### 1. Frontend (`invex-saas/frontend`)
- **Framework:** Next.js (React 18) utilizing the App Router.
- **Styling & UI:** Tailwind CSS for utility-first styling, Framer Motion for smooth micro-animations, and Lucide React for consistent iconography.
- **State Management:** Zustand for lightweight, fast global state (e.g., Auth store, Session store).
- **Data Visualization:** Recharts for dynamic portfolio, market charts, and asset allocation pie charts.
- **Communication:** Axios for REST API calls with automated JWT token refresh and WebSockets for real-time market/event updates.

### 2. Backend (`invex-saas/backend`)
- **Framework:** FastAPI (Python), offering extreme performance, asynchronous processing, and auto-generated OpenAPI documentation.
- **Database ORM:** SQLAlchemy with Alembic for migrations, managing Postgres/SQLite databases.
- **Authentication:** Secure JWT-based authentication using `bcrypt` for password hashing.
- **Rate Limiting:** `SlowAPI` (Redis-backed) to prevent abuse of AI endpoints and data routes.
- **Deployment & Scaling:** Containerized with Docker, background tasks managed by Celery & Redis, and serverless-ready via `Mangum` for AWS Lambda compatibility.

### 3. AI Core Engine (`invex-saas/crew_core`)
- **Provider:** Powered by **Mistral AI** (`mistral-large-2512` for deep reasoning, `ministral-8b-2512` for fast data extraction and chat).
- **Orchestration:** Integrated with Langchain (`langchain-mistralai`) and CrewAI for autonomous agent coordination.
- **Privacy & Compliance:** Backend-orchestrated AI pipelines designed to ensure proprietary secrecy (no external API keys exposed to frontend).

---

## ✨ Comprehensive Feature List

### 🎙️ Voice Agent & Interactive Onboarding (`/onboarding`)
- **Interactive Voice Agent:** A dedicated onboarding agent orchestrates user intake using real-time voice and conversational AI.
- **Risk Profiling Integration:** Dynamically categorizes users (Conservative, Moderate, Aggressive) by analyzing verbal and text responses.
- **Architecture:** The `/onboarding` frontend communicates with the backend `onboarding_router.py` to seamlessly establish the user's initial portfolio baseline and investment preferences.

### 💬 Intelligent Chat Architecture (`/chat`)
- **Session-Aware Memory:** Users can engage in detailed financial discussions while the system maintains deep context per session.
- **Date-Grouped Navigation:** Persistent conversation history UI grouped by "Today", "Yesterday", and "Previous 7 Days".
- **Auto-Pruning:** Automatic 5-day memory pruning managed by `session_router.py` to maintain optimal context window limits and strict Mistral API token efficiency.

### 🧠 Deep Analysis Agents (`/analysis`)
- **Portfolio Analyst:** Deep-dives into existing portfolios to recommend tactical rebalancing, strictly evaluating against the user's risk profile.
- **Mistral Orchestration:** Utilizes `mistral-large-2512` via the `agent_router.py` to run multi-step reasoning, ensuring highly accurate market forecasts and personalized adjustments.

### 📰 Market News Agent (`/news` & `/market_news`)
- **Real-Time Curation:** Continuously scans, curates, and summarizes global financial news into highly actionable macro/micro insights.
- **Fast Extraction:** Powered by `ministral-8b-2512` and served via `news_router.py` for sub-second summarization and sentiment analysis.

### 🔍 Advanced Stock Screener (`/screener`)
- **Custom Filters:** Fully featured stock screener allowing users to filter via technicals and fundamentals (e.g., P/E ratio < 50, RSI oversold).
- **AI Sector Analyst Integration:** Every stock click triggers a micro-analysis, instantly generating a 5-8 line insight specific to that stock's sector context.

### 🛡️ Security, Compliance, and SEBI Warning Engine (`/security`)
- **SEBI-Powered Warning Mechanism:** The frontend explicitly renders compliance banners and statutory warnings on high-risk actions, adhering to SEBI guidelines.
- **Insider Trading Tracker (`/insider`):** Dedicated engine parsing bulk block-deals and insider buying/selling patterns (`insider_router.py`).
- **Data Protection:** Implements stringent data protection compliance modules mapping user PII and financial records with top-tier encryption logic.

### ⚖️ Legal NER Assistant (`/legal`)
- **Multilingual Legal Processing:** Specialized backend pipeline for Legal Named Entity Recognition (NER).
- **Academic & IP Secrecy:** The pipeline is completely obfuscated behind the FastAPI backend, shielding detection logic and API dependencies from frontend client network inspection. Rebranded as the "Local Analysis Engine" in the UI.

### 📊 Portfolio Management & Dashboard (`/dashboard`)
- **Holdings Table:** Real-time stock quotes merged with the user's portfolio ledger.
- **Asset Allocation:** Clean visualizations using Recharts.
- **Upload Sync:** Supports manual CSV uploads or backend syncing via `portfolio_router.py`.

### 📅 Real-Time Market Tools
- **Earnings Calendar (`/earnings`):** Tracks upcoming earnings calls.
- **Alert System:** WebSockets-enabled instant notifications for price movements (`alert_router.py`).
- **Research Hub (`/research`):** Deep fundamental research and valuation models accessible via the UI.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL or SQLite
- Redis (for Celery and Rate Limiting)
- Mistral AI API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd invex-saas/backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up your `.env` file (copy `.env.example` to `.env` and configure `MISTRAL_API_KEY`, `DATABASE_URL`, etc.).
4. Run the API Server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd invex-saas/frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The UI will be accessible at `http://localhost:3000`.

---

## 📁 Complete Monorepo Structure

```text
invex/
├── invex-saas/
│   ├── backend/          
│   │   ├── routers/      # auth, agent, session, onboarding, portfolio, insider, security, etc.
│   │   ├── models/       # SQLAlchemy DB schemas
│   │   ├── services/     # Core business logic
│   │   ├── middleware/   # Request logging, auth checks
│   │   └── compliance/   # Data protection logic
│   ├── frontend/         
│   │   ├── app/          # Next.js App Router (dashboard, chat, analysis, onboarding, security)
│   │   ├── components/   # UI elements, Charts, Tables
│   │   └── lib/          # API clients, Zustand stores, Utilities
│   └── crew_core/        # Mistral AI powered Langchain/CrewAI logic (Agents, Tasks)
└── invex-landing/        # Marketing & Landing page (Next.js)
```

*(Note: Legacy scripts, outdated configuration files, and dummy `.venv` structures at the root have been purged to maintain repository cleanliness and a strict separation of concerns.)*



## 📖 Table of Contents



- [⚡ Overview](#-overview)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
  - [Frontend](#1-frontend-invex-saasfrontend)
  - [Backend](#2-backend-invex-saasbackend)
  - [AI Core Engine](#3-ai-core-engine-invex-saascrew_core)
- [✨ Features](#-features)
  - [Voice Agent & Onboarding](#%EF%B8%8F-voice-agent--interactive-onboarding)
  - [Intelligent Chat](#-intelligent-chat-architecture)
  - [Deep Analysis Agents](#-deep-analysis-agents)
  - [Market News Agent](#-market-news-agent)
  - [Stock Screener](#-advanced-stock-screener)
  - [Security & Compliance](#%EF%B8%8F-security-compliance--sebi-warning-engine)
  - [Legal NER Assistant](#%EF%B8%8F-legal-ner-assistant)
  - [Portfolio Dashboard](#-portfolio-management--dashboard)
  - [Real-Time Market Tools](#-real-time-market-tools)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [📁 Monorepo Structure](#-monorepo-structure)

</details>

---

## ⚡ Overview

**InveX** is a production-ready, full-stack SaaS platform built for serious investors. It combines a responsive Next.js frontend, a high-performance FastAPI backend, and a Mistral AI–powered intelligence core to deliver real-time portfolio insights, voice-activated onboarding, and SEBI-compliant compliance tracking — all in one monorepo.

> 💡 **New to InveX?** Start with the [Quick Start guide](#-quick-start) to get up and running in minutes.

---

## 🏗️ System Architecture

The project adopts a modern, scalable three-layer architecture with strict separation of concerns.

### 1. Frontend (`invex-saas/frontend`)

| Technology | Purpose |
|---|---|
| **Next.js 18** (App Router) | Core UI framework |
| **Tailwind CSS** + Framer Motion | Styling & micro-animations |
| **Zustand** | Lightweight global state (Auth, Session) |
| **Recharts** | Portfolio charts & asset allocation |
| **Axios** + WebSockets | REST calls with JWT refresh & real-time updates |

### 2. Backend (`invex-saas/backend`)

| Technology | Purpose |
|---|---|
| **FastAPI** (Python) | Async API server + OpenAPI docs |
| **SQLAlchemy** + Alembic | ORM with Postgres/SQLite migrations |
| **bcrypt** + JWT | Secure authentication |
| **SlowAPI** (Redis-backed) | Rate limiting on AI & data endpoints |
| **Celery** + Redis | Background task queue |
| **Mangum** | AWS Lambda / serverless compatibility |

### 3. AI Core Engine (`invex-saas/crew_core`)

| Technology | Purpose |
|---|---|
| **`mistral-large-2512`** | Deep reasoning, multi-step analysis |
| **`ministral-8b-2512`** | Fast data extraction & chat |
| **LangChain** + CrewAI | Agent orchestration & coordination |

> 🔒 **Privacy by design:** All AI pipelines run exclusively on the backend. No API keys are ever exposed to the client.

---

## ✨ Features

### 🎙️ Voice Agent & Interactive Onboarding

An orchestrated voice agent guides new users through intake — collecting preferences and building an investment baseline — entirely through conversational AI.

- Real-time voice + text intake via `/onboarding`
- **Dynamic risk profiling:** Automatically categorizes users as _Conservative_, _Moderate_, or _Aggressive_
- Seamlessly establishes portfolio baseline via `onboarding_router.py`

---

### 💬 Intelligent Chat Architecture

Session-aware financial conversations with persistent, grouped history.

- **Deep context per session** — the model always knows your portfolio state
- **Date-grouped UI:** _Today_, _Yesterday_, _Previous 7 Days_
- **Auto-pruning:** 5-day memory cleanup via `session_router.py` to maintain Mistral token efficiency

---

### 🧠 Deep Analysis Agents

Multi-step portfolio reasoning powered by `mistral-large-2512`.

- Tactical **rebalancing recommendations** anchored to the user's risk profile
- Personalized market forecasts via multi-agent reasoning in `agent_router.py`
- Evaluation strictly constrained to the user's declared investment parameters

---

### 📰 Market News Agent

Real-time global financial news, curated and summarized for action.

- Continuously scans macro & micro financial events
- Sub-second **sentiment analysis** powered by `ministral-8b-2512`
- Served via `news_router.py` — fast extraction pipeline

---

### 🔍 Advanced Stock Screener

A fully-featured screener with AI sector context on every click.

- Filter by technicals & fundamentals (e.g., `P/E < 50`, `RSI oversold`)
- Every stock click triggers an **instant 5–8 line sector insight**
- AI Sector Analyst integration runs in the background — no waiting

---

### 🛡️ Security, Compliance & SEBI Warning Engine

Regulatory-grade compliance built into every high-risk user action.

- **SEBI-compliant banners** rendered on the frontend for high-risk operations
- **Insider Trading Tracker** — parses bulk block-deals and insider buy/sell patterns via `insider_router.py`
- End-to-end **PII encryption** and data protection compliance mapping

---

### ⚖️ Legal NER Assistant

Specialized multilingual Legal Named Entity Recognition pipeline.

- Backend-only pipeline — completely hidden from client network inspection
- Detection logic and API dependencies are fully obfuscated
- Branded as **"Local Analysis Engine"** in the UI for IP protection

---

### 📊 Portfolio Management & Dashboard

A live portfolio hub with real data and clean visualizations.

- **Holdings table** with real-time stock quotes merged from the user's ledger
- **Asset allocation charts** via Recharts
- Manual CSV upload or backend sync via `portfolio_router.py`

---

### 📅 Real-Time Market Tools

| Tool | Description |
|---|---|
| **Earnings Calendar** `/earnings` | Tracks upcoming earnings calls |
| **Alert System** | WebSocket-powered price movement notifications via `alert_router.py` |
| **Research Hub** `/research` | Fundamental research & valuation models |

---

## 🚀 Quick Start

### Prerequisites

- Node.js `v18+`
- Python `3.10+`
- PostgreSQL or SQLite
- Redis _(for Celery and Rate Limiting)_
- Mistral AI API Key

---

### Backend Setup

```bash
# 1. Navigate to backend
cd invex-saas/backend

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# → Set MISTRAL_API_KEY, DATABASE_URL, REDIS_URL, etc.

# 5. Run database migrations
alembic upgrade head

# 6. Start the API server
uvicorn main:app --reload --port 8000
```

> API will be live at `http://localhost:8000` — auto-generated docs at `/docs`.

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd invex-saas/frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

> UI will be live at `http://localhost:3000`.

---

## 📁 Monorepo Structure

```text
invex/
├── invex-saas/
│   ├── backend/
│   │   ├── routers/        # auth, agent, session, onboarding,
│   │   │                   # portfolio, insider, security, news, alert…
│   │   ├── models/         # SQLAlchemy DB schemas
│   │   ├── services/       # Core business logic
│   │   ├── middleware/     # Request logging, auth checks
│   │   └── compliance/     # Data protection & PII encryption
│   │
│   ├── frontend/
│   │   ├── app/            # Next.js App Router
│   │   │                   # (dashboard, chat, analysis, onboarding, security…)
│   │   ├── components/     # UI elements, Charts, Tables
│   │   └── lib/            # API clients, Zustand stores, Utilities
│   │
│   └── crew_core/          # Mistral AI · LangChain · CrewAI
│                           # (Agents, Tasks, Orchestration)
│
└── invex-landing/          # Marketing & Landing page (Next.js)
```

---

## 🎬 Demo

https://youtu.be/1o4z4oubY7M?si=q-wW-pe4aVQR-env
https://youtu.be/732I9y7tbek?si=bK4JLbzI4buETeRO


## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an [issue](#) or submit a pull request.

1. Fork the project
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## 📄 License



---

<p align="center">
  Built with ⚡ by the InveX Team &nbsp;·&nbsp; Powered by <strong>Mistral AI</strong>
</p>

# Krypton — AI Crypto Trading Assistant (Backend)

A FastAPI backend powering an AI-assisted crypto trading dashboard: OTP-verified auth, encrypted BYO-LLM key management, optional Binance portfolio integration, live technical indicators, news sentiment analysis, and a modular **LangGraph** multi-agent system for market synthesis.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [The Agent Graph](#the-agent-graph)
- [Request Flow (Chat Example)](#request-flow-chat-example)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Setup & Configuration](#setup--configuration)
- [Running the App](#running-the-app)

---

## Architecture Overview

The backend is split into two layers that never overlap:

1. **Deterministic services** (`services/`) — pure computation and I/O. No LLM calls. Fast, free, always available: technical indicators, RSS news + sentiment scoring, portfolio risk math, encryption, Binance integration.
2. **Agent layer** (`agents/`) — a LangGraph graph that *reads from* the services above and adds exactly one LLM call at the end to synthesize everything into a natural-language answer.

```mermaid
graph TD
    subgraph Client["Frontend"]
        UI[Dashboard / Popup]
    end

    subgraph API["FastAPI Routers"]
        AUTH[auth]
        LLMKEY[llm_key]
        INTEG[integration]
        CTX[chart_context]
        MKT[market]
        NEWS[news]
        RISK[risk]
        AGENT[agent]
        STATUS[status]
    end

    subgraph SVC["Deterministic Services — no LLM"]
        IND[indicator_service]
        MDS[market_data_service]
        NS[news_service]
        NR[news_ranking_service]
        SENT[sentiment_service]
        RS[risk_service]
        BIN[binance_service]
        ENC[encryption]
        SEC[security]
    end

    subgraph AGENTS["LangGraph Agent Layer"]
        GRAPH[graph.py]
        MA[market_analysis_node]
        SN[sentiment_node]
        RN[risk_node]
        SYN["synthesis_node — LLM call"]
    end

    subgraph EXT["External APIs"]
        BINAPI[(Binance API)]
        RSS[(RSS Feeds)]
        LLMAPI[(OpenAI / Groq / Gemini / Claude)]
    end

    subgraph DB[(PostgreSQL)]
        UT[(users, otps)]
        KT[(llm_api_keys)]
        IT[(integration_keys)]
        CT[(chart_contexts)]
    end

    UI --> AUTH & LLMKEY & INTEG & CTX & MKT & NEWS & RISK & AGENT & STATUS

    MKT --> IND --> MDS --> BINAPI
    NEWS --> NR --> NS --> RSS
    NEWS --> SENT
    RISK --> RS --> BIN --> BINAPI
    LLMKEY --> ENC
    INTEG --> ENC
    AUTH --> SEC

    AGENT --> GRAPH
    GRAPH --> MA --> MDS
    GRAPH --> SN --> NS
    GRAPH --> RN --> RS
    MA & SN & RN --> SYN --> LLMAPI

    AUTH -.-> UT
    LLMKEY -.-> KT
    INTEG -.-> IT
    CTX -.-> CT
```

**Key architectural rule:** only `synthesis_node` ever calls an LLM. Every other node — and every REST endpoint that powers the dashboard's live panels — is pure math or a direct API call. This keeps the app fast and cheap to run; you only pay for an LLM call when the user actually asks a question or hits "Strategy."

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Web framework | FastAPI (async) | Native async, auto-generated OpenAPI docs |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) | Relational integrity for user/key data |
| Migrations | Alembic | Version-controlled schema changes |
| Auth | Custom JWT (`python-jose`) + `bcrypt` | Stateless sessions, OTP-verified signup |
| Encryption at rest | `cryptography` (Fernet) | Symmetric encryption for API keys |
| Market data | CCXT + Binance public API | Unified exchange interface, no key needed for public data |
| Indicators | `ta` | RSI, MACD, EMA, Bollinger Bands |
| News | `feedparser` (RSS) | No paid news API needed |
| Sentiment | `vaderSentiment` | Deterministic, rule-based, free — no LLM per headline |
| Agent orchestration | LangGraph | Modular, parallel node execution, easy to extend |
| LLM providers | OpenAI, Groq, Gemini, Anthropic SDKs | User brings their own key/model |

---

## Folder Structure

```
app/
├── main.py                     # FastAPI entrypoint, router registration
├── core/
│   ├── config.py                # Pydantic Settings (env vars)
│   ├── security.py              # Password hashing (bcrypt), JWT issue/verify
│   └── encryption.py            # Fernet encrypt/decrypt for API keys at rest
├── database/
│   ├── base.py                   # SQLAlchemy declarative Base
│   └── session.py                # Async engine + get_db() dependency
├── models/                       # SQLAlchemy ORM tables
│   ├── user_model.py
│   ├── otp_model.py
│   ├── api_key.py                 # LLM keys (encrypted, expiring)
│   ├── integration_key.py         # Exchange keys (Binance now, others later)
│   └── chart_context.py           # User's current symbol/timeframe selection
├── schemas/                      # Pydantic request/response models
│   ├── auth.py, llm_key.py, integration.py,
│   ├── chart_context.py, market.py, news.py,
│   └── risk.py, agent.py, status.py
├── routers/                      # API endpoints
│   ├── auth.py, llm_key.py, integration.py,
│   ├── chart_context.py, market.py, news.py,
│   └── risk.py, agent.py, status.py
├── services/                     # Business logic — the deterministic layer
│   ├── otp_service.py, email_service.py
│   ├── market_data_service.py, indicator_service.py
│   ├── news_service.py, news_ranking_service.py, sentiment_service.py
│   ├── binance_service.py, risk_service.py
│   ├── llm_key_service.py, llm_client_service.py
│   └── agent_service.py            # Glue: assembles AgentState, invokes the graph
└── agents/                       # LangGraph agent layer
    ├── state.py                    # Shared AgentState (TypedDict)
    ├── market_analysis_agent.py    # Node: wraps indicator_service
    ├── sentiment_agent.py          # Node: wraps news + sentiment services
    ├── risk_agent.py               # Node: wraps risk_service (conditional)
    ├── synthesis_agent.py          # Node: the ONLY LLM call
    └── graph.py                    # Wires all four nodes together
```

---

## The Agent Graph

```mermaid
graph LR
    START((START)) --> MA[market_analysis_node]
    START --> SN[sentiment_node]
    START --> RN["risk_node<br/>(no-ops if Binance<br/>not connected)"]

    MA --> SYN[synthesis_node]
    SN --> SYN
    RN --> SYN

    SYN --> END((END))

    style SYN fill:#f9d77e,stroke:#333
    style RN fill:#d9d9d9,stroke:#333,stroke-dasharray: 5 5
```

- `market_analysis_node`, `sentiment_node`, `risk_node` run **concurrently** — none depends on another's output.
- `synthesis_node` (the only orange node — the only LLM call) waits for all three, then combines whatever succeeded into one answer.
- `risk_node` degrades gracefully: if Binance isn't connected, it returns immediately with no data, and `synthesis_node` simply omits risk from its answer rather than failing.
- Any node can fail independently (e.g. Binance API hiccup) without crashing the whole graph — failures accumulate in an `errors` list rather than halting execution.

---

## Request Flow (Chat Example)

```mermaid
sequenceDiagram
    participant U as User (Frontend)
    participant R as routers/agent.py
    participant AS as agent_service.py
    participant DB as PostgreSQL
    participant G as LangGraph
    participant EXT as Binance / RSS / LLM

    U->>R: POST /agent/chat {"message": "..."}
    R->>AS: run_trading_assistant(db, user_id, question)
    AS->>DB: fetch chart_context, LLM key, Binance key
    AS->>EXT: decrypt + fetch live Binance balances (if connected)
    AS->>G: agent_graph.ainvoke(initial_state)

    par Parallel execution
        G->>EXT: fetch OHLCV candles (market_analysis_node)
    and
        G->>EXT: fetch RSS news (sentiment_node)
    and
        G->>G: compute risk from balances (risk_node)
    end

    G->>EXT: call user's chosen LLM (synthesis_node)
    G-->>AS: final AgentState
    AS-->>R: {final_response, indicators, news_items, ...}
    R-->>U: JSON response
```

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ OTPS : has
    USERS ||--o{ LLM_API_KEYS : owns
    USERS ||--o{ INTEGRATION_KEYS : owns
    USERS ||--|| CHART_CONTEXTS : has

    USERS {
        uuid id PK
        string email
        string hashed_password
        bool is_verified
        bool is_active
    }
    OTPS {
        uuid id PK
        uuid user_id FK
        string otp_hash
        string purpose
        datetime expires_at
        bool is_used
    }
    LLM_API_KEYS {
        uuid id PK
        uuid user_id FK
        string provider
        string model_name
        text encrypted_key
        bool is_active
        bool is_valid
        datetime expires_at
    }
    INTEGRATION_KEYS {
        uuid id PK
        uuid user_id FK
        string platform
        text encrypted_api_key
        text encrypted_api_secret
        bool is_active
        bool is_valid
    }
    CHART_CONTEXTS {
        uuid user_id PK, FK
        string symbol
        string timeframe
    }
```

---

## API Reference

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

| Method | Path | Purpose | LLM cost |
|---|---|---|---|
| POST | `/auth/signup` | Email + password signup, sends OTP | – |
| POST | `/auth/verify-otp` | Verify signup OTP | – |
| POST | `/auth/resend-otp` | Resend OTP (also un-sticks unverified re-signups) | – |
| POST | `/auth/login` | Email + password → JWT | – |
| POST | `/llm-key/set` | Store encrypted LLM key (provider/model/key) | – |
| GET | `/llm-key/status` | Check active LLM key | – |
| POST | `/integration/binance/connect` | Store encrypted Binance key+secret | – |
| GET | `/integration/binance/status` | Check Binance connection | – |
| GET | `/integration/binance/portfolio` | Live non-zero balances | – |
| GET | `/status/onboarding` | Combined onboarding status | – |
| PUT | `/context/chart` | Set current symbol/timeframe | – |
| GET | `/context/chart` | Get current symbol/timeframe (defaults if unset) | – |
| GET | `/market/indicators` | RSI, MACD, EMA, Bollinger Bands | none |
| GET | `/news/feed` | Top 5 symbol-relevant news + sentiment | none |
| GET | `/risk/profile` | Concentration + volatility risk (404 if no Binance) | none |
| POST | `/agent/chat` | Ask the assistant a question | **yes** |
| POST | `/agent/strategy` | General synthesized read on current symbol | **yes** |

---

## Setup & Configuration

### 1. Clone and create a virtual environment
```bash
git clone <your-repo-url> krypton-backend
cd krypton-backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description | How to generate |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql+asyncpg://user:pass@localhost:5432/crypto_db` |
| `JWT_SECRET_KEY` | Signs session tokens | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Encrypts API keys at rest | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `OTP_EXPIRE_MINUTES` | OTP validity window | default `5` |
| `LLM_KEY_DEFAULT_TTL_DAYS` | Default LLM key expiry | default `7` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | For sending OTP emails | your email provider's SMTP settings |

### 4. Set up the database
```bash
# create the database first (via psql or a GUI), then:
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

> Every time you add/change a model, repeat: import it in `alembic/env.py`, then `alembic revision --autogenerate` + `alembic upgrade head`.

### 5. (Optional) Get a Binance API key for testing
Create one at binance.com → API Management. **Use read-only permissions only** — never enable withdrawals/trading on a key you paste into any third-party app, including this one.

### 6. (Optional) Get an LLM API key
Any one of: OpenAI, Groq, Google AI Studio (Gemini), or Anthropic (Claude). You'll paste this via `POST /llm-key/set` after logging in — it's stored encrypted and expires after 7 days by default.

---

## Running the App

```bash
uvicorn app.main:app --reload
```

- API root: `http://127.0.0.1:8000`
- Interactive docs (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `GET /health`

**To test protected routes in `/docs`:** call `/auth/login`, copy the `access_token`, click the green **Authorize** button, paste the raw token (no `Bearer` prefix needed), then every other request in the docs UI will include it automatically.

---

## Design Principles Recap

1. **Deterministic work stays out of the LLM.** Indicators, sentiment scoring, and risk math are all pure computation — fast, free, and testable without ever calling a model.
2. **Only one LLM call per agent invocation** (`synthesis_node`), regardless of how many data sources feed into it.
3. **Optional integrations degrade gracefully, never crash.** No Binance connection → risk section is simply omitted, not an error.
4. **One shared LLM client interface** (`llm_client_service.call_llm`) means agent code never contains provider-specific logic — Groq, OpenAI, Gemini, and Claude are interchangeable behind one function signature.
5. **Nodes never touch the database directly.** All DB/decryption/external-API I/O happens once in `agent_service.py` before the graph runs — every node operates on plain, already-fetched `AgentState` data, making each one independently testable.
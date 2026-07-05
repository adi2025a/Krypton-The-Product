# Krypton Backend (FastAPI + LangGraph)

Real backend for the Krypton frontend, replacing all mock data with:

- **Live prices** — Binance public REST API (`/api/market/prices`, `/api/market/pairs`)
- **Live news** — CoinDesk / Cointelegraph / Decrypt RSS feeds + heuristic sentiment scoring, refined by an LLM agent (`/api/news`)
- **AI chat** — a LangGraph multi-agent graph (`/api/chat`)
- **Agent feed** — the same specialist agents run standalone, streamed over a WebSocket (`/ws/agents`) or one-shot via REST (`/api/agents/run`)
- **Auth** — simple JWT signup/login (in-memory user store — swap for a real DB before production)

Krypton is **BYOK (bring your own key)**: the frontend's onboarding flow collects `provider` + `model` + `api_key`
and sends it with every chat/agent request. The key is used in-memory for that single request only and is never
written to disk or a database — matching the "non-custodial" claim on the landing page.

## Architecture — LangGraph multi-agent graph

```
                  ┌────────────┐
                  │ supervisor │  LLM router: classifies the user's message
                  └─────┬──────┘  into market / sentiment / risk / onchain / general
        ┌────────┬──────┼───────┬─────────┐
        ▼        ▼      ▼       ▼         ▼
     market   sentiment  risk  onchain   (general skips straight to responder)
   (Binance)  (RSS news) (mock  (mock
                          portfolio) on-chain)
        └────────┴──────┴───────┴─────────┘
                        ▼
                  ┌────────────┐
                  │ responder  │  Final LLM synthesis — cites whatever
                  └─────┬──────┘  specialist context was gathered
                        ▼
                       END
```

- `app/agents/state.py` — the shared `AgentState` TypedDict passed between nodes
- `app/agents/nodes.py` — each specialist node (gathers real/mocked data, asks the LLM to reason over it)
- `app/agents/graph.py` — wires the nodes into a `StateGraph`, exposes `run_chat()` and `run_agent_task()`
- `app/services/market_data_service.py` — Binance klines/ticker (falls back to synthetic data if unreachable)
- `app/services/news_service.py` — RSS ingestion + keyword sentiment heuristic
- `app/services/llm_factory.py` — turns `(provider, model, api_key)` into the right LangChain chat model

RiskAnalyzer and OnChainAgent currently use placeholder data (a mock portfolio and simulated on-chain metrics,
respectively) — swap in a real portfolio/exchange API and an on-chain provider (Glassnode, Nansen, Dune, etc.)
when you're ready; the node interface won't need to change.

## Running it

```bash
cd krypton-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).

## Endpoints

| Method | Path                | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET  | `/api/market/pairs` | List supported pairs/timeframes |
| GET  | `/api/market/prices?pair=BTC/USDT&timeframe=1h` | Real price series |
| GET  | `/api/news?limit=12` | Live news + sentiment |
| POST | `/api/chat` | Send a chat message through the LangGraph agent |
| POST | `/api/agents/run` | Run one specialist agent once, get an `AgentTask` back |
| WS   | `/ws/agents` | Stream all 4 agents running live (pending → running → completed) |

### `POST /api/chat` body

```json
{
  "message": "What's the outlook for BTC?",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "context_pair": "BTC/USDT",
  "credentials": {"provider": "anthropic", "model": "claude-sonnet-4-6", "api_key": "sk-..."}
}
```

### `WS /ws/agents` — first client message

```json
{"provider": "openai", "model": "gpt-4o", "api_key": "sk-...", "pair": "BTC/USDT"}
```

The server then streams one JSON message per status transition, shaped exactly like the frontend's `AgentTask` type.

## Notes / production hardening

- Swap `USERS_DB` (in-memory dict in `app/auth.py`) for a real database.
- Restrict CORS `allow_origins` in `app/main.py` to your actual frontend origin.
- Consider caching `/api/news` and `/api/market/prices` for a few seconds to avoid hammering upstream APIs.
- Add rate limiting in front of `/api/chat` and `/ws/agents` since each call spends the user's own LLM credits.

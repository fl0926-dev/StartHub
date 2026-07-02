# StartHub MVP

Community platform connecting regional (비수도권) Korean startups with investors and each other.
Flask JSON API + vanilla HTML/JS/CSS frontend + JSON file storage. No build step.

## Run

```bash
cd Product
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py        # resets data/ with demo content
.venv/bin/python run.py         # http://127.0.0.1:5001 (or PORT env)
```

**Run exactly one process.** The JSON store's lock is process-local — never use
multi-worker servers (gunicorn etc.) against `data/`.

## Demo accounts (password: `starthub123`)

| Email | Role | Notes |
|---|---|---|
| `demo@starthub.kr` | startup | owns the 그린웨이브 profile, balance 16 |
| `ocean@starthub.kr` | startup | second account for vote/reply testing |
| `mentor@starthub.kr` | mentor | sees the 멘토링 dashboard |

Every seeded startup also has an owner account: `<profile-slug>@starthub.kr`
(e.g. `farmlink@starthub.kr`).

## Token economy

Server-enforced in `server/services/token_service.py` (single point):

- Signup bonus **+20**
- New thread **−5**, reply **−2** (`402 INSUFFICIENT_TOKENS {required, balance}` when short)
- Upvote received **+1** to the author (no self-vote `403`, no double-vote `409`)
- Every movement is a row in `data/ledger.json` with `balance_after`
- `POST /api/purchase/mock` grants nothing — payment is out of MVP scope

## Layout

```
server/           Flask app: api/ (thin blueprints) -> services/ (logic) -> storage/ (JsonStore)
data/             one JSON file per collection; atomic writes; regenerate via seed.py
public/           static frontend, deployable as-is later (Vercel)
  css/tokens.css  ALL design tokens (CSS variables) — the UI team's reskin surface
  js/api.js       the only module that talks to /api/* — the Supabase swap seam
  i18n/           ko.json / en.json dictionaries (client-side language toggle)
```

## Migration notes (Supabase + Vercel)

- Collections map 1:1 to Postgres tables (flat, foreign keys by id).
- Replace `public/js/api.js` internals with supabase-js; replace `auth_service`
  with Supabase Auth; make token charge/credit a Postgres function (RPC) for atomicity.
- `public/` deploys unchanged as the static frontend.

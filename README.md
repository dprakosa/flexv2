# Meeting Catch-Up Companion

A calm, assistive web app for rejoining live meetings when you lose the thread. See [PDD.md](./PDD.md) for product scope and architecture — that file is the source of truth.

## Quick start

```bash
npm install
cp .env.example .env   # .env.local also works
# Add your OpenAI API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Without an API key:** catch-up and ask flows still work using sample output so you can demo the UI.

## Hackathon demo

Use the built-in demo meeting (no microphone required):

1. Open **More** (⋯) → **Play demo meeting**
2. Set your name to `Marcus` in **Accessibility settings** (person icon, top right)
3. Follow [DEMO-SCRIPT.md](./DEMO-SCRIPT.md)
4. Run through [QA-CHECKLIST.md](./QA-CHECKLIST.md) before presenting

Keyboard shortcuts during a session: **L** = I'm lost, **C** = Catch me up.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run start` | Run production build |
| `npm run dev:desktop` | Electron desktop app against the dev server |
| `npm run dist` | Package the desktop app (Linux AppImage/deb) |
| `node scripts/verify-realtime.mjs` | End-to-end realtime transcription check (needs dev server + key) |

## Desktop app

The same app ships as an Electron desktop app that captures the screen and
system audio for meetings (with a microphone fallback on Linux, where system
loopback audio isn't available). `npm run dev:desktop` reuses a running dev
server or starts one. On Ubuntu 24.04+ the packaged AppImage needs
`--no-sandbox` (or a root-owned `chrome-sandbox`) because unprivileged user
namespaces are restricted.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Recommended | Powers live transcription, catch-up, and ask |
| `OPENAI_MODEL` | No | Override catch-up / ask model |
| `OPENAI_TRANSCRIBE_MODEL` | No | Override Realtime transcription model |

## Project layout

- `src/components/` — UI (MeetingCopilot, panels, modals)
- `src/lib/` — transcript, catch-up, meeting-signal logic
- `src/hooks/` — microphone capture and Realtime transcription
- `src/app/api/` — server routes for OpenAI calls
- `PDD.md` — product definition

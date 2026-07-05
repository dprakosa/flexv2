# Design: Desktop Meeting Catch-Up Companion

> Source of truth for the desktop conversion and UI redesign. Product truth stays in `PDD.md`; this document covers how the app looks, feels, and is architected as a desktop app.

## 1. Product framing

A calm desktop companion that sits alongside your meeting. It sees the screen, hears the audio, and helps you recover when you lose the thread. Inspiration: Cluely — one-click start, very few controls, everything large, rounded, and obvious.

Design principles (in priority order):

1. **One decision at a time.** The screen never asks the user to choose between more than ~3 things.
2. **Large targets.** Primary actions are full pill buttons (48px+ tall), reachable without precision.
3. **Calm, not surveillance.** Neutral palette, soft borders, no red recording aesthetics. Status is a quiet pulsing dot, not a banner.
4. **Recovery in under 10 seconds** (PDD success criterion). "I'm lost" is always one click or one keystroke away.

## 2. Platform architecture (Electron)

```
┌────────────────────────────────────────────────┐
│ Electron main process                          │
│  • BrowserWindow (contextIsolation, sandbox)   │
│  • setDisplayMediaRequestHandler               │
│      → desktopCapturer picks primary screen    │
│      → audio: 'loopback' (win/mac), none linux │
│  • globalShortcut Ctrl/Cmd+Shift+L → "lost"    │
│  • utilityProcess.fork(Next standalone server) │
│      → http://127.0.0.1:<free port>            │
└──────────────┬─────────────────────────────────┘
               │ loadURL (always http, never file://)
┌──────────────▼─────────────────────────────────┐
│ Renderer = the existing Next.js app            │
│  • getDisplayMedia() unchanged — main process  │
│    auto-answers it (no picker, one click)      │
│  • window.desktop (preload bridge):            │
│      isDesktop, onMarkLost, always-on-top      │
│  • API routes (/api/missed …) served by the    │
│    bundled Next server                         │
└────────────────────────────────────────────────┘
```

- **Web build keeps working.** All desktop APIs are consumed via `window.desktop?.…` no-op fallbacks; in a browser, Start listening shows the normal share picker.
- **Dev**: `npm run dev:desktop` → `next dev` + Electron pointed at `localhost:3000` (HMR intact).
- **Prod**: `next build` (`output: "standalone"`) shipped as plain files in `resources/next`, forked on a free localhost port. Packaged with electron-builder (AppImage/deb on Linux; mac/win config present, untested).
- **Audio reality check**: system-audio loopback exists on Windows (and newer macOS Electron, experimental). On Linux the stream is video-only; the UI shows a quiet "no system audio" hint and STT will fall back to mic / PipeWire monitor device.

## 3. Screen anatomy

One window, two columns at desktop width (single stacked column below `lg`). Meeting information lives in visible cards, not hidden panels.

```
┌────────────────────────────────────────────────────────────┐
│  ● Listening      Catch-Up Companion         🧍  📌  ⋯      │  header (56px)
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────── summary (blue) ─────────┐ ┌─ ask (violet)┐│
│  │ plain-language meeting summary,       │ │ What did I   ││
│  │ full width — room to breathe          │ │ miss? · What ││
│  └───────────────────────────────────────┘ │ are we decid…││
│                                            │ + inline     ││
│  ┌──────────── live captions ────────────┐ │ answers      ││
│  │  (neutral hero, internal scroll)      │ └──────────────┘│
│  │                                       │ ┌─ tasks (green)┐
│  │  …caption lines, generous leading…    │ │ • Sarah → API ││
│  │                                       │ │   fix  0:15   ││
│  └───────────────────────────────────────┘ └──────────────┘│
│                                                            │
│           ╭──────────────────────────────────╮             │
│           │ ⚑ I'm lost    ✦ Catch me up      │             │  floating bar
│           ╰──────────────────────────────────╯             │  bottom-6
└────────────────────────────────────────────────────────────┘
```

**Section color identity** — each card carries a quiet accent (4px left border + tinted icon + colored heading; 6–8% background wash except high-contrast, which keeps pure black surfaces). Color is never the only differentiator (icon + heading text always present). AA-checked per theme:

| Section | calm-light | calm-dark | high-contrast | dyslexia |
|---|---|---|---|---|
| Summary (blue) | `#1d4ed8` | `#93c5fd` | `#7dd3fc` | `#1d4ed8` |
| Current thread (teal) | `#0f766e` | `#5eead4` | `#5eead4` | `#0f766e` |
| Do I need to do anything (green, = caption-action) | `#047857` | `#a6e3a1` | `#00e676` | `#56650a` |
| Ask the meeting (violet, = caption-decision) | `#7c3aed` | `#cba6f7` | `#ff9df2` | `#4f55a7` |

Live captions stay neutral — the hero stays calm; color lives on the satellites. Rail order: Current thread → Do I need to do anything → Ask the meeting; the Summary card renders only when a summary exists (demo mode today). On mobile the captions column stacks before the rail.

### Header
- Left: status — pulsing green dot + "Listening" while capturing; "Demo" badge in demo mode; nothing when idle.
- Center: app title, small and quiet ("Catch-Up Companion").
- Right: the **hero pill** plus utilities:
  - Idle → `[ 🖥 Start listening ]` — primary, size `xl`, the only prominent control on screen.
  - Capturing → same pill becomes `[ ■ Stop ]` (destructive variant).
  - `🧍` accessibility icon → right-side **Accessibility** sheet: your name (for mention detection), app-wide theme (calm light / calm dark / high contrast / dyslexia-friendly), text size, caption comfort controls. Nothing else lives here — it exists to demonstrate accessibility support.
  - `📌` pin icon (desktop only) → always-on-top toggle, tooltip "Keep on top".
  - `⋯` overflow menu → Use microphone only (PDD's mic-first path), Demo mode, Upload recording.

### Main grid
- Max width `72rem`, centered; `lg` two columns (`1fr / 360px` rail), stacked below.
- Left: Summary (blue, full width — room to breathe) above the captions hero (neutral, internal scroll).
- Right rail: **Ask the meeting** (violet) and **Action items** (green) — visible, not hidden in panels; rail scrolls independently at `lg`.
- Bottom padding clears the floating bar; on mobile the page scrolls and captions keep a `45dvh` floor.

### Ask the meeting (issue #8)
- Five constrained prompts, never a chatbot: **What did I miss?** (opens the Catch-me-up dialog — one recovery flow, no duplicate answers), **What are we deciding?**, **Do I need to do anything?**, **Explain this simply** (inline term input; empty = latest confusing phrase), **What question should I ask?**.
- Answers: 1–3 plain sentences from the last 3 minutes of transcript + a verbatim source snippet; skeleton while loading; retry on error; "Sample" badge without an API key. `/api/ask` mirrors `/api/missed` (Responses API, strict schema, deterministic fallback).

### Floating control bar
- `fixed bottom-6`, centered, `w-fit`, `rounded-full`, `bg-background/80 backdrop-blur`, soft shadow.
- Two `xl` pills:
  - **⚑ I'm lost** — primary. Click = timestamp marked, no dialog, no interruption. Also fired by global shortcut `Ctrl/Cmd+Shift+L` even when the window is unfocused.
  - **✦ Catch me up** — secondary. Opens the recap dialog.
- When a marker exists, a **lost-marker pill** appears between them: `⚑ Lost at 2:34 ✕` — the ✕ clears it. This replaces the old tiny footer text.
- Disabled state (idle): the bar stays visible but muted, teaching the layout before the meeting starts.

## 4. Catch-me-up dialog

The recovery moment — it must feel instant and structured.

```
╭───────────────────────────────────────────╮
│  Catch me up                              │
│  Get a short recap of what you missed.    │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ ⚑  Since I got lost      (at 2:34) │  │  primary, only if marker
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │ ◷  Last 2 minutes                   │  │  outline
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │ ◷  Last 90 seconds                  │  │  outline
│  └─────────────────────────────────────┘  │
│                                           │
│  ── result area ──                        │
│  loading  → 3–4 skeleton lines           │
│  error    → "Couldn't build your recap." │
│             [ Try again ]                 │
│  success  → recap in rounded muted card  │
│             + action items w/ badges     │
╰───────────────────────────────────────────╯
```

- Window choices are **full-width stacked `xl` buttons** — big targets, one glance.
- "Since I got lost" leads and is the primary variant when a marker exists; the marker time is its sublabel.
- Loading is skeleton lines, never bare "Generating…" text. Errors are friendly and retryable (last request is remembered).
- Result copy stays short, specific, cautious ("Possible task", never invented certainty) per PDD.

## 5. Visual language

| Token | Choice |
|---|---|
| Radius | Pills (`rounded-full`) for actions; `rounded-2xl` for surfaces; base `--radius` may bump to 0.75rem |
| Palette | Neutral oklch base + four quiet section hues (blue/teal/green/violet, AA per theme); single green status dot |
| Buttons | New `xl` (h-12, rounded-full, px-6, text-base) and `icon-xl` sizes in `ui/button.tsx` |
| Icons | lucide-react, 20px in `xl` buttons: `ScreenShare`, `Square`, `Flag`, `Sparkles`, `Pin`, `Settings2`, `X` |
| Depth | Soft borders + `shadow-sm`/`shadow-lg`; blur on the floating bar; no hard elevation |
| Motion | `tw-animate-css` / Radix data-state only — fades and gentle slide for dialog/sheet; pulsing dot; no framer-motion |
| Type | Existing Geist sans; captions get relaxed line-height; no new fonts |

## 6. Interaction details

- **One-click start**: `Start listening` → main process auto-selects the primary screen; no source picker (X11; Wayland may show a one-time system consent).
- **Keyboard**: `Ctrl/Cmd+Shift+L` = I'm lost (global, works unfocused). Dialog inherits Radix focus handling; all controls reachable by tab.
- **Graceful degradation** (web): picker appears on start; pin/shortcut/settings-desktop rows hidden; everything else identical.
- **No-audio hint** (Linux): small muted badge near the status dot — "Screen only, no system audio" — informative, not alarming.
- **Stop** always fully tears down: stream tracks, session clock, transcript state.

## 7. Out of scope (this iteration)

- Frameless/translucent overlay window and screen-share invisibility (Cluely's stealth mode) — revisit after the core flow ships.
- API-key settings UI for the packaged app (needed before the OpenAI phase ships to users; tracked as follow-up).
- Speaker identity, post-meeting summaries, heavy caption customization (PDD out of scope).

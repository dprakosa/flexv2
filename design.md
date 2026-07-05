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

One window, one column, three zones. No sidebars.

```
┌──────────────────────────────────────────────────────┐
│  ● Listening        Catch-Up Companion    ⚙  📌  ⋯   │  header (56px)
├──────────────────────────────────────────────────────┤
│                                                      │
│   ┌───────────────── current thread ─────────────┐   │  slim card
│   │ Topic: auth documentation                    │   │
│   └───────────────────────────────────────────────┘   │
│                                                      │
│   ┌──────────────── live captions ────────────────┐  │  fills space
│   │                                               │  │  rounded-2xl
│   │   …caption lines, generous line-height…       │  │
│   │                                               │  │
│   └───────────────────────────────────────────────┘  │
│                                                      │
│        ╭──────────────────────────────────╮          │
│        │ ⚑ I'm lost    ✦ Catch me up      │          │  floating bar
│        ╰──────────────────────────────────╯          │  bottom-6
└──────────────────────────────────────────────────────┘
```

### Header
- Left: status — pulsing green dot + "Listening" while capturing; "Demo" badge in demo mode; nothing when idle.
- Center: app title, small and quiet ("Catch-Up Companion").
- Right: the **hero pill** plus utilities:
  - Idle → `[ 🖥 Start listening ]` — primary, size `xl`, the only prominent control on screen.
  - Capturing → same pill becomes `[ ■ Stop ]` (destructive variant).
  - `⚙` settings icon → right-side sheet (legacy accessibility panel, action items).
  - `📌` pin icon (desktop only) → always-on-top toggle, tooltip "Keep on top".
  - `⋯` overflow menu → Demo mode, Upload recording (demoted; they're developer/fallback paths).

### Main column
- Max width `48rem`, centered. Captions are the hero: `rounded-2xl`, soft border, `shadow-sm`, roomy padding.
- "Current thread" is a slim one-line card above the captions (topic / last decision), per PDD's Current Thread panel.
- Bottom padding clears the floating bar.

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
| Palette | Existing neutral oklch theme; single green status dot; no new brand hues |
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

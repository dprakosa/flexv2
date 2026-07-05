# Design: Desktop Meeting Catch-Up Companion

> Source of truth for the desktop conversion and UI redesign. Product truth stays in `PDD.md`; this document covers how the app looks, feels, and is architected as a desktop app.

## 1. Product framing

A calm desktop companion that sits alongside your meeting. It sees the screen, hears the audio, and helps you recover when you lose the thread. Inspiration: Cluely — one-click start, very few controls, everything large, rounded, and obvious.

Design principles (in priority order):

1. **One decision at a time.** The screen never asks the user to choose between more than ~3 things.
2. **Large targets.** Primary actions are full pill buttons (48px+ tall), reachable without precision.
3. **Calm, not surveillance.** Neutral palette, soft borders, no red recording aesthetics. Status is a quiet pulsing dot, not a banner.
4. **Recovery in under 10 seconds** (PDD success criterion). "Catch me up" is always one click or one keystroke away.
5. **Accessible by default.** The app serves users with cognitive disabilities and ADHD: no italics anywhere, no color-only meaning, high text contrast (secondary text ≥7:1 where possible), no decorative fluff.

## 2. Platform architecture (Electron)

```
┌────────────────────────────────────────────────┐
│ Electron main process                          │
│  • BrowserWindow (contextIsolation, sandbox)   │
│  • setDisplayMediaRequestHandler               │
│      → desktopCapturer picks primary screen    │
│      → audio: 'loopback' (win/mac), none linux │
│  • globalShortcut Ctrl/Cmd+Shift+L → catch up  │
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

One window, two panes at desktop width (single stacked column below `lg`). Layout is Cluely-inspired: captions left, orientation + chat right. Visual identity is the **Clay design system** (getdesign.md/clay) — cream canvas, near-black ink, hairline borders, saturated accents used sparingly.

```
┌────────────────────────────────────────────────────────────┐
│  ● Listening      Catch-Up Companion         🧍  📌  ⋯      │  header (56px)
├────────────────────────────────────────────────────────────┤
│  ┌──────────── live captions ───────────┐ ┌─ ask ─────────┐│
│  │  (neutral hero, internal scroll)     │ │ flat chat:    ││
│  │                                      │ │ ● auto notes  ││
│  │  …caption lines, generous leading…   │ │ user bubbles  ││
│  │                                      │ │ plain answers ││
│  │ ┌─ NOW strip (teal highlight) ─────┐ │ │ + quotes      ││
│  │ │ NOW / DECIDED / OPEN, only when  │ │ │               ││
│  │ │ detected; hides when empty       │ │ │ (3 pills)     ││
│  │ └──────────────────────────────────┘ │ │ [composer] [➤]││
│  └──────────────────────────────────────┘ └───────────────┘│
│           ╭────────────────╮                               │
│           │ ✦ Catch me up  │  floating bar, bottom-6       │
│           ╰────────────────╯                               │
└────────────────────────────────────────────────────────────┘
```

**Section color identity** — color appears as quiet accents (small-caps labels, the NOW strip's left border + tint), never as boxes around chat content. Accents are AA-safe darkened takes on the Clay brand hues. Color is never the only differentiator (label text + timestamps always present). AA-checked per theme:

| Accent | calm-light | calm-dark | high-contrast | dyslexia |
|---|---|---|---|---|
| NOW strip (teal/mint) | `#1a3a3a` | `#a4d4c5` | `#5eead4` | `#0f766e` |
| Ask heading (lavender) | `#5b46b4` | `#b8a4ed` | `#c4b5fd` | `#4f55a7` |
| Auto notes: tasks/questions (ochre) | `#8a6612` | `#e8b94a` | `#00e676` | `#56650a` |
| Auto notes: mentions (pink) | `#c2185b` | `#ff7fae` | `#ff9df2` | `#9d2153` |

Live captions stay neutral; the **NOW strip** (`NowStrip.tsx`) docks at the bottom of the captions pane — up to three labeled lines (NOW / DECIDED / OPEN) that render only when the heuristic detects something, hiding entirely otherwise. The right pane is the **Ask the meeting** chat alone, a flat `bg-card` surface. On mobile the captions column (strip included) stacks before the chat, which keeps a `55dvh` floor. The demo summary paragraph has no UI (the `summary` store field remains for future `/api/summary` wiring).

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
- Max width `72rem`, centered; `lg` two columns (`1fr / 360–420px` rail), stacked below.
- Left: the captions hero (neutral, internal scroll) with the **NOW strip** docked at its bottom.
- Right rail: the **Ask the meeting** chat panel alone (`flex-1`, internal scroll, composer pinned at the bottom).
- Bottom padding clears the floating bar; on mobile the page scrolls and captions keep a `45dvh` floor.

### Ask the meeting — chat panel
- A running conversation for the session, stored as `chatMessages` in `captionStore` (user bubbles, plain answers, flat auto notes, error lines with retry; capped at 200, cleared on session reset).
- **Flat output — no card-over-card**: the user's ink bubble is the only filled element; answers are plain left-aligned text with the transcript quote as an indented muted line (regular weight, never italic); auto notes are just a colored small-caps label line (`● MENTION · 1:20`) + the quote — no confidence hints, no redundant sentence (the label word "POSSIBLE" carries the uncertainty). Messages separate by whitespace (`space-y-5`), not boxes.
- **Quick asks** (`QuickAsks.tsx`) — exactly three, each saving real typing for someone who lost the thread: **Catch me up** (opens the recap dialog), **What are we deciding?**, **What should I ask?**. They render as large stacked **starter buttons** in the empty chat and collapse to one **slim pill row** above the composer once any message exists. ("Anything for me to do?" is covered by the auto notes; explaining a term is just typed into the composer.)
- **Free-text composer**: sends `promptKey: "custom"` to `/api/ask` (question ≤300 chars, transcript-grounded guardrails, deterministic keyword-match fallback without an API key). Input stays enabled while an answer loads so focus survives.
- **Proactive auto notes**: mentions/tasks/questions detected for the user auto-append into the thread as they're derived — deduped for the whole session by `type:sourceChunkId`, max 3 per refresh, source quote snapshotted at post time; announced via the aria-live announcer.
- Answers: 1–3 plain sentences from the last 3 minutes of transcript + a verbatim source snippet; skeleton while loading (outside the `role="log"` region so screen readers hear each completed message exactly once); "Sample" badge without an API key.
- Auto-scroll follows new messages only while the reader is near the bottom (or just sent a question).

### Floating control bar
- `fixed bottom-6`, centered, `w-fit`, `rounded-full`, solid `bg-card` + hairline border (no blur, no heavy shadow).
- One `xl` pill: **✦ Catch me up** — primary. One tap opens the recap dialog (keyboard: **C**; desktop global shortcut `Ctrl/Cmd+Shift+L` also opens it, even unfocused). The lost-marker two-step (mark now, recap later) was removed as too opaque — recovery is a single action.
- Disabled state (idle): the bar stays visible but muted, teaching the layout before the meeting starts.

## 4. Catch-me-up dialog

The recovery moment — it must feel instant and structured.

```
╭───────────────────────────────────────────╮
│  Catch me up                              │
│  Get a short recap of what you missed.    │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ ◷  Last 2 minutes                   │  │  primary, autofocused
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
╰───────────────────────────────────────────╯
```

- Window choices are **full-width stacked `xl` buttons** — big targets, one glance; "Last 2 minutes" is primary and autofocused.
- Loading is skeleton lines, never bare "Generating…" text. Errors are friendly and retryable (last request is remembered).
- Result copy stays short, specific, cautious ("Possible task", never invented certainty) per PDD. No italics in the recap.

## 5. Visual language

| Token | Choice |
|---|---|
| Radius | Pills (`rounded-full`) for actions/chips; `rounded-2xl` for surfaces; base `--radius` = 0.75rem (Clay: 12px buttons/inputs, ~17px cards, ~22px panels) |
| Palette | Clay (getdesign.md/clay): cream canvas `#fffaf0`, **white panels `#ffffff`** for clear plane separation, ink `#0a0a0a` primary, warm hairline `#ddd6c6`, secondary text `#525252` (≈7.5:1); accents teal/lavender/ochre/pink (AA per theme). calm-dark = Clay-dark: teal-tinted near-black `#0a1a1a`/`#16282a`, cream ink `#f5f0e0`, pastel accents, borders at 20% white. high-contrast/dyslexia keep their accessibility palettes |
| Buttons | `xl` (h-12, rounded-full, px-6, text-base) and `icon-xl` sizes in `ui/button.tsx`; suggestion chips = `outline sm rounded-full` |
| Icons | lucide-react, 20px in `xl` buttons: `ScreenShare`, `Square`, `Sparkles`, `Pin`, `Settings2`, `X`, `Send`, `ArrowDown` |
| Depth | Hairline borders + tinted washes; no glassmorphism, no blur, no heavy shadows (Clay: depth from color contrast, not elevation) |
| Motion | `tw-animate-css` / Radix data-state only — fades and gentle slide for dialog/sheet; pulsing dot; no framer-motion |
| Type | Existing Geist sans (Inter-class, close to Clay's stack); captions get relaxed line-height; **no italics anywhere** (dyslexia/cognitive readability); no new fonts |

## 6. Interaction details

- **One-click start**: `Start listening` → main process auto-selects the primary screen; no source picker (X11; Wayland may show a one-time system consent).
- **Keyboard**: **C** opens Catch me up in-app; `Ctrl/Cmd+Shift+L` (global, works unfocused) also opens it on desktop. Dialog inherits Radix focus handling; all controls reachable by tab.
- **Live captions behavior**: auto-follow the newest line; scrolling up pauses following and shows a `↓ Latest` pill to jump back. Timestamps sit in a fixed left gutter (small, tabular). Decision/action lines carry a labeled chip (`✓ Decision` / `→ Action`) — never color alone. The newest caption renders full-strength; older lines are slightly quieter (still ≥4.5:1).
- **Graceful degradation** (web): picker appears on start; pin/shortcut/settings-desktop rows hidden; everything else identical.
- **No-audio hint** (Linux): small muted badge near the status dot — "Screen only, no system audio" — informative, not alarming.
- **Stop** always fully tears down: stream tracks, session clock, transcript state.

## 7. Out of scope (this iteration)

- Frameless/translucent overlay window and screen-share invisibility (Cluely's stealth mode) — revisit after the core flow ships.
- API-key settings UI for the packaged app (needed before the OpenAI phase ships to users; tracked as follow-up).
- Speaker identity, post-meeting summaries, heavy caption customization (PDD out of scope).

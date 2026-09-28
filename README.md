# Tempo chess trainer

A React + TypeScript chess practice app with a local Stockfish 19 WASM opponent, engine-informed coaching, persistent play-style summaries, and nine lessons with knowledge checks.

## Public demo and source

[View the source on GitHub](https://github.com/pbot424/tempo-chess-trainer).
The public build includes browser-based play, automatic Stockfish feedback, lessons, practice, and progress. Free-text AI chat is available when running locally; the public demo links to the setup guide instead of showing an unavailable chat box.

## Run locally

Requires Node.js 22.6 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. For the conversational coach, follow [Local AI setup](docs/LOCAL_AI.md).

## Build and deploy

```sh
npm test
npm run build:portfolio
```

This builds for `/chess/` on an existing portfolio. Follow [Cloudflare deployment instructions](docs/DEPLOYMENT.md) to integrate the output into the portfolio site. `npm run build` builds a standalone root-hosted demo; `npm run preview` previews the last static build. `npm run build:local && npm start` serves the compiled local AI edition at http://127.0.0.1:4173.

Production demo builds omit the conversational composer. Development and `build:local` enable it. No API secrets are required for public hosting.

## Features

- Six bot presets with beginner-friendly names and illustrative Elo targets.
- White, black, or random sides; legal-move highlights; castling, en passant, selectable promotion; checkmate and draw detection.
- Stockfish hints, two-ply undo, resignation, PGN export, active-game resume.
- A live coach conversation replaces setup during play: automatic move-specific praise and corrections, opponent threat observations, and Explain that move / What should I look for follow-ups. Conversation survives refresh; undo removes withdrawn commentary. New-game setup returns through Play another game after completion.
- Per-move evaluation loss plus persistent development, center control, castling, capture, and checking patterns.
- Lessons on movement, special rules, opening principles, tactics, strategy, king safety, pawn endings, basic mating technique, and thinking routines.
- Responsive layout and keyboard-operable controls.

## Coaching and storage

The chess opponent and automatic move feedback run locally in a browser Worker and rules over Stockfish evidence. The free-text conversational coach uses the local Ollama model by default, grounded in the current PGN, board facts, recent evaluated moves, selected focus, and recent conversation. It does not train a new model. Play-style labels are provisional pattern summaries. Short games are not penalized for failing to castle. Completed or resigned games inform the long-term profile; undo removes withdrawn moves from analysis.

Game, practice, difficulty, conversation and lesson data are stored in localStorage on this browser, with no account or cloud sync. Only free-text coach requests send the question and bounded game context to the model service via the local backend. Clearing browser storage removes this history. Export PGN for portable game records. Reloading during a move analysis may leave that move without an evaluation; the legal game position still resumes.

Elo numbers are training targets, not calibrated ratings. Presets combine Stockfish skill levels and occasional random legal moves at beginner levels. Brief searches make coaching estimates approximate. Hints and undo are available because these are untimed practice games. The app automatically ends on threefold repetition or the fifty-move threshold rather than requiring a draw claim.

## Conversational coach setup

The local edition defaults to **Ollama with Qwen3.5 9B**, running on your computer. No API key, ChatGPT allowance or Codex allowance is used. Install Ollama and download the model before using free-text chat; no automatic cloud fallback is configured.

See [Local AI setup and use](docs/LOCAL_AI.md) for CLI commands, future-project examples, memory guidance, and service controls. The shared endpoint is `http://127.0.0.1:11434` and the model is `qwen3.5:9b`. Optional settings in `.env.local`: `COACH_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3.5:9b`. Restart the app server after changing configuration.

Stockfish remains responsible for chess calculations. The local explanation model receives verified attacked/defended facts, broad piece locations, recent evaluation losses, the player's question and bounded conversation. It is not asked to calculate tactics from FEN. The local request uses an 8K context and non-thinking mode for latency, with up to six recent messages and three evaluated moves. Model memory use and response time depend on your hardware.

Replies use structured JSON and are screened for notation, square destinations and common direct instructions; one rewrite is attempted before the word-reveal animation displays a reply. These checks are defense in depth, not proof against every possible phrasing. Requests time out after 90 seconds. Stop, moving, undo and game completion invalidate pending replies. Drafts remain after errors or cancellation.

Previous providers remain explicit opt-ins: `COACH_PROVIDER=codex` uses the installed Codex CLI and its ChatGPT login; `COACH_PROVIDER=openai` requires `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Never use a `VITE_` prefix for secrets. Selecting Ollama never launches either provider.

The coach API remains loopback-only and same-origin, with bounded requests and rate limits. `npm start` binds to 127.0.0.1. Plain static hosting cannot run the conversational coach.

## Learning loop

- **Show me why:** isolated board exploration from live mistakes or saved-game reviews, with original comparison, legal attempts and conceptual feedback.
- **Game focus:** choose safety, development or central space; relevant board observations and end summaries are saved and respect undo.
- **Practice:** recurring learning themes become exercises from actual saved PGNs; track distinct ideas and revisit after three days.
- **Progress evidence:** normalized five-game comparisons, sample-size gates and linked examples; tentative style labels before enough data.
- **Difficulty:** three-position placement and conservative adaptive levels, with manual override and persisted preferences. Training Elo labels remain illustrative.

## Security and distribution

Environment files, credentials, dependency folders, build output, and local working notes are excluded from Git. Only `.env.example` is published, with no secrets. Never add API keys to browser code or variables beginning `VITE_`. The public artifact is only `dist/`, not the local server.

## Third-party assets

- Stockfish.js 19.0.0 lite single-threaded build: GPL-3.0, https://github.com/nmrugg/stockfish.js/tree/v19.0.0 (engine source/build instructions), https://github.com/official-stockfish/Stockfish. License included at `public/engine/COPYING.txt`. Preserve license and corresponding-source obligations when distributing the engine.
- Chess piece SVGs: Colin M. L. Burnett, GPLv2+, from https://github.com/lichess-org/lila/tree/master/public/piece/cburnett. Upstream asset attribution included at `public/pieces/LICENSE.md`.
- chess.js: BSD-2-Clause; React: MIT; Lucide: ISC.
- Fonts: DM Sans and Libre Caslon Display via Google Fonts.
- Concept and landscape illustration generated with the built-in Image Gen tool; see `design/prompts.md`.

Full shipped notices and corresponding-source links are in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).

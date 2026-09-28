# Run the AI coach locally

The public portfolio demo uses Stockfish and automatic move feedback entirely in your browser. Free-text conversations are available in the local edition, through a backend on your own computer. The public site does not connect to your computer's Ollama service.

## 1. Install the prerequisites

- Node.js 22.6 or newer and Git.
- [Ollama](https://ollama.com/download) for your operating system. Open the app, or run `ollama serve` if the service is not already running.
- Download the default local model:

```sh
ollama pull qwen3.5:9b
ollama list
```

The [9B model download](https://ollama.com/library/qwen3.5:9b) is about 6.6 GB. Leave additional memory for the model context, operating system, and browser. Speed depends on hardware. A smaller installed model can be selected below, but its coaching quality and structured-output support need verification.

## 2. Clone and start Tempo

```sh
git clone https://github.com/pbot424/tempo-chess-trainer.git
cd tempo-chess-trainer
npm ci
npm run dev
```

Open **http://127.0.0.1:5173** (or the local URL printed by Vite). Start a game. The coach panel will show a text box and confirm that Ollama is connected. Play a move and ask a question about your thinking.

No API key or environment file is needed for the default Ollama setup. The model must be running on the same computer as the Tempo backend.

## 3. Optional configuration

Copy `.env.example` to `.env.local` and adjust it if needed:

```dotenv
COACH_PROVIDER=ollama
OLLAMA_MODEL=qwen3.5:9b
```

Restart Tempo after changing settings. `.env.local` is ignored by Git. Never put credentials in browser code or variables prefixed `VITE_`.

For a compiled local edition:

```sh
npm run build:local
npm start
```

Open **http://127.0.0.1:4173**. Use `build:local` here: ordinary `npm run build` and `build:portfolio` deliberately omit the conversational composer. Keep the local edition at the root URL rather than under `/chess/`.

## Troubleshooting

- **Coach unavailable:** start Ollama and run `ollama list`; the name must match `OLLAMA_MODEL` exactly. Click **Check connection again**.
- **Port already in use:** an Ollama instance may already be running. Do not start a second one. If Tempo's port is busy, use the URL Vite prints.
- **Only a local setup link, no text box:** you are viewing the public build. Start `npm run dev` or rebuild with `npm run build:local`.
- **Slow or incomplete replies:** close memory-heavy applications, shorten your question, and try again. Requests time out after 90 seconds. The app keeps your draft.
- **Stop a model:** `ollama stop qwen3.5:9b` unloads it from memory. Tempo also requests unloading after five idle minutes.

## How it works and privacy

Stockfish performs chess analysis in a browser Worker. The language model receives your question, bounded conversation, and board facts through the local backend at `127.0.0.1`; it is not given shell access or other tools. Ollama uses an 8K context and non-thinking mode. Replies are screened for direct move recommendations, but explanations can still be wrong.

The default model runs locally with no automatic cloud fallback and no API subscription usage. Model installation requires a download. Fonts are loaded from Google Fonts, so the web app is not completely offline. Game history and preferences stay in this browser's localStorage; public and localhost sites have separate histories. PGN export preserves game records, not a complete app backup.

Optional Codex and OpenAI providers remain local-only opt-ins. They send question/game context to OpenAI and consume the applicable usage allowance. Keep those credentials server-side; neither is needed for the portfolio demo.

To disable Ollama's own cloud features, follow the [official local-only configuration instructions](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features). See also the [Ollama quickstart](https://docs.ollama.com/quickstart).

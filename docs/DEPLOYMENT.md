# Deploy Tempo under /chess/ on a Cloudflare portfolio

The public build is static. It requires no model server, account, database, API keys, or runtime secrets. `server/` is exclusively for local AI coaching and is not part of the deployment output.

## Build

```sh
npm ci
npm test
npm run build:portfolio
```

This produces `dist/` with asset URLs prefixed `/chess/`. For a different path, use `npm run build -- --base=/your-path/`. For a standalone site at its domain root, use `npm run build`.

## Integrate with the existing portfolio

The build's **contents** must live in a `chess/` directory inside the portfolio's deployed static output. The final structure should be:

```text
<portfolio-output>/
  index.html              # Existing portfolio
  chess/
    index.html            # Tempo
    assets/
    engine/
    pieces/
    landscape.png
    THIRD_PARTY_NOTICES.txt
```

Build Tempo, then copy its `dist/` contents into the portfolio's static/public `chess/` directory before building the portfolio, or into the portfolio output's `chess/` directory after its build. Automate this in the portfolio build pipeline and pin the Tempo commit used. Do not replace the portfolio's root output with Tempo's `dist/`.

Add a portfolio project link to `/chess/` and a source link to https://github.com/pbot424/tempo-chess-trainer. The demo also provides source, local AI setup, and asset credit links.

Cloudflare Pages serves matching directory index files. If the portfolio uses a Worker, framework server, catch-all redirects, or a service worker, ensure `/chess/` and `/chess/*` reach these static assets before the portfolio's own SPA fallback. Preserve the portfolio's existing routes. A separate Cloudflare project does not automatically mount itself at a path on the existing domain.

## Verify after deployment

- Open `/chess/` and refresh it directly; also check `/chess` redirects or loads correctly.
- Start a game, make a legal move, and wait for the engine reply and feedback.
- Check Learn, Practice, Your progress, undo, and refresh/resume.
- Verify the GitHub, local AI guide, and credits links.
- Verify `/chess/engine/stockfish-19-lite-single.wasm` serves a WASM file with `application/wasm`, not the portfolio HTML fallback.
- Verify no `/api/coach` requests are made in the public demo and no Ollama troubleshooting text appears.
- Check desktop and mobile browsers, including Safari and Firefox, and inspect console/network errors.
- Preserve the engine license, piece notices, and corresponding-source links in `THIRD_PARTY_NOTICES.txt`.

The lite single-threaded Stockfish build does not require SharedArrayBuffer isolation headers. If your portfolio has a Content Security Policy, allow its same-origin Worker/WASM execution and its Google Fonts styles/fonts; test the actual policy on the deployed site.

## presbot.dev integration

The target is `https://presbot.dev/chess/`. The portfolio uses a Cloudflare Worker with the `SITE_ASSETS` binding and a `dist/` output directory. Its `scripts/public-site.js` allowlist must include Tempo's entry, notices, image, and assets/engine/pieces directories. Its preview server also needs the WASM MIME type and the same scoped CSP used in `_headers`.

Keep the source revision in the portfolio's `chess/README.md`, outside the public file allowlist. The root portfolio build copies the approved static snapshot into `dist/chess/`; it does not build the local AI server.

The portfolio's project-card rules require a genuine walkthrough in WebM and MP4 plus a poster before the active card is released. The local recorder has a `tempo` walkthrough. Verify both card and expanded-dialog playback, offscreen pause, and reduced-motion fallback. Run the portfolio's tests/build and review any unrelated pending changes before deploying its Worker.

After release, verify the live URL under Cloudflare's actual routing and headers. Safari/Firefox and accessibility checks remain part of release QA. A social sharing image is optional polish; no accounts, analytics, or cloud sync are included.

References: [Cloudflare Pages routing](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Workers HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [Vite base paths](https://vite.dev/guide/build.html#public-base-path).

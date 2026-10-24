# Taskleaf

A standalone browser-based to-do app. No ChatGPT account, login, or hosting is required.

- Turn screenshots into editable tasks, descriptions, and possible due dates.
- View due dates in a monthly calendar, browse upcoming tasks, and edit tasks from any day.
- Organize tasks in Academic, Extracurricular, Work, or custom categories.
- Suggest High / Mid / Low priority from description keywords, with manual overrides.
- Ask Leaf for a next step or to edit names, dates, priorities, descriptions, categories, or task order. Undo the latest companion change.

## Run locally

Use Node.js 22.13 or newer. No package installation is required for the app.

```sh
git clone --branch taskleaf https://github.com/KenTheCraz/SbuHACKS2026.git
cd SbuHACKS2026
npm run dev
```

Open `http://127.0.0.1:8765` in Chrome, Safari, Firefox, or Edge. Normal task features work without any credentials.

For Leaf, copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` and a long random `APP_ACCESS_CODE`. Restart the server, open **Ask Leaf**, and enter that access code. The code stays in memory for the browser session; your API key stays server-side. Never commit either secret. API credits are required.

## Deploy on Render

1. Sign in at https://dashboard.render.com and choose **New → Blueprint**.
2. Connect this repository and select the `taskleaf` branch. Render reads `render.yaml`.
3. Supply `OPENAI_API_KEY` when prompted. The blueprint generates a random `APP_ACCESS_CODE`.
4. Deploy. Open the `onrender.com` URL from your service dashboard in any browser.
5. Find `APP_ACCESS_CODE` in the service environment settings and use it to unlock Leaf. Share this code only with people allowed to use your API account.

Normal task features are public. Leaf is protected by the access code. Deployment must be completed in your own hosting account; pushing this repository alone does not create a live URL. Your API key and runtime secrets from the old host are not copied automatically.

## Deploy on Cloudflare Workers

Connect this GitHub repository through **Workers & Pages → Create → Import a repository**. Select `taskleaf`, set build command `npm run build`, and deploy command `npx wrangler deploy`. The Worker name must match `taskleaf` in `wrangler.jsonc`.

Alternatively, after signing in with Wrangler:

```sh
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put APP_ACCESS_CODE
npm run deploy:cloudflare
```

Enter the secrets only into the terminal prompts or the hosting dashboard. The resulting `workers.dev` URL works without ChatGPT sign-in.

## Other Node hosts

Use build command `npm run build` and start command `npm start`. The server listens on `0.0.0.0` and the host-provided `PORT` (default `8765`). Supply the two secrets through your hosting settings. If running behind a trusted HTTPS reverse proxy, set `TRUST_PROXY=1` or set `PUBLIC_ORIGIN` to the complete public HTTPS origin. Serve the app over HTTPS.

## Checks and build

```sh
npm test
npm run build
# Optional: requires API credits and makes real API requests
npm run test:live
```

Default tests use mocked AI responses and require no secrets. Build output is `dist/server/index.js`; do not edit it directly. `dist/`, local environment files, and Wrangler state are ignored.

## Source layout

- `web/`: UI, OCR extraction, description-based priority rules, companion controls.
- `worker/api.mjs`: OpenAI integration with same-origin and access-code checks.
- `scripts/server.mjs`: standalone Node HTTP server.
- `scripts/build.mjs`: embeds the browser assets in a portable Worker.
- `wrangler.jsonc` and `render.yaml`: independent deployment configuration.

## Current limits

Tasks are stored in the current browser/device, separately for each website origin. Tasks from the old ChatGPT-hosted URL do not automatically appear on the new URL. Extraction and automatic priority use rules; Leaf uses the OpenAI API. Task data and conversation are shared with OpenAI only when a message is sent. OCR assets are fetched through fixed proxy routes. Companion requests support up to 200 tasks. Rate limiting is best-effort per server instance, not a global spending cap. Configure API usage limits for a shared deployment.

# Taskleaf

A standalone browser-based to-do app. No ChatGPT account, login, or hosting is required.

- Open Extras for Lock-ins study logging, configurable break reminders, a daily heatmap, and a fullscreen countdown with a ring.
- Open Home for today’s weather, a city picker, °F/°C units, and upcoming/overdue deadline notifications.
- Quickly capture phrases such as “Chemistry report Friday” or “Read in 3 days”, then review the suggested name and date before saving.
- Import images or multipage PDFs into editable tasks, descriptions, and possible due dates.
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

For Leaf, copy `.env.example` to `.env.local` and set `GROQ_API_KEY`. Restart the server and open **Ask Leaf**. No visitor access code is required; your API key stays server-side. Never commit the API key. Groq offers a rate-limited free tier; account limits still apply.

### Ask Leaf connection and study advice

In Ask Leaf, choose an optional study level (elementary, middle, high school, college, or graduate) and tell Leaf your subject, goal, and available time. Leaf uses this context to suggest study strategies; recommendations do not edit tasks unless you request edits.

If Ask Leaf reports that it needs a server connection, the running server is missing `GROQ_API_KEY`. A GitHub sign-in does not configure the AI provider. For local development, copy `.env.example` to `.env.local`, set your Groq API key there, and restart `npm run dev`. For Render, add `GROQ_API_KEY` in the service’s Environment settings and restart/redeploy. For Cloudflare, run `npx wrangler secret put GROQ_API_KEY` for the deployed Worker. Keep the key on the server; never commit it or enter it into Ask Leaf. A missing key cannot be repaired by a browser refresh or a code push alone.

## Deploy on Render

1. Sign in at https://dashboard.render.com and choose **New → Blueprint**.
2. Connect this repository and select the `taskleaf` branch. Render reads `render.yaml`.
3. Supply `GROQ_API_KEY` when prompted.
4. Deploy. Open the `onrender.com` URL from your service dashboard in any browser.
5. Open Leaf or choose Leaf AI extraction. No visitor access code is required.

Normal task features are public. Leaf is publicly available and protected by request limits. Deployment must be completed in your own hosting account; pushing this repository alone does not create a live URL. Your API key and runtime secrets from the old host are not copied automatically.

## Deploy on Cloudflare Workers

Connect this GitHub repository through **Workers & Pages → Create → Import a repository**. Select `taskleaf`, set build command `npm run build`, and deploy command `npx wrangler deploy`. The Worker name must match `taskleaf` in `wrangler.jsonc`.

Alternatively, after signing in with Wrangler:

```sh
npx wrangler login
npx wrangler secret put GROQ_API_KEY
npm run deploy:cloudflare
```

Enter the secrets only into the terminal prompts or the hosting dashboard. The resulting `workers.dev` URL works without ChatGPT sign-in.

## Other Node hosts

Use build command `npm run build` and start command `npm start`. The server listens on `0.0.0.0` and the host-provided `PORT` (default `8765`). Supply `GROQ_API_KEY` through your hosting settings. If running behind a trusted HTTPS reverse proxy, set `TRUST_PROXY=1` or set `PUBLIC_ORIGIN` to the complete public HTTPS origin. Serve the app over HTTPS.

## Checks and build

```sh
npm test
npm run build
# Optional: makes real Groq API requests within your account limits
npm run test:live
```

Default tests use mocked AI responses and require no secrets. Build output is `dist/server/index.js`; do not edit it directly. `dist/`, local environment files, and Wrangler state are ignored.

## Source layout

- `web/`: UI, OCR extraction, description-based priority rules, companion controls.
- `worker/api.mjs`: Groq integration with same-origin checks and request limits.
- `scripts/server.mjs`: standalone Node HTTP server.
- `scripts/build.mjs`: embeds the browser assets in a portable Worker.
- `wrangler.jsonc` and `render.yaml`: independent deployment configuration.

## Current limits

Tasks are stored in the current browser/device, separately for each website origin. Tasks from the old ChatGPT-hosted URL do not automatically appear on the new URL. Extraction and automatic priority use rules; Leaf uses the Groq API. Task data and conversation are shared with Groq when a message is sent; selected document pages are shared when Leaf AI extraction is chosen. OCR assets are fetched through fixed proxy routes. Companion requests support up to 200 tasks. Rate limiting is best-effort per server instance, not a global spending cap. Configure API usage limits for a shared deployment.

Weather uses Open-Meteo’s forecast and geocoding APIs, with attribution on Home. Stony Brook is the default city; location and unit preferences are stored in your browser. No weather API key or device-location permission is required. Review Open-Meteo’s usage terms for commercial deployments.

Lock-ins and countdowns use saved timestamps so background throttling does not lose elapsed time. Study time continues until paused/ended and is split at local midnight; breaks do not add study time. Settings → Lock-ins defaults to a break suggestion after 120 minutes and a 20-minute break. History and active timers are saved in the browser. Keep the browser open for countdown audio; browsers or operating systems can suspend pages or mute audio, delaying the ring until the page resumes. Timers do not send system notifications. Concurrent tabs coordinate lock-in updates using the Web Locks API when supported.

Uploads accept common browser-readable image formats (PNG, JPEG, WebP, GIF, BMP, AVIF, SVG, and others the browser can decode) and PDFs. HEIC/HEIF and TIFF depend on browser support; unsupported files receive a conversion message. Animated images use one frame. Files are limited to 30 MB; PDFs to 25 pages. PDF.js reads selectable text directly and Tesseract OCR reads scanned pages. Duplicate task suggestions across pages are merged by name/date. Locked PDFs must be unlocked first. On-device extraction keeps files in the browser. Leaf AI extraction sends rendered page images and extracted text to Groq, using up to two pages per request. Results include task names, descriptions, possible due dates, and source evidence for review. Uncertain dates remain blank. Runtime libraries are fetched through fixed proxy routes.

Leaf chat now uses Groq (`openai/gpt-oss-20b`); AI extraction uses Groq vision (`qwen/qwen3.8-27b`). These are Groq model IDs and do not require an OpenAI API account. Optional server settings `GROQ_CHAT_MODEL` and `GROQ_VISION_MODEL` can override them. Keep `GROQ_API_KEY` in server environment secrets. No `APP_ACCESS_CODE` is needed. For an existing Render service, add `GROQ_API_KEY` manually in its Environment settings before redeploying; changing the repository does not transfer local secrets. The upload dialog lets users choose Leaf AI or on-device extraction and retry a selected file. AI extraction and chat are validated before any tasks are saved.

Leaf chat and AI extraction are available to all visitors without an access code. The server keeps Groq credentials private and retains shared per-instance request limits (20 chat requests/minute, 40 extraction batches/minute), payload validation, and same-origin browser checks. These limits reduce abuse but are not a global spending cap; all visitors share the account quota. Old APP_ACCESS_CODE environment values are ignored and can be removed.

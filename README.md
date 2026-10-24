# Taskleaf

A simple to-do app that turns screenshots into editable tasks, organizes academic, extracurricular, and work lists, and includes Leaf, an AI task companion.

## Features

- Image text recognition with task names, possible due dates, and editable descriptions.
- Custom categories, completion tracking, and local browser storage.
- Automatic High / Mid / Low priority suggestions based on description keywords, with manual overrides.
- Leaf can recommend a next step, add or edit tasks, change dates and priorities, reorder the list, and delete tasks when requested.
- Companion changes are validated, and the most recent edit can be undone.

## Run locally

Use Node.js 22.13 or newer. No package installation is required.

1. Copy `.env.example` to `.env.local` and set your own `OPENAI_API_KEY`.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:8765`.

The development server binds only to localhost and simulates a signed-in identity. It is for local development, not production hosting. API credits are required for Leaf. Never commit `.env.local` or API keys.

## Checks and build

```sh
npm test
npm run build
# Optional: makes billable API requests using your configured key
npm run test:live
```

Default tests use mocked API responses and require no key or credits. The build generates a Cloudflare-compatible Worker at `dist/server/index.js`. `dist/` is ignored by Git.

## Deployment

The existing private app is hosted with ChatGPT Sites. `.openai/hosting.json` retains its Site identity. Publish using the Sites workflow and configure `OPENAI_API_KEY` as a server-side runtime secret. Do not put secrets into the hosting manifest or browser JavaScript.

Production API routes require the identity header supplied by Sites and enforce same-origin requests. Deploying to another host requires a trusted authentication layer; do not simply expose the local development server.

## Project layout

- `web/`: interface, image extraction, priority rules, and companion controls.
- `worker/api.mjs`: server-side OpenAI integration.
- `scripts/build.mjs`: generates the Worker and embeds frontend assets.
- `scripts/dev.mjs`: local preview server.
- `scripts/check-companion.mjs`: companion validation and optional live checks.

## Current limits

Tasks are stored on the current browser/device. OCR runs in the browser; recognition assets are fetched through fixed server-side proxy routes. Task/date extraction and automatic priority suggestions use rules. Leaf uses the OpenAI API and receives the task list and conversation only when a message is sent. Successful live AI edits have not yet been verified because the configured API account had no credits during testing. Companion requests support up to 200 tasks.

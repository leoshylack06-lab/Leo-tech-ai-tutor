# LEO TECH — Live AI Tutor MVP v0.2

This project serves the responsive LEO TECH website and a server-side Cloudflare Workers AI endpoint from the same Worker.

## Requirements
- Android with Termux, or any Node.js environment
- A Cloudflare account
- Browser access to authorize Wrangler
- Free Workers AI access enabled on your Cloudflare account

## Deploy from Termux
1. Install Node.js:
   ```sh
   pkg update
   pkg install nodejs -y
   ```
2. Enter the extracted project folder:
   ```sh
   cd ~/leo-tech-live-mvp
   ```
3. Authorize Wrangler:
   ```sh
   npx wrangler login
   ```
   Follow the browser prompt. Never paste a Cloudflare API token into chat.
4. Preview/deploy:
   ```sh
   npx wrangler deploy
   ```
   Review the output and open the `workers.dev` URL Wrangler prints.
5. Test the endpoint:
   ```sh
   curl -s https://YOUR-WORKER-URL.workers.dev/api/health
   ```
6. Open the Worker URL in your browser and test the live tutor.

## Model and free limits
The Worker uses `@cf/meta/llama-3.1-8b-instruct` through the `env.AI` binding. Cloudflare Workers AI currently advertises 10,000 Neurons/day on the Workers Free plan; model availability and quotas can change. Check the current Cloudflare dashboard and pricing documentation before launch. Inference can stop when the daily free allocation or model capacity is reached.

## Security implemented in this MVP
- The browser never receives a provider API key.
- AI inference runs inside the Worker using the built-in AI binding.
- Input length, message roles, history length and selected learning paths are validated.
- Same-origin browser requests are enforced.
- A basic in-memory per-IP request limiter is included (8 requests/minute per isolate; best effort only, not a global guarantee).
- AI/provider error details are not exposed to the browser.
- Responses are not cached.

## Before a public student launch
- Replace the best-effort in-memory limiter with a globally consistent rate limit (e.g. Cloudflare rate limiting / durable storage solution).
- Add daily usage caps, monitoring and a clear quota-exhausted message.
- Publish a privacy policy and terms; review Cloudflare's current AI data retention and model terms.
- Add a content/reporting policy and age-appropriate protections if serving minors.
- Do not store chat history until a disclosed retention and deletion plan exists.
- Never run arbitrary submitted code directly in the Worker. Use an isolated, sandboxed execution service if code execution is later added.
- Test educational accuracy before relying on generated answers for exams.

## Local preview
```sh
npx wrangler dev
```
This can require Cloudflare login and local AI inference may count against quotas.


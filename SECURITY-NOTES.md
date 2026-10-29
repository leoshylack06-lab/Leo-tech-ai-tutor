# Security notes

This MVP uses Cloudflare's built-in Workers AI binding. No separate model-provider key is placed in browser code or needed for the AI binding.

The current in-memory request limiter is only a best-effort abuse barrier because Cloudflare can run multiple Worker isolates. Do not treat it as a production-grade global rate limiter. Add durable rate limiting and monitor inference usage before promoting the service widely.

Do not ask students to submit passwords, API keys, personal records, or sensitive information. Explain that AI answers may be wrong. Before serving children/minors at scale, get appropriate privacy/legal review and implement age-appropriate safeguards.

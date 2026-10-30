const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 8;

// Best-effort per-isolate cooldown. This is a basic abuse guard, not a globally
// consistent rate limiter; use a durable rate-limiting service before scaling.
const recentRequests = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

const SYSTEM_PROMPT = `You are LEO AI Tutor, a patient programming teacher for learners.
Teach step by step, using clear simple language and small examples.
The learner's selected programming path and level are provided in the user's context.
For coding questions: explain the idea, show a small correct example, then explain it.
If asked to debug, ask for the exact error and relevant code if missing.
Never claim you executed code unless a verified code execution tool was actually used.
Be honest when uncertain. Encourage safe, ethical, legal programming.
Do not ask for passwords, API keys, or unnecessary personal information.
Keep answers useful and focused; use Markdown formatting where helpful.
AI can make mistakes; encourage verification for important details.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function allowedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // allows same-origin non-browser clients; endpoint still validates input
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function rateLimitKey(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function isRateLimited(request) {
  const now = Date.now();
  const key = rateLimitKey(request);
  const existing = recentRequests.get(key) || [];
  const active = existing.filter((time) => now - time < WINDOW_MS);
  if (active.length >= MAX_REQUESTS_PER_WINDOW) {
    recentRequests.set(key, active);
    return true;
  }
  active.push(now);
  recentRequests.set(key, active);
  // Keep this best-effort map bounded.
  if (recentRequests.size > 1000) {
    for (const [oldKey, times] of recentRequests) {
      if (!times.length || now - times[times.length - 1] >= WINDOW_MS) recentRequests.delete(oldKey);
      if (recentRequests.size <= 800) break;
    }
  }
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "LEO AI Tutor", mode: "live-ai" });
    }

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json({ error: "Use POST for tutor questions." }, 405);
      if (!allowedOrigin(request)) return json({ error: "Request origin not allowed." }, 403);
      if (isRateLimited(request)) return json({ error: "Too many requests. Please wait a minute and try again." }, 429);

      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 8000) return json({ error: "Request is too large." }, 413);

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Request body must be valid JSON." }, 400);
      }

      const language = ["Python", "JavaScript", "HTML/CSS", "SQL", "AI"].includes(body.language)
        ? body.language : "Python";
      const level = ["Beginner", "Intermediate", "Advanced"].includes(body.level)
        ? body.level : "Beginner";

      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: "Send a programming question to begin." }, 400);
      }

      const messages = body.messages.slice(-MAX_HISTORY_TURNS).map((item) => {
        if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
          return null;
        }
        const content = item.content.trim();
        if (!content || content.length > MAX_MESSAGE_CHARS) return null;
        return { role: item.role, content };
      });

      if (messages.some((item) => item === null) || !messages.some((item) => item.role === "user")) {
        return json({ error: "Messages must contain valid text of 1–500 characters." }, 400);
      }

      try {
        const result = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "system", content: `Selected path: ${language}. Learner level: ${level}.` },
            ...messages
          ],
          max_tokens: 650,
          temperature: 0.4
        });

        const reply =
          result?.response ||
          result?.choices?.[0]?.message?.content ||
          result?.result?.response;

        if (typeof reply !== "string" || !reply.trim()) {
          return json({ error: "The AI model returned an empty response. Please try again." }, 502);
        }
        return json({ reply: reply.trim() });
      } catch (error) {
        // Do not return provider internals or secrets to the browser.
        console.error("LEO tutor inference failed", error?.name || "UnknownError", error?.message || "No error message");
        return json({ error: "AI inference failed.", diagnostic: String(error?.message || error).slice(0, 240) }, 503);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

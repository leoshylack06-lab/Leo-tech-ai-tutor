const $ = (selector, root = document) => root.querySelector(selector);

const messages = $("#chatMessages");
const input = $("#chatInput");
const form = $("#chatForm");
const language = $("#language");
const level = $("#level");

$("#year").textContent = new Date().getFullYear();

let conversationHistory = [];
let isSending = false;

function addTextParagraph(container, text) {
  const p = document.createElement("p");
  p.textContent = text;
  container.appendChild(p);
}

function renderTutorContent(text, bubble) {
  const parts = text.split(/```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g);

  for (let i = 0; i < parts.length; i += 3) {
    const normalText = parts[i];

    if (normalText && normalText.trim()) {
      normalText.split("\n").forEach(line => {
        if (line.trim()) addTextParagraph(bubble, line);
      });
    }

    if (i + 2 < parts.length) {
      const languageName = parts[i + 1] || "code";
      const codeText = parts[i + 2].replace(/^\n|\n$/g, "");

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";

      const toolbar = document.createElement("div");
      toolbar.className = "code-toolbar";

      const label = document.createElement("span");
      label.textContent = languageName.toUpperCase();

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy-code-button";
      copy.textContent = "Copy code";

      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          copy.textContent = "Copied!";
          setTimeout(() => copy.textContent = "Copy code", 1500);
        } catch {
          copy.textContent = "Copy unavailable";
        }
      });

      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeText;

      pre.appendChild(code);
      toolbar.append(label, copy);
      wrapper.append(toolbar, pre);
      bubble.appendChild(wrapper);
    }
  }
}

function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role === "user" ? "user-message" : "tutor-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "Y" : "L";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role !== "user") {
    const tag = document.createElement("span");
    tag.className = "message-tag";
    tag.textContent = "LEO AI";
    bubble.appendChild(tag);
    renderTutorContent(text, bubble);
  } else {
    addTextParagraph(bubble, text);
  }

  wrap.append(avatar, bubble);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

async function sendQuestion(text) {
  const question = text.trim();

  if (!question || isSending) return;

  addMessage("user", question);

  conversationHistory.push({
    role: "user",
    content: question
  });

  conversationHistory = conversationHistory.slice(-8);
  isSending = true;
  input.disabled = true;

  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversationHistory,
        language: language.value,
        level: level.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Tutor request failed (${response.status}).`);
    }

    const reply = typeof data.reply === "string"
      ? data.reply
      : "I couldn't form a response. Please try again.";

    addMessage("tutor", reply);

    conversationHistory.push({
      role: "assistant",
      content: reply
    });

    conversationHistory = conversationHistory.slice(-8);

  } catch (error) {
    addMessage(
      "tutor",
      `I couldn't reach the live tutor. ${error.message || "Please try again shortly."}`
    );

    conversationHistory.pop();

  } finally {
    isSending = false;
    input.disabled = false;

    if (submitButton) submitButton.disabled = false;

    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const question = input.value;
  input.value = "";

  sendQuestion(question);
});

messages.addEventListener("click", event => {
  const button = event.target.closest("[data-prompt]");

  if (button) sendQuestion(button.dataset.prompt);
});

$("#clearChat").addEventListener("click", () => {
  conversationHistory = [];
  messages.replaceChildren();

  addMessage(
    "tutor",
    "Conversation reset. What would you like to understand next?"
  );
});

document.querySelectorAll("[data-path]").forEach(button => {
  button.addEventListener("click", () => {
    const path = button.dataset.path;

    language.value = path;
    $("#tutor").scrollIntoView({ behavior: "smooth" });

    input.value = `Help me start learning ${path}.`;
    input.focus({ preventScroll: true });
  });
});

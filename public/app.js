const $ = (selector, root = document) => root.querySelector(selector);
const messages = $("#chatMessages");
const input = $("#chatInput");
const form = $("#chatForm");
const language = $("#language");
const level = $("#level");

$("#year").textContent = new Date().getFullYear();

function addMessage(role, text, code = "") {
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
    tag.textContent = "LEO TUTOR · DEMO";
    bubble.appendChild(tag);
  }
  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);
  if (code) {
    const pre = document.createElement("pre");
    pre.textContent = code;
    bubble.appendChild(pre);
  }
  wrap.append(avatar, bubble);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function tutorReply(question, lang, levelName) {
  const q = question.toLowerCase();
  const beginner = levelName === "Beginner";
  if (q.includes("challenge") || q.includes("exercise") || q.includes("practice")) {
    const challenges = {
      Python: ["Mini challenge: ask the user for their name, then print a friendly greeting.", "name = input('What is your name? ')\nprint('Hello, ' + name + '!')"],
      JavaScript: ["Mini challenge: store a name in a variable and show a greeting in the browser console.", "const name = 'Learner';\nconsole.log(`Hello, ${name}!`);"],
      "HTML/CSS": ["Mini challenge: create a heading and a paragraph, then style the heading with CSS.", "<h1>My first page</h1>\n<p>I am learning web development.</p>"],
      SQL: ["Mini challenge: retrieve every row from a table named students.", "SELECT * FROM students;"],
      AI: ["Mini challenge: explain why a model needs training examples before making useful predictions.", "Think: data → learning process → model → prediction"]
    };
    return challenges[lang] || challenges.Python;
  }
  if (q.includes("variable")) {
    const code = lang === "Python" ? "name = 'Leo'\nage = 17\nprint(name)" : lang === "JavaScript" ? "const name = 'Leo';\nlet age = 17;\nconsole.log(name);" : lang === "SQL" ? "SELECT name\nFROM students;" : lang === "HTML/CSS" ? "<p class=\"greeting\">Hello!</p>\n.greeting { color: cyan; }" : "features = [data points]\nmodel learns patterns";
    return [`A variable is a named place to keep a value so your program can use it later. Think of it as a labeled box. In ${lang}, the exact syntax depends on what you're storing. Try changing the value and predicting the output before running it.`, code];
  }
  if (q.includes("function")) {
    const code = lang === "Python" ? "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Leo'))" : lang === "JavaScript" ? "function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet('Leo'));" : lang === "SQL" ? "SELECT UPPER(name)\nFROM students;" : lang === "HTML/CSS" ? "/* Reuse a CSS class for shared styles */\n.card { padding: 1rem; }" : "def predict(features):\n    # use a trained model\n    return model_output";
    return ["A function is a reusable block of logic. You give it a name, optionally pass inputs, and it can return a result. Functions help avoid repeating code and make programs easier to test. This is a small example:", code];
  }
  if (q.includes("loop") || q.includes("iteration") || q.includes("repeat")) {
    const code = lang === "Python" ? "for number in range(1, 4):\n    print(number)" : lang === "JavaScript" ? "for (let n = 1; n <= 3; n++) {\n  console.log(n);\n}" : lang === "SQL" ? "SELECT name\nFROM students\nORDER BY name;" : lang === "HTML/CSS" ? "Use repeated HTML elements for a list;\nuse CSS to style them consistently." : "Training repeats an update step\nacross many batches of examples.";
    return ["A loop repeats a set of instructions. It saves you from writing the same instruction again and again. In this example, notice where the loop starts and when it stops. What do you think changes if the limit becomes 5?", code];
  }
  if (q.includes("html") || q.includes("css") || lang === "HTML/CSS") {
    return ["HTML describes the structure of a page; CSS controls how it looks. A useful first project is a profile card with a heading, short bio, and a button. Build the structure first, then add spacing, color, and responsive layout. What part would you like to try first?", "<h1>My profile</h1>\n<p>I'm learning to build for the web.</p>"];
  }
  if (q.includes("sql") || lang === "SQL") {
    return ["SQL is a language for asking questions of relational databases. SELECT chooses columns, FROM names the table, and WHERE filters rows. Start with reading data before learning updates or deletes.", "SELECT name, level\nFROM students\nWHERE level = 'Beginner';"];
  }
  if (q.includes("ai") || q.includes("machine learning") || lang === "AI") {
    return ["AI is a broad field. Machine learning is one approach where a model learns patterns from examples rather than relying only on manually written rules. A good beginner path is: data, features, training, evaluation, and limitations. Always test whether a model works on examples it has not seen.", "examples → training → model → evaluation"];
  }
  if (q.includes("error") || q.includes("bug") || q.includes("not working")) {
    return ["Debugging starts by making the problem specific. Share the exact error message, the smallest relevant code snippet, what you expected, and what actually happened. Change one thing at a time and test again. This demo cannot execute code, but the full tutor will need a safe code-runner design.", ""];
  }
  return [`Let's learn ${lang} at the ${levelName.toLowerCase()} level. Start by splitting your question into three parts: what you already know, what result you expect, and which step feels confusing. A useful learning loop is: explanation → tiny example → your attempt → feedback. This is a demo response, so live AI has not been connected yet. Try asking about variables, functions, loops, or a beginner challenge.`, ""];
}

let conversationHistory = [];
let isSending = false;

async function sendQuestion(text) {
  const question = text.trim();
  if (!question || isSending) return;

  addMessage("user", question);
  conversationHistory.push({ role: "user", content: question });
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
    const reply = typeof data.reply === "string" ? data.reply : "I couldn't form a response. Please try again.";
    addMessage("tutor", reply);
    conversationHistory.push({ role: "assistant", content: reply });
    conversationHistory = conversationHistory.slice(-8);
  } catch (error) {
    addMessage("tutor", `I couldn't reach the live tutor. ${error.message || "Please try again shortly."} Your question wasn't saved by this demo.`);
    conversationHistory.pop(); // allow the user to retry without duplicating the failed user turn
  } finally {
    isSending = false;
    input.disabled = false;
    if (submitButton) submitButton.disabled = false;
    input.focus();
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = input.value;
  input.value = "";
  sendQuestion(question);
});
messages.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prompt]");
  if (button) sendQuestion(button.dataset.prompt);
});
$("#clearChat").addEventListener("click", () => {
  conversationHistory = [];
  messages.replaceChildren();
  addMessage("tutor", "Conversation reset. What would you like to understand next?");
});
document.querySelectorAll("[data-path]").forEach((button) => {
  button.addEventListener("click", () => {
    const path = button.dataset.path;
    language.value = path;
    $("#tutor").scrollIntoView({ behavior: "smooth" });
    input.value = `Help me start learning ${path}.`;
    input.focus({ preventScroll: true });
  });
});

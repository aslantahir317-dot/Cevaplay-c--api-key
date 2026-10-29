const fs = require("fs");
const path = require("path");

const MEMORY = path.join(__dirname, "memory.json");

function readMemory() {
  try {
    return fs.existsSync(MEMORY)
      ? fs.readFileSync(MEMORY, "utf8")
      : "";
  } catch {
    return "";
  }
}

function saveMemory(value) {
  fs.writeFileSync(MEMORY, value, "utf8");
}

const PROVIDERS = {
  openrouter: {
    key: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/free"
  },
  groq: {
    key: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-20b"
  },
  openai: {
    key: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini"
  },
  xai: {
    key: "XAI_API_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    model: "grok-4.7"
  }
};

async function cevapla(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("Mesaj boş olamaz.");
  }

  const question = message.trim();

  if (/^öğren\s*:/i.test(question)) {
    const learned = question.replace(/^öğren\s*:/i, "").trim();
    const old = readMemory();
    saveMemory(old ? old + "\n" + learned : learned);
    return "Tamam krdsm, hafızama kaydettim. 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(question)) {
    return readMemory() || "Henüz kayıtlı bir bilgim yok.";
  }

  const providerName = (
    process.env.AI_PROVIDER || "openrouter"
  ).trim().toLowerCase();

  const provider = PROVIDERS[providerName];

  if (!provider) {
    throw new Error(
      "AI_PROVIDER değeri openrouter, groq, openai veya xai olmalı."
    );
  }

  const key = process.env[provider.key];

  if (!key) {
    throw new Error(
      provider.key + " Render ortamında eksik."
    );
  }

  const model = process.env[
    providerName.toUpperCase() + "_MODEL"
  ] || provider.model;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Sen Cevaplayıcı adlı Türkçe konuşan yapay zekâ asistanısın. " +
              "Açık, doğru ve samimi cevap ver. Kullanıcıya gerektiğinde " +
              "krdsm diye hitap et. Kayıtlı hafıza:\n" +
              readMemory().slice(-8000)
          },
          { role: "user", content: question }
        ],
        max_tokens: 1200
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        "İstek başarısız";

      throw new Error(
        providerName + " HTTP " + response.status + ": " + detail
      );
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error(providerName + " boş cevap döndürdü.");
    }

    return answer.trim();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(providerName + " bağlantısı zaman aşımına uğradı.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { cevapla };

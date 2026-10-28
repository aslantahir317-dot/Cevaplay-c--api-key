const fs = require("fs");
const path = require("path");

const MEMORY_FILE = path.join(__dirname, "memory.json");

function hafizayiOku() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return fs.readFileSync(MEMORY_FILE, "utf8");
    }
  } catch (e) {
    console.error("Hafıza okunamadı:", e.message);
  }
  return "";
}

function hafizayiYaz(text) {
  try {
    fs.writeFileSync(MEMORY_FILE, text, "utf8");
    return true;
  } catch (e) {
    console.error("Hafıza kaydedilemedi:", e.message);
    return false;
  }
}

async function cevapla(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("Mesaj boş olamaz.");
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Render ortamında XAI_API_KEY tanımlanmamış.");
  }

  const text = message.trim();

  if (/^öğren\s*:/i.test(text)) {
    const oldMemory = hafizayiOku();
    const newMemory = oldMemory
      ? oldMemory + "\n" + text.replace(/^öğren\s*:/i, "").trim()
      : text.replace(/^öğren\s*:/i, "").trim();

    if (!hafizayiYaz(newMemory)) {
      throw new Error("Bilgi hafızaya kaydedilemedi.");
    }
    return "Tamam krdsm, bu bilgiyi hafızama kaydettim. 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(text)) {
    return hafizayiOku() || "Henüz kayıtlı bir bilgim yok.";
  }

  const memory = hafizayiOku();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.7",
        messages: [
          {
            role: "system",
            content:
              "Sen Cevaplayıcı adlı yapay zekâ asistanısın. Türkçe, anlaşılır ve doğru cevap ver. Kullanıcıya doğal ve samimi konuş. Bilmediğin şeyi uydurma. " +
              (memory ? "\nKayıtlı hafıza:\n" + memory.slice(-10000) : "")
          },
          { role: "user", content: text }
        ],
        max_tokens: 1200,
        temperature: 0.7
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data?.error?.message || data?.message || `HTTP ${response.status}`;
      throw new Error(`xAI API (${response.status}): ${detail}`);
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("Grok boş yanıt döndürdü.");
    }

    return answer.trim();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Grok bağlantısı zaman aşımına uğradı.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { cevapla };

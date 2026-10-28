const fs = require("fs");
const path = require("path");

const MEMORY = path.join(__dirname, "memory.json");

function readMemory() {
  try { return fs.existsSync(MEMORY) ? fs.readFileSync(MEMORY, "utf8") : ""; }
  catch { return ""; }
}

function saveMemory(value) {
  fs.writeFileSync(MEMORY, value, "utf8");
}

async function cevapla(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("Mesaj boş olamaz.");
  }

  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("Render ortamında XAI_API_KEY eksik.");

  const question = message.trim();
  if (/^öğren\s*:/i.test(question)) {
    const old = readMemory();
    saveMemory(old ? old + "\n" + question.replace(/^öğren\s*:/i, "").trim()
                   : question.replace(/^öğren\s*:/i, "").trim());
    return "Tamam krdsm, hafızama kaydettim. 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(question)) {
    return readMemory() || "Henüz kayıtlı bir bilgim yok.";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.1-fast",
        messages: [
          {
            role: "system",
            content: "Sen Cevaplayıcı adlı Türkçe konuşan yapay zekâ asistanısın. Açık, doğru ve samimi cevap ver. Kayıtlı hafıza:\n" + readMemory().slice(-8000)
          },
          { role: "user", content: question }
        ],
        max_tokens: 1200
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`xAI HTTP ${response.status}: ${data?.error?.message || data?.message || "İstek başarısız"}`);
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("Grok boş cevap döndürdü.");
    }
    return answer.trim();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Grok bağlantısı zaman aşımına uğradı.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { cevapla };

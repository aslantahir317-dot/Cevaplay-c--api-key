const fs = require("fs");
const path = require("path");

const MEMORY = path.join(__dirname, "memory.json");

function oku() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY, "utf8"));
  } catch {
    return [];
  }
}

function yaz(data) {
  fs.writeFileSync(MEMORY, JSON.stringify(data, null, 2));
}

async function cevapla(mesaj) {
  const soru = String(mesaj || "").trim();
  if (!soru) return "Knk, bir soru yaz 😊";

  const ogren = soru.match(/^öğren:\s*(.+)$/i);
  if (ogren) {
    const hafiza = oku();
    hafiza.push({ bilgi: ogren[1], tarih: new Date().toISOString() });
    yaz(hafiza);
    return "Tamam knk, bilgiyi hafızama kaydettim! 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(soru)) {
    const hafiza = oku();
    return hafiza.length
      ? hafiza.map((x, i) => `${i + 1}. ${x.bilgi}`).join("\n")
      : "Henüz öğrenilmiş bilgi yok knk.";
  }

  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY Render ortamında ayarlanmamış.");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-4.7",
      messages: [
        {
          role: "system",
          content: "Sen Cevaplayıcı adlı Türkçe yapay zekâ asistanısın. Sade, doğru ve yardımcı cevaplar ver. Bilmediğini uydurma."
        },
        { role: "user", content: soru }
      ],
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(60000)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Grok HTTP ${res.status}`);
  }

  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Grok boş cevap verdi.");
  return answer;
}

module.exports = { cevapla };

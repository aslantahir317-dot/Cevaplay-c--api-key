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

  // Öğrenme özelliği
  const ogren = soru.match(/^öğren:\s*(.+)$/i);
  if (ogren) {
    const hafiza = oku();
    hafiza.push({ bilgi: ogren[1], tarih: new Date().toISOString() });
    yaz(hafiza);
    return "Tamam knk, bu bilgiyi hafızama kaydettim! 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(soru)) {
    const hafiza = oku();
    return hafiza.length
      ? hafiza.map((x, i) => `${i + 1}. ${x.bilgi || JSON.stringify(x)}`).join("\n")
      : "Henüz öğrenilmiş bir bilgi yok knk.";
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return "OpenRouter anahtarı sunucuda ayarlanmamış knk.";
  }

  const yanit = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "Cevaplayici"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: "Sen Cevaplayıcı adlı Türkçe konuşan bir yapay zekâ asistanısın. Kullanıcıya sade, doğru ve yardımcı cevaplar ver. Bilmediğin bilgileri uydurma."
          },
          { role: "user", content: soru }
        ]
      })
    }
  );

  const data = await yanit.json();

  if (!yanit.ok) {
    console.error("OpenRouter hatası:", yanit.status, data);
    throw new Error(data.error?.message || `OpenRouter HTTP ${yanit.status}`);
  }

  return data.choices?.[0]?.message?.content ||
    "Bu sefer cevap alamadım knk, tekrar dener misin?";
}

module.exports = { cevapla };

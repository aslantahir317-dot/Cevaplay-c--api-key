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

async function iste(url, key, model, messages) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "Cevaplayici"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(45000)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error?.message || `HTTP ${res.status}`
    );
  }

  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Boş cevap");

  return typeof answer === "string"
    ? answer
    : JSON.stringify(answer);
}

async function cevapla(mesaj) {
  const soru = String(mesaj || "").trim();
  if (!soru) return "Knk, bir soru yaz 😊";

  const ogren = soru.match(/^öğren:\s*(.+)$/i);

  if (ogren) {
    const hafiza = oku();
    hafiza.push({
      bilgi: ogren[1],
      tarih: new Date().toISOString()
    });
    yaz(hafiza);
    return "Tamam knk, bilgiyi hafızama kaydettim! 🧠";
  }

  if (/^(ne öğrendin|hafızanda ne var)\??$/i.test(soru)) {
    const hafiza = oku();
    return hafiza.length
      ? hafiza.map((x, i) =>
          `${i + 1}. ${x.bilgi || JSON.stringify(x)}`
        ).join("\n")
      : "Henüz öğrenilmiş bilgi yok knk.";
  }

  const sistem = {
    role: "system",
    content:
      "Sen Cevaplayıcı adlı Türkçe yapay zekâ asistanısın. " +
      "Sade, doğru ve yardımcı cevaplar ver. Bilmediğini uydurma."
  };

  const mesajlar = [sistem, { role: "user", content: soru }];

  const saglayicilar = [];

  if (process.env.OPENROUTER_API_KEY) {
    saglayicilar.push({
      ad: "OpenRouter",
      key: process.env.OPENROUTER_API_KEY,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL || "openrouter/free"
    });
  }

  if (process.env.GEMINI_API_KEY) {
    saglayicilar.push({
      ad: "Gemini",
      key: process.env.GEMINI_API_KEY,
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
    });
  }

  if (process.env.XAI_API_KEY) {
    saglayicilar.push({
      ad: "Grok",
      key: process.env.XAI_API_KEY,
      url: "https://api.x.ai/v1/chat/completions",
      model: process.env.XAI_MODEL || "grok-4.7"
    });
  }

  if (!saglayicilar.length) {
    throw new Error("Render ortamında AI anahtarı ayarlanmamış.");
  }

  const sonuclar = await Promise.allSettled(
    saglayicilar.map(async p => ({
      ad: p.ad,
      cevap: await iste(p.url, p.key, p.model, mesajlar)
    }))
  );

  const cevaplar = sonuclar
    .filter(x => x.status === "fulfilled")
    .map(x => x.value);

  const hatalar = sonuclar
    .filter(x => x.status === "rejected")
    .map((x, i) =>
      `${saglayicilar[i].ad}: ${x.reason.message}`
    );

  if (!cevaplar.length) {
    throw new Error("Hiçbir model cevap veremedi. Render loglarını kontrol et.");
  }

  // OpenRouter ile cevapları birleştirmeyi dene.
  if (process.env.OPENROUTER_API_KEY && cevaplar.length > 1) {
    try {
      const birlesik = await iste(
        "https://openrouter.ai/api/v1/chat/completions",
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_MODEL || "openrouter/free",
        [
          {
            role: "system",
            content:
              "Birden fazla yapay zekâ cevabını Türkçe tek bir yanıtta birleştir. " +
              "Ortak doğru bilgileri koru, çelişkileri belirt, " +
              "tekrarı azalt ve doğrulanmamış iddiaları kesinmiş gibi sunma."
          },
          {
            role: "user",
            content:
              `Soru: ${soru}\n\n` +
              cevaplar.map(x =>
                `--- ${x.ad} cevabı ---\n${x.cevap}`
              ).join("\n\n")
          }
        ]
      );

      return birlesik +
        "\n\nYanıtlar: " +
        cevaplar.map(x => x.ad).join(", ");
    } catch (e) {
      console.error("Birleştirme hatası:", e.message);
    }
  }

  return cevaplar.map(x =>
    `【${x.ad}】\n${x.cevap}`
  ).join("\n\n") +
    (hatalar.length
      ? "\n\nBazı modeller cevap veremedi: " + hatalar.join("; ")
      : "");
}

module.exports = { cevapla };

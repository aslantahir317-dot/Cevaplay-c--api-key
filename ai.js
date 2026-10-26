const fs = require("fs");

const MEMORY_FILE = "./memory.json";

if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify([], null, 2));
}

function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function temizle(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cevapla(message) {
  const original = String(message || "").trim();
  const text = temizle(original);
  const memory = loadMemory();

  // ÖĞRENME
  if (text.startsWith("öğren:") || text.startsWith("ogren:")) {
    const bilgi = original.split(":").slice(1).join(":").trim();

    if (!bilgi) {
      return "Ne öğrenmemi istediğini yaz knk. 😎";
    }

    memory.push({
      bilgi,
      tarih: new Date().toISOString()
    });

    saveMemory(memory);

    return `Tamam knk 🧠 Bunu hafızama kaydettim: ${bilgi}`;
  }

  // HAFIZA
  if (
    text === "ne öğrendin" ||
    text === "ne ogrendin" ||
    text === "hafızan" ||
    text === "hafizan" ||
    text === "hafızanda ne var" ||
    text === "hafizanda ne var"
  ) {
    if (memory.length === 0) {
      return "Henüz bir şey öğrenmedim knk. 🧠";
    }

    return (
      "Hafızamda şunlar var knk 🧠:\n\n" +
      memory.map((x, i) => `${i + 1}. ${x.bilgi}`).join("\n")
    );
  }

  // HAFIZADAN BİLGİ BUL
  if (memory.length > 0) {
    const kelimeler = text
      .split(" ")
      .filter(x => x.length >= 4);

    for (const item of memory) {
      const bilgi = temizle(item.bilgi);

      const eslesen = kelimeler.filter(k => bilgi.includes(k));

      if (eslesen.length >= 1) {
        return `🧠 Hafızamda bununla ilgili şunu buldum:\n\n${item.bilgi}`;
      }
    }
  }

  // BASİT MATEMATİK
  if (/^[0-9+\-*/().%\s]+$/.test(original)) {
    try {
      const sonuc = Function(
        `"use strict"; return (${original})`
      )();

      if (Number.isFinite(sonuc)) {
        return `Sonuç: ${sonuc}`;
      }
    } catch {}
  }

  // TEMEL KONUŞMA
  if (
    text === "merhaba" ||
    text === "selam" ||
    text === "sa" ||
    text.includes("merhaba")
  ) {
    return "Merhaba knk 😎 Ben Cevaplayıcı!";
  }

  if (
    text.includes("sen kimsin") ||
    text.includes("adın ne") ||
    text.includes("adin ne")
  ) {
    return "Ben Cevaplayıcı'yım 🤖 Kendi API motorumuz üzerinde çalışıyorum.";
  }

  if (
    text.includes("nasılsın") ||
    text.includes("nasilsin")
  ) {
    return "İyiyim knk 😎 Senin için çalışmaya hazırım!";
  }

  if (
    text.includes("teşekkür") ||
    text.includes("tesekkur") ||
    text.includes("sağol") ||
    text.includes("sagol")
  ) {
    return "Rica ederim kardeşim 😎";
  }

  if (text.includes("saat kaç") || text.includes("saat kac")) {
    return "Şu an saat: " +
      new Date().toLocaleTimeString("tr-TR");
  }

  if (text.includes("tarih")) {
    return "Bugünün tarihi: " +
      new Date().toLocaleDateString("tr-TR");
  }

  // BİLİNMEYEN SORU
  return "Bunu henüz bilmiyorum knk. 🧠 Bana öğretmek için şöyle yazabilirsin:\n\nöğren: [bilgi]";
}

module.exports = {
  cevapla
};

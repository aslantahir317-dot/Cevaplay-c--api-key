const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { cevapla } = require("./ai");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const KEY_FILE = path.join(__dirname, "keys.json");

if (!fs.existsSync(KEY_FILE)) {
  fs.writeFileSync(KEY_FILE, "[]");
}

function loadKeys() {
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveKeys(keys) {
  fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
}

function checkKey(req, res, next) {
  const auth = req.headers.authorization || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const keys = loadKeys();

  if (!keys.some(k => k.key === key && k.active !== false)) {
    return res.status(401).json({
      success: false,
      error: "Geçersiz API key"
    });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({
    name: "Cevaplayıcı API",
    status: "online",
    ai: "OpenRouter"
  });
});

app.get("/site", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/v1/keys", (req, res) => {
  const key = "cvp_live_" + crypto.randomBytes(24).toString("hex");
  const keys = loadKeys();
  keys.push({
    key,
    createdAt: new Date().toISOString(),
    active: true
  });
  saveKeys(keys);
  res.json({ success: true, api_key: key });
});

app.post("/v1/chat", checkKey, async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: "message gerekli"
    });
  }

  try {
    const response = await cevapla(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error("AI hatası:", error.message);
    res.status(502).json({
      success: false,
      error: "Yapay zekâ hatası: " + (error.message || "Bilinmeyen hata")
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Cevaplayıcı API çalışıyor: port " + PORT);
});

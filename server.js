const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const { cevapla } = require("./ai");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const KEY_FILE = "./keys.json";

if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, "[]");

function loadKeys() {
  return JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
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
      error: "Gecersiz API key"
    });
  }

  next();
}

app.get("/site", (req, res) => res.sendFile(require("path").join(__dirname, "public", "index.html")));
app.get("/", (req, res) => {
  res.json({
    name: "Cevaplayici API",
    status: "online",
    ai: "Cevaplayici Kendi AI"
  });
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

  res.json({
    success: true,
    api_key: key
  });
});

app.post("/v1/chat", checkKey, (req, res) => {
  const message = req.body?.message;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: "message gerekli"
    });
  }

  const response = cevapla(String(message));

  res.json({
    success: true,
    response
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🤖 Cevaplayici Kendi AI API calisiyor!");
  console.log("🌐 http://127.0.0.1:" + PORT);
});

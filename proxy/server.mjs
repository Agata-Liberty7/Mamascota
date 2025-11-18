import { createRequire } from "module";
const require = createRequire(import.meta.url);

import os from "os";

import express from "express";
const cors = require("cors");
import "dotenv/config";

import { processMessage } from "./mamascota-agent.mjs";
import { loadKnowledgeBase } from "./utils/knowledgeBase-loader.mjs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 🧠 Тестовая проверка YAML при старте
(async () => {
  console.log("🧠 Тест: пробую загрузить YAML при старте прокси...");
  const kb = await loadKnowledgeBase();
  console.log("✅ Тестовая загрузка YAML завершена, найдено:", kb?.length || 0);
})();

// 🧠 Глобальное хранилище диалоговой памяти (RAM)
const conversationMemory = {};
// Формат: { [conversationId]: [{ role: "user"|"assistant"|"system", content: string }] }

app.post("/agent", async (req, res) => {
  try {
    // 🔹 1. Читаем данные из тела запроса
    const { message = "", pet = {}, symptomKeys = [], userLang } = req.body || {};

    // 🔹 2. Проверяем наличие питомца
    if (!pet?.species) {
      return res.status(400).json({ ok: false, error: "Нет данных о питомце" });
    }

    // 🔹 3. Определяем язык (userLang → pet.lang → .env → en)
    const lang = userLang || pet?.lang || process.env.DEFAULT_LANG || "en";

    console.log("📨 Запрос получен:", { message, pet, symptomKeys, lang });

    // 🧵 conversationId: если не пришёл от клиента — создаём новый
    const conversationId = req.body.conversationId || Date.now().toString();
    console.log("🧵 ID диалога:", conversationId);

    // 🧩 Инициализация истории, если нет
    if (!conversationMemory[conversationId]) {
      conversationMemory[conversationId] = [];
    }

    // Добавляем текущее сообщение пользователя в историю
    conversationMemory[conversationId].push({
      role: "user",
      content: message,
    });

    // 🔹 4. Передаём язык и историю в процессинг
    const reply = await processMessage(
      message,
      pet,
      symptomKeys,
      lang,
      conversationId,
      conversationMemory[conversationId] // история диалога
    );

    console.log("📤 Ответ сформирован:", reply);

    // 💬 Сохраняем ответ агента в историю
    if (reply?.reply) {
      conversationMemory[conversationId].push({
        role: "assistant",
        content: reply.reply,
      });
    }

    // 🔹 5. Возвращаем ответ клиенту
    res.json(reply);
  } catch (err) {
    console.error("✖ Ошибка сервера:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const PORT = process.env.PORT || 3001;
const localIP = getLocalIP();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Прокси активен на всех интерфейсах: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Доступен по LAN: http://${localIP}:${PORT}`);
});

export default app;


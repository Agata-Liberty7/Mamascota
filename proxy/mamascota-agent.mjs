import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { buildAgentContext } from "./utils/buildAgentContext.mjs";

dotenv.config();

// ==================================================
// 🧩 Безопасная инициализация normalizePet
// ==================================================
// 🧩 Простой normalizePet — агент НЕ должен зависеть от фронта
function normalizePet(p) {
  return {
    id: p?.id || null,
    name: p?.name || "Sin nombre",
    species: p?.species || "No especificada",
    sex: p?.sex || "No indicado",
    ageYears: p?.ageYears || null,
    neutered: !!p?.neutered,
  };
}

// ==================================================
// 🤖 Настройки OpenAI
// ==================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================================================
// 📘 Загрузка системного промта (один раз)
// ==================================================
const PROMPT_PATH = path.resolve("./profiles/mamascota-familiar.md");
let SYSTEM_PROMPT = "";

try {
  SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, "utf8");
  console.log(`✅ [PROMPT] Загружен (${SYSTEM_PROMPT.length} символов)`);
} catch (err) {
  console.error("❌ [PROMPT] Ошибка при загрузке промта:", err.message);
}

// ==================================================
// 🧠 Основная функция обработки сообщений
// ==================================================
export async function processMessage(
  message,
  pet,
  symptomKeys = [],
  userLang = "en",
  conversationId = "default",
  conversationHistory = []
) {
  console.log("💬 Новое сообщение:", message);
  console.log("🐾 Данные питомца:", pet);
  console.log("🧵 ID диалога:", conversationId);

  try {
    // 🔹 Нормализуем данные питомца
    const petData = normalizePet(pet);

    // ==================================================
    // 🧩 Оптимизированная загрузка контекста
    // ==================================================
    // buildAgentContext вызываем только при первом сообщении
    let fullContext = "";

    if (conversationHistory.length <= 1) {
      fullContext = await buildAgentContext(petData, symptomKeys, userLang);
      console.log("🧩 Контекст агента получен:", fullContext ? "OK" : "EMPTY");
    } else {
      console.log("🔁 Контекст уже сформирован ранее, пропускаем повторную загрузку YAML");
    }

    // 🔹 Формируем краткое резюме пациента для GPT
    let petSummary = "";
    try {
      if (fullContext) {
        const parsed = JSON.parse(fullContext);
        if (parsed?.pet) {
          const p = parsed.pet;
          petSummary = `
Данные пациента:
- Имя: ${p.name || "не указано"}
- Вид: ${p.species || "не указан"}
- Возраст: ${p.ageYears ?? "нет данных"} лет
- Стерилизован: ${p.neutered ? "да" : "нет"}
`;
        }
      }
    } catch (err) {
      console.warn("⚠️ Не удалось распарсить контекст для резюме питомца:", err);
    }

    // ==================================================
    // 🧠 Формирование истории для OpenAI
    // ==================================================
    const messages = [];

    // Добавляем системное сообщение (с краткостью)
    messages.push({
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n[Инструкция]: Отвечай кратко, ясно, по существу. Не ставь диагнозов.`,
    });

    // Если есть новый контекст (первое сообщение) — добавляем его
    if (fullContext) {
      messages.push({
        role: "user",
        content: `${fullContext}\n\n🌐 El idioma del usuario es: ${userLang}. Por favor, responde en este idioma.`,
      });
    }

    // Добавляем всю историю сообщений (если есть)
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Добавляем текущее сообщение пользователя (если ещё не добавлено)
    if (!conversationHistory.some((m) => m.content === message)) {
      messages.push({
        role: "user",
        content: message,
      });
    }

    // ==================================================
    // 🤖 GPT: создаём ответ
    // ==================================================
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "Извини, не удалось получить ответ от агента.";
    console.log("✅ Ответ агента:", reply);

    return { ok: true, reply, conversationId };
  } catch (error) {
    console.error("❌ Ошибка в processMessage:", error.message);
    return {
      ok: false,
      error: "Ошибка при обработке сообщения GPT.",
      details: error.message,
    };
  }
}

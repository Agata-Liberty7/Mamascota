import { loadKnowledgeBase } from "./knowledgeBase-loader.mjs";
import petsMod from "../../utils/pets.ts";

// 🧠 Кэш базы знаний (загружается один раз за сессию)
let cachedKnowledgeBase = null;

// безопасная инициализация normalizePet
const normalizePet =
  typeof petsMod?.normalizePet === "function"
    ? petsMod.normalizePet
    : petsMod?.default?.normalizePet ||
      ((p) => ({
        ...p,
        name: p?.name || "Sin nombre",
        species: p?.species || "No especificada",
      }));

// 🧩 Основная функция формирования контекста
export async function buildAgentContext(
  pet = {},
  symptomKeys = [],
  userLang,
  nivelFilter = "familiar" // ← добавлен параметр уровня
) {
  try {
    // 🔹 Унифицированная логика выбора языка
    const lang =
      userLang ||
      pet?.lang ||
      process.env.DEFAULT_LANG ||
      "en";

    console.log("🟢 [1] buildAgentContext запущен");
    console.log("🐾 Питомец:", pet?.name || "undefined", "| Язык:", lang);

    // 🔹 Нормализация данных питомца
    const petData = normalizePet(pet);
    console.log("🟢 [2] normalizePet завершён:", petData);

    // 🔹 Загрузка YAML-базы (с кэшем)
    let knowledgeBase;
    if (!cachedKnowledgeBase) {
      cachedKnowledgeBase = await loadKnowledgeBase();
      console.log(
        "🟢 [3] База знаний загружена впервые:",
        cachedKnowledgeBase?.length,
        "алгоритмов"
      );
    } else {
      console.log(
        "🟢 [3] Используется кэшированная база знаний:",
        cachedKnowledgeBase?.length,
        "алгоритмов"
      );
    }
    knowledgeBase = cachedKnowledgeBase;

    // 🔹 Фильтрация по nivelUsuario (по умолчанию только familiar)
    const filteredKB = Array.isArray(knowledgeBase)
      ? knowledgeBase.filter((alg) => {
          const nivel = alg?.nivelUsuario?.toLowerCase?.() || "";
          if (!nivel) return false;
          if (nivelFilter === "all") return true;
          return nivel === nivelFilter.toLowerCase();
        })
      : [];

    console.log(
      `🧩 [3a] Отфильтровано по nivelUsuario="${nivelFilter}":`,
      filteredKB.length
    );

    // 🔹 Подготовка языкового обозначения
    const langText =
      {
        es: "Español",
        en: "English",
        ru: "Русский",
        he: "עברית",
        de: "Deutsch",
        fr: "Français",
        it: "Italiano",
      }[lang] || lang;

    // 🔹 Формирование текстового контекста
    const symptomText = symptomKeys.length
      ? `Síntomas reportados: ${symptomKeys.join(", ")}.`
      : "No se han indicado síntomas específicos.";

    const context = `
🧩 Contexto clínico del paciente:
Nombre: ${petData.name || "Desconocido"}
Especie: ${petData.species || "No especificada"}
Sexo: ${petData.sex || "No indicado"}
Edad: ${petData.ageYears || "Sin datos"} años
Esterilizado: ${petData.neutered ? "Sí" : "No"}

🌐 Idioma del usuario: ${langText}
${symptomText}
    `.trim();

    console.log("📘 [4] Contexto для GPT сформирован:\n", context);

    // 🔹 Возврат финального контекста
    return JSON.stringify({
      pet: petData,
      userLang: lang,
      symptomKeys,
      nivelUsuario: nivelFilter,
      knowledgeBase: filteredKB,
      context,
    });
  } catch (error) {
    console.error("❌ Ошибка buildAgentContext:", error);
    return JSON.stringify({
      error: "Error al generar el contexto clínico.",
      details: error.message,
    });
  }
}

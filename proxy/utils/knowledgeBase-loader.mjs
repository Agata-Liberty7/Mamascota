// proxy/utils/knowledgeBase-loader.mjs
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

console.log("🟢 knowledgeBase-loader.mjs загружен");

export async function loadKnowledgeBase() {
  const target = path.resolve(__dirname, "../../utils/knowledgeBase.ts");
  console.log("🧩 Пытаюсь импортировать:", target);

  try {
    let tsx;
    try {
      tsx = require("tsx/cjs/api"); // новый API
      if (tsx.create) tsx = tsx.create({});
      console.log("⚙ Используется новый API tsx");
    } catch {
      tsx = require("tsx"); // fallback
      console.log("⚙ Используется fallback API tsx");
    }

    const mod =
      tsx.import?.(target) ||
      (await import(target)); // универсальный вызов

    if (!mod || !mod.loadKnowledgeBase) {
      throw new Error("Модуль не экспортирует loadKnowledgeBase()");
    }

    console.log("✅ Модуль knowledgeBase.ts импортирован успешно");
    const result = await mod.loadKnowledgeBase();
    console.log(
      "📘 YAML algorithms loaded OK:",
      Array.isArray(result) ? result.length : "unknown"
    );
    return result;
  } catch (err) {
    console.error("❌ Ошибка при загрузке knowledgeBase.ts:", err);
    return [];
  }
}

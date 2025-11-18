// utils/knowledgeBase.ts
// Универсальная загрузка YAML для Mamascota: не зависит от структуры файлов.
// Возвращает массив датасетов (по одному массиву алгоритмов на каждый YAML-файл).
//@ts-ignore 
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// —————— утилиты ——————

/** эвристика "это именно алгоритм", а не шаг/ветка */
function isAlgorithmNode(node: any): boolean {
  if (!node || typeof node !== "object") return false;

  // 1) id должен быть строкой (не числом) и содержать буквы/подчёркивания
  const id = node.id;
  const idLooksLikeAlgo =
    typeof id === "string" && /[A-Za-z_А-Яа-я]/.test(id);

  if (!idLooksLikeAlgo) return false;

  // 2) рядом обычно есть признаки верхнего уровня
  const hasSchema = Array.isArray(node.esquema);
  const hasAnyAlgoFields =
    "nombre" in node ||
    "pagina" in node ||
    "tipoSintoma" in node ||
    "nivelUsuario" in node ||
    "especie" in node;

  return hasSchema || hasAnyAlgoFields;
}

/** рекурсивно собрать все алгоритмы в произвольной структуре */
function collectAlgorithms(root: any): any[] {
  const found: any[] = [];

  const walk = (obj: any) => {
    if (Array.isArray(obj)) {
      for (const it of obj) walk(it);
      return;
    }
    if (!obj || typeof obj !== "object") return;

    if (isAlgorithmNode(obj)) {
      found.push(obj);
      // не выходим: иногда внутри алгоритма есть вложенные алгоритмы
    }

    for (const key of Object.keys(obj)) {
      walk((obj as any)[key]);
    }
  };

  walk(root);
  return found;
}

// —————— основной загрузчик ——————

export async function loadKnowledgeBase(): Promise<any[][]> {
  // путь стабилен независимо от cwd
  const folderPath = path.resolve(__dirname, "../assets/algoritmos");
  console.log("📂 Путь к YAML:", folderPath);

  if (!fs.existsSync(folderPath)) {
    console.warn("⚠ Папка с алгоритмами не найдена:", folderPath);
    return [];
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => f.toLowerCase().endsWith(".yaml"))
    .sort();

  if (!files.length) {
    console.warn("⚠ Не найдено YAML-файлов в каталоге:", folderPath);
    return [];
  }

  const datasets: any[][] = [];
  let total = 0;

  for (const file of files) {
    const full = path.join(folderPath, file);
    try {
      const text = fs.readFileSync(full, "utf8");
      if (!text.trim()) {
        console.warn(`[KB] ⚠ Пустой файл: ${file}`);
        continue;
      }

      const parsed = yaml.load(text);
      if (!parsed) {
        console.warn(`[KB] ⚠ Не удалось распарсить: ${file}`);
        continue;
      }

      const algos = collectAlgorithms(parsed);
      total += algos.length;
      datasets.push(algos);

      console.log(
        `[KB] Загружен: ${file} → алгоритмов: ${algos.length}`
      );
    } catch (e: any) {
      console.error(`[KB] ❌ Ошибка чтения ${file}:`, e?.message || e);
    }
  }

  console.log(`📘 YAML algorithms loaded OK (total): ${total}`);
  return datasets;
}

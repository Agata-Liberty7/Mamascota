import fs from "fs";
import yaml from "js-yaml";
import path from "path";

let ALGORITHMS = [];

function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walkDir(full));
    else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) results.push(full);
  }
  return results;
}

export async function loadAlgorithms(rootDir) {
  ALGORITHMS = [];
  try {
    const files = walkDir(rootDir);
    console.log("🧩 YAML loader: найдено файлов:", files.length);
    files.forEach(f => console.log("→", f));

    for (const file of files) {
      const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
      const docs = yaml.loadAll(raw).filter(Boolean);

      for (const d of docs) {
        if (!d) continue;

        // Если массив — добавляем все элементы
        if (Array.isArray(d)) ALGORITHMS.push(...d);
        // Если структура с ключом "algoritmos" — достаём содержимое
        else if (d.algoritmos && Array.isArray(d.algoritmos)) ALGORITHMS.push(...d.algoritmos);
        // Если одиночный алгоритм
        else if (d.algoritmo && typeof d.algoritmo === "object") ALGORITHMS.push(d.algoritmo);
        // Если это объект с числовыми ключами
        else if (Object.keys(d).every(k => !isNaN(Number(k)))) ALGORITHMS.push(...Object.values(d));
        // Иначе просто добавляем объект
        else if (typeof d === "object") ALGORITHMS.push(d);
      }
    }

    console.log("📖 Всего считано элементов (до фильтрации):", ALGORITHMS.length);

    ALGORITHMS = ALGORITHMS.filter(a => a && a.id && a.nombre);
    console.log("✅ После фильтрации:", ALGORITHMS.length);
  } catch (err) {
    console.error("❌ Ошибка при загрузке YAML:", err.message);
  }
}

export function getAlgPool() {
  return ALGORITHMS;
}

export function getAlgCount() {
  return ALGORITHMS.length;
}

// i18n.ts (минимальный апдейт)
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import he from "./locales/he.json";
import it from "./locales/it.json";
import ru from "./locales/ru.json";

const i18n = new I18n({ de, en, es, fr, he, it, ru });
i18n.enableFallback = true;

const SUPPORTED = ["de","en","es","fr","he","it","ru"] as const;
type Lang = (typeof SUPPORTED)[number];

const KEY = "selectedLanguage";
const norm = (code?: string | null): Lang | null => {
  if (!code) return null;
  const short = code.toLowerCase().split("-")[0];
  return (SUPPORTED as readonly string[]).includes(short) ? (short as Lang) : null;
};

// 💡 старт приложения
export const initI18n = async () => {
  try {
    const saved = norm(await AsyncStorage.getItem(KEY));
    const system = norm(Localization.getLocales()?.[0]?.languageCode);
    i18n.locale = saved ?? system ?? "en";
    console.log("Language set to:", i18n.locale);
  } catch (e) {
    console.warn("Error loading language:", e);
    i18n.locale = "en";
  }
};

// 🔁 вызов из Settings / меню
export const setLanguage = async (lang: string) => {
  const resolved = norm(lang) ?? "en";
  i18n.locale = resolved;
  await AsyncStorage.setItem(KEY, resolved);
  return resolved;
};

export default i18n;

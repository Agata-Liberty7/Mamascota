// utils/chatWithGPT.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type ChatMessage from "../app/chat"; // если тип есть в chat.tsx
import { router } from 'expo-router';
import { showExitConfirmation } from './showExitConfirmation';

// Тип ответа, который ожидает чат и другие вызовы
export type ChatResult = { ok: boolean; reply?: string; error?: string };

// Универсальный URL агента: сначала берём точный /agent, иначе собираем из API_URL
const AGENT_URL =
  process.env.EXPO_PUBLIC_PROXY_URL ||
  (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}/agent` : '');
/**
 * Унифицированный метод получения активного питомца:
 * 1) новая модель (pets:list + pets:activeId)
 * 2) fallback к старым ключам
 */
async function getUnifiedActivePet(): Promise<any | null> {
  // ---- 1. Новая модель ----
  const petsListRaw = await AsyncStorage.getItem("pets:list");
  const activeId = await AsyncStorage.getItem("pets:activeId");

  if (petsListRaw && activeId) {
    try {
      const pets = JSON.parse(petsListRaw);
      const found = pets.find((p: any) => p.id === activeId);
      if (found) return found;
    } catch (e) {
      console.warn("Ошибка чтения новой модели питомцев", e);
    }
  }

  // ---- 2. Старые ключи (fallback) ----
  const [
    petsLegacyRaw,
    selectedPetRaw,
    oldActiveId,
    currentPetId,
    animalProfileRaw,
  ] = await Promise.all([
    AsyncStorage.getItem("pets"),
    AsyncStorage.getItem("selectedPet"),
    AsyncStorage.getItem("activePetId"),
    AsyncStorage.getItem("currentPetId"),
    AsyncStorage.getItem("animalProfile"),
  ]);

  // 2.1 — selectedPet
  if (selectedPetRaw) {
    try {
      return JSON.parse(selectedPetRaw);
    } catch {}
  }

  // 2.2 — pets
  if (petsLegacyRaw) {
    try {
      const list = JSON.parse(petsLegacyRaw);
      const id = oldActiveId || currentPetId;
      if (id) {
        const found = list.find((p: any) => p.id === id);
        if (found) return found;
      }
      if (list.length > 0) return list[0];
    } catch {}
  }

  // 2.3 — animalProfile
  if (animalProfileRaw) {
    try {
      return JSON.parse(animalProfileRaw);
    } catch {}
  }

  return null;
}

// --------------------------------------------------
// 📤 Вызов агента
// --------------------------------------------------
export async function chatWithGPT(params: {
  message: string;
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
}): Promise<ChatResult> {
  const { message, pet, symptomKeys, userLang } = params || {};
  // 🐾 Если pet не пришёл из UI — берём из единой модели
  const ensuredPet = pet ?? (await getUnifiedActivePet());


  if (!AGENT_URL) {
    console.error('❌ AGENT_URL не задан. Проверь .env (EXPO_PUBLIC_PROXY_URL / EXPO_PUBLIC_API_URL).');
    return { ok: false, error: 'Не настроен адрес прокси-агента' };
  }

  try {
    const existingId = await AsyncStorage.getItem('conversationId');

    const body = {
      message: message ?? '',
      pet: ensuredPet ?? undefined,
      symptomKeys: symptomKeys ?? undefined,
      userLang: userLang ?? (await AsyncStorage.getItem('selectedLanguage')) ?? undefined,
      conversationId: existingId ?? undefined,
    };

    // Отладка входных параметров
    console.log('🐾 Питомец из параметров:', safeLogPet(body.pet));
    console.log('🗝️ symptomKeys:', Array.isArray(body.symptomKeys) ? body.symptomKeys : []);
    console.log('🗣️ userLang:', body.userLang || '(не задан)');

    const res = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      console.error('❌ Не удалось распарсить JSON ответа агента:', e);
      return { ok: false, error: 'Неверный формат ответа агента' };
    }

    if (data?.conversationId && typeof data.conversationId === 'string') {
      await setConversationId(data.conversationId);
    }

    if (res.ok && data?.ok) {
      if (typeof data.reply === "string") {
        // 💾 Сохраняем историю чата
        try {
          const conversationId = data?.conversationId || existingId;
          if (conversationId) {
            const prev = (await AsyncStorage.getItem(`chatHistory:${conversationId}`)) || "[]";
            const chatHistory = JSON.parse(prev);

            // формируем новое сообщение
            const userMsg = message?.trim()
              ? { role: "user", content: message.trim() }
              : null;
            const assistantMsg = { role: "assistant", content: data.reply };

            // обновляем историю
            const updated = [
              ...chatHistory,
              ...(userMsg ? [userMsg] : []),
              assistantMsg,
            ];

            await AsyncStorage.setItem(
              `chatHistory:${conversationId}`,
              JSON.stringify(updated)
            );
            console.log("💾 История чата сохранена:", updated.length, "сообщений");
          }
        } catch (err) {
          console.warn("⚠️ Не удалось сохранить историю чата:", err);
        }

        return { ok: true, reply: data.reply };
      }
      return { ok: false, error: "Неверный формат поля reply" };
    }


    const errMsg = typeof data?.error === 'string' ? data.error : `Ошибка агента (HTTP ${res.status})`;
    console.error('❌ Ошибка при обращении к агенту:', errMsg);
    return { ok: false, error: errMsg };
  } catch (err) {
    console.error('❌ Сбой при вызове агента:', err);
    return { ok: false, error: 'Ошибка соединения с агентом' };
  }
}

function safeLogPet(pet: any) {
  if (!pet || typeof pet !== 'object') return pet;
  const { id, name, species, sex, ageYears, neutered } = pet as any;
  return { id, name, species, sex, ageYears, neutered };
}

// --------------------------------------------------
// 💾 Работа с conversationId
// --------------------------------------------------
export async function clearConversationId(): Promise<void> {
  await AsyncStorage.removeItem('conversationId');
  console.log('🧹 conversationId удалён.');
}

export async function setConversationId(id: string): Promise<void> {
  await AsyncStorage.setItem('conversationId', id);
  console.log('💬 Установлен conversationId:', id);
}

export async function getConversationId(): Promise<string | null> {
  return AsyncStorage.getItem('conversationId');
}

// --------------------------------------------------
// 🐾 Получение активного питомца с учётом приоритетов
// --------------------------------------------------
async function getActivePetSmart(): Promise<any | null> {
  try {
    // 📦 читаем все возможные ключи, старые и новые
    const [
      petsRaw,
      activeId,
      currentId,
      selectedPetRaw,
    ] = await Promise.all([
      AsyncStorage.getItem('pets'),
      AsyncStorage.getItem('activePetId'),
      AsyncStorage.getItem('currentPetId'),
      AsyncStorage.getItem('selectedPet'),
    ]);

    const pets = petsRaw ? JSON.parse(petsRaw) : [];
    const selectedPet = selectedPetRaw ? JSON.parse(selectedPetRaw) : null;

    console.log('🐾 activePetId:', activeId);
    console.log('🐾 currentPetId:', currentId);

    if (!Array.isArray(pets) || pets.length === 0) {
      console.log('⚠️ Список pets пуст, проверяем selectedPet…');
      if (selectedPet?.name) {
        console.log('🐾 Используем selectedPet:', selectedPet.name);
        return selectedPet;
      }
      return null;
    }

    // 1️⃣ питомец с default:true
    const byDefault = pets.find((p: any) => p?.default === true);
    if (byDefault) {
      console.log('🐾 Active by default:', byDefault.name);
      return byDefault;
    }

    // 2️⃣ питомец с activePetId
    if (activeId) {
      const byActive = pets.find((p: any) => p?.id === activeId);
      if (byActive) {
        console.log('🐾 Active by activePetId:', byActive.name);
        return byActive;
      }
    }

    // 3️⃣ питомец с currentPetId (старый ключ)
    if (currentId) {
      const byCurrent = pets.find((p: any) => p?.id === currentId);
      if (byCurrent) {
        console.log('🐾 Active by currentPetId:', byCurrent.name);
        return byCurrent;
      }
    }

    // 4️⃣ fallback: первый питомец в списке
    console.log('🐾 Active fallback:', pets[0]?.name);
    return pets[0] ?? null;
  } catch (e) {
    console.warn('⚠️ Ошибка при определении активного питомца:', e);
    return null;
  }
}

// ==================================================
// 💬 Выход: сохранить / удалить / отменить
// ==================================================
export async function handleExitAction(
  petName?: string,
  lastUserMessage?: string
): Promise<void> {
  const choice = await showExitConfirmation();
  console.log('📤 Выбор при выходе:', choice);

  if (choice === "save") {
    const id = await getConversationId();
    if (!id) {
      console.warn("⚠️ Нет active conversationId — сохранять нечего.");
      return;
    }

    // 🐾 Новый единый способ получения питомца
    const activePet = await getUnifiedActivePet();
    console.log("🐾 Активный питомец при сохранении:", activePet?.name);

    // 🩺 читаем симптомы
    const symptomsRaw =
      (await AsyncStorage.getItem("selectedSymptoms")) ??
      (await AsyncStorage.getItem("symptomKeys")) ??
      (await AsyncStorage.getItem("symptoms"));
    const symptomKeys: string[] = symptomsRaw ? JSON.parse(symptomsRaw) : [];

    // 💾 запись для истории
    const record = {
      id,
      date: new Date().toISOString(),
      petName: (activePet?.name?.trim() || "Без имени"),
      context: (lastUserMessage || "").slice(0, 120) || "Без описания",
      symptomKeys,
    };

    try {
      const stored = (await AsyncStorage.getItem("chatSummary")) || "[]";
      const parsed = JSON.parse(stored);
      parsed.unshift(record);
      await AsyncStorage.setItem("chatSummary", JSON.stringify(parsed));
      console.log("💾 Сессия сохранена:", record);
    } catch (e) {
      console.error("❌ Не удалось сохранить chatSummary:", e);
    }
  }


  if (choice === 'delete') {
    await clearConversationId();
    console.log('🗑️ Сессия удалена, при следующем сообщении начнётся новая.');
  }

  if (choice === 'cancel') {
    console.log('🚫 Действие отменено пользователем, остаёмся на текущем экране.');
    return;
  }

  try {
    router.replace('/');
    console.log('↩️ Возврат на главный экран после выхода');
  } catch (err) {
    console.warn('⚠️ Не удалось выполнить возврат на главный экран:', err);
  }
}

// --------------------------------------------------
// ♻️ Восстановление сохранённой сессии (по выбору из Summary)
// --------------------------------------------------
export async function restoreSession(id: string): Promise<void> {
  await setConversationId(id);
  console.log('♻️ Восстановлена сессия с ID:', id);
}

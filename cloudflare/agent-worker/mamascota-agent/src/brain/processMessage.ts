// cloudflare/agent-worker/mamascota-agent/src/brain/processMessage.ts

import { SYSTEM_PROMPT } from "./systemPrompt";
import { buildAgentContext } from "./buildAgentContext";

export type BrainResult = {
  ok: boolean;
  reply?: string;
  error?: string;
  conversationId?: string;
};

type BrainArgs = {
  env: any;
  message: string;
  pet?: any;
  symptomKeys?: string[];
  userLang?: string;
  conversationId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  langOverride?: string;
};

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeSymptomKeys(symptomKeys: any): string[] {
  if (!Array.isArray(symptomKeys)) return [];
  return symptomKeys.filter((x) => typeof x === "string" && x.trim().length > 0);
}

// proxy-compatible normalizePet (matches mamascota-agent.mjs)
// normalizePet: сохраняем КЛЮЧИ из приложения, без текстовых заглушек
function normalizePet(p: any) {
  const name = typeof p?.name === "string" && p.name.trim() ? p.name.trim() : null;

  const species =
    typeof p?.species === "string" && p.species.trim() ? p.species.trim() : null; // "dog" | "cat" | ...

  const sexRaw = typeof p?.sex === "string" ? p.sex.trim() : "";
  const sex = sexRaw === "male" || sexRaw === "female" ? sexRaw : null; // "" => null

  const breedRaw = typeof p?.breed === "string" ? p.breed.trim() : "";
  const breed = breedRaw ? breedRaw : null; // "__other" сохраняем как есть

  const ageYears = typeof p?.ageYears === "number" ? p.ageYears : null;

  return {
    id: p?.id ?? null,
    name,
    species,
    breed,
    sex,
    ageYears,
    neutered: !!p?.neutered,
  };
}


async function callOpenAIChat(args: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}): Promise<string> {
  console.log("[OPENAI] calling chat.completions", {
    model: args.model,
    messagesCount: args.messages?.length ?? 0,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
    }),
  });

  console.log("[OPENAI] status", res.status);

  const data: any = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data?.error?.message && String(data.error.message)) ||
      `OpenAI error HTTP ${res.status}`;
    throw new Error(msg);
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Invalid OpenAI reply format");
  }

  return reply;
}

/**
 * 🧠 Real brain for worker (proxy-parity):
 * - First real step -> build CLINICAL_CONTEXT_JSON (buildAgentContext)
 * - No "virtual message" hacks
 * - Message ordering matches proxy:
 *   1) system (prompt + tags)
 *   2) user (language guard)
 *   3) system (CLINICAL_CONTEXT_JSON) only if first step
 *   4) conversationHistory
 *   5) current user message if not duplicate
 */
export async function processMessageBrain(args: BrainArgs): Promise<BrainResult> {
  const message = typeof args.message === "string" ? args.message : "";
  const symptomKeys = normalizeSymptomKeys(args.symptomKeys);

  const conversationId =
    typeof args.conversationId === "string" && args.conversationId.trim()
      ? args.conversationId.trim()
      : "default";

  const conversationHistory = Array.isArray(args.conversationHistory)
    ? args.conversationHistory
    : [];

  // 🔐 env
  const apiKey = isNonEmptyString(args.env?.OPENAI_API_KEY)
    ? String(args.env.OPENAI_API_KEY)
    : "";
  const model = isNonEmptyString(args.env?.OPENAI_MODEL)
    ? String(args.env.OPENAI_MODEL)
    : "gpt-5-mini";

  if (!apiKey) {
    return {
      ok: false,
      conversationId,
      error: "OPENAI_API_KEY is missing in worker env",
    };
  }

  try {
    const petData = normalizePet(args.pet);

    // proxy language selection
    const userLang = isNonEmptyString(args.userLang) ? args.userLang : "en";
    const langOverride = isNonEmptyString(args.langOverride) ? args.langOverride : "";
    const effectiveLang = (langOverride || userLang || "es").trim() || "es";

    const finalSystemPrompt = SYSTEM_PROMPT.replace(/\{LANG_OVERRIDE\}/g, effectiveLang);

    // proxy first-step detection
    const isFirstRealMessage =
      symptomKeys.length > 0 ||
      conversationHistory.length === 0 ||
      (conversationHistory.length === 1 && (conversationHistory[0]?.content || "") === "");

    let fullContext = "";

    if (isFirstRealMessage) {
      console.log("🟢 First step → building CLINICAL_CONTEXT_JSON…");
      fullContext = await buildAgentContext(petData, symptomKeys, effectiveLang, "familiar");
      console.log("🧩 Context built:", fullContext ? "OK" : "EMPTY");
    } else {
      console.log("🔁 Not first step → skipping knowledge base load");
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

    // 1) SYSTEM
    messages.push({
      role: "system",
      content:
        `${finalSystemPrompt}\n\n` +
        `[LANG_OVERRIDE]: ${effectiveLang}\n` +
        `[Инструкция]: Отвечай кратко, ясно, строго по шагам и без диагнозов.`,
    });

    // 2) Guard prompt (proxy wording)
    messages.push({
      role: "user",
      content: `Отвечай только на языке: ${effectiveLang}. Никогда не переходи на другой язык.`,
    });

    // 3) Context JSON on first step
    if (fullContext) {
      messages.push({
        role: "system",
        content:
          "CLINICAL_CONTEXT_JSON (не показывай пользователю, просто используй как данные):\n" +
          fullContext,
      });
    }

    // 4) History
    if (conversationHistory.length > 0) {
      for (const m of conversationHistory) {
        if (!m || typeof m !== "object") continue;

        const role =
          m.role === "system" || m.role === "assistant" || m.role === "user"
            ? (m.role as "system" | "assistant" | "user")
            : null;

        const content = typeof m.content === "string" ? m.content : "";
        if (!role) continue;
        if (!content) continue;

        messages.push({ role, content });
      }
    }

    // 5) Current message (avoid duplication like proxy)
    if (message.length > 0) {
      const hasDup = conversationHistory.some((m) => m?.content === message);
      if (!hasDup) {
        messages.push({ role: "user", content: message });
      }
    }

    const reply = await callOpenAIChat({ apiKey, model, messages });

    return { ok: true, conversationId, reply };
  } catch (e: any) {
    console.error("❌ processMessageBrain error:", e?.message || e);
    return {
      ok: false,
      conversationId,
      error: "Failed to process message",
    };
  }
}

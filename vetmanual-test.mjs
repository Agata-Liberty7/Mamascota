/**
 * vetmanual-test.mjs
 * Тест прямого вызова кастомного агента VetManual через Agent SDK
 */

import OpenAI from "openai";
import dotenv from "dotenv";
import { buildAgentContext } from "./proxy/buildAgentContext.mjs";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testVetManualAgent() {
  console.log("🚀 Проверка вызова кастомного агента VetManual через SDK...\n");

  // Примерные данные питомца
  const pet = {
    name: "Луна",
    species: "gato",
    sex: "hembra",
    ageYears: 4,
    neutered: true,
  };

  const symptomKeys = ["vómito", "apatía"];
  const userLang = "es";

  // Формируем контекст с твоей функцией buildAgentContext
  const context = await buildAgentContext(pet, symptomKeys, userLang);

  try {
    // 🔹 Вызов кастомного агента VetManual
    const response = await client.agents.chat({
      agent_id: "agent_VetManual", // ⚠️ сюда нужно будет вставить настоящий ID
      input: [
        {
          role: "user",
          content: `Contexto clínico:\n${context}`,
        },
      ],
    });

    console.log("✅ Ответ от VetManual:");
    console.log(response.output_text || JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("❌ Ошибка при обращении к VetManual:");
    console.error(error.message);
  }
}

testVetManualAgent();

import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Полная очистка всех данных приложения.
 * Удаляет все ключи, кроме системных от Expo.
 * Вызывает безопасную перезагрузку состояния.
 */
export const clearAllAppData = async () => {
  try {
    // 1. Собираем все наши ключи
    const keys = await AsyncStorage.getAllKeys();

    // 2. Фильтруем, чтобы случайно не удалить системные ключи Expo
    const toDelete = keys.filter((key) =>
      [
        "petsList",
        "activePetId",
        "selectedLanguage",
        "onboardingSeen",
        "hasSeenLanguageNotice",
        "sessionSaved",
        "chatSummary",
        "conversationId",
        "symptomKeys",
        "selectedSymptoms",
        "symptoms",
        "chatHistory",
        "animalProfile",
        "currentPetId",
      ].includes(key)
    );

    await AsyncStorage.multiRemove(toDelete);

    console.log("🧹 Полная очистка завершена:", toDelete);
  } catch (error) {
    console.error("Ошибка очистки данных приложения:", error);
  }
};

import { TouchableOpacity, Text } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { handleExitAction } from "@/utils/chatWithGPT";
import i18n from "@/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LocalizedExitButton() {
  const [_, setState] = useState(0);

  useEffect(() => {
    const check = setInterval(() => {
      // если язык изменился, обновляем компонент
      setState((prev) => prev + 1);
    }, 500);
    return () => clearInterval(check);
  }, [i18n.locale]);

  return (
    <TouchableOpacity
      onPress={async () => {
        const petRaw = await AsyncStorage.getItem("pet");
        const pet = petRaw ? JSON.parse(petRaw) : null;
        const petName = pet?.name || "Без имени";

        const choice = (await handleExitAction(petName)) ?? "cancel";


        if (choice !== "cancel") {
          router.replace("/"); // переход на главный экран
        } else {
          console.log("🚫 Отмена: остаёмся на текущем экране (без перехода)");
        }
      }}
    >
      <Text style={{ color: "#42A5F5", fontSize: 16, marginRight: 16 }}>
        {i18n.t("exit_button")}
      </Text>
    </TouchableOpacity>
  );
}
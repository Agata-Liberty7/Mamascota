import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";

export async function showExitConfirmation(): Promise<string> {
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t("exit_title"),
      i18n.t("exit_message"),
      [
        {
          text: i18n.t("cancel"),
          style: "cancel",
          onPress: () => resolve("cancel"),
        },
        {
          text: i18n.t("exit_delete"),
          style: "destructive",
          onPress: () => {
            const lang = i18n.locale;
            const delay = Platform.OS === "android" ? 100 : 0;
            setTimeout(async () => {
              try {
                await AsyncStorage.removeItem("conversationId");
                console.log("🗑️ Сессия удалена (через Alert)");
              } catch (e) {
                console.error("Ошибка при удалении:", e);
              }
              resolve("delete");
            }, delay);
          },
        },
        {
          text: i18n.t("exit_save"),
          onPress: () => resolve("save"),
        },
      ],
      { cancelable: true }
    );
  });
}

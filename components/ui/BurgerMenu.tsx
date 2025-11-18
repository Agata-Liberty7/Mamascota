import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { Alert } from "react-native";

import i18n from "../../i18n";
import eventBus from "../../utils/eventBus";
import { handleExitAction } from "../../utils/chatWithGPT"; // ✅ заменили showExitConfirmation

const screenWidth = Dimensions.get("window").width;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BurgerMenu({ visible, onClose }: Props) {
  const router = useRouter();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [animalProfile, setAnimalProfile] = useState(false);
  const [hasChatSession, setHasChatSession] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      console.log("🔥 checkAccess called");
      const terms = await AsyncStorage.getItem("termsAccepted");
      const profile = await AsyncStorage.getItem("animalProfile");
      const chatSession = await AsyncStorage.getItem("lastChatSessionExists");
      console.log("✅ ChatSession from storage:", chatSession);

      setTermsAccepted(terms === "true");
      setAnimalProfile(!!profile);
      setHasChatSession(chatSession === "true");
    };

    const handleChatStart = () => {
      setHasChatSession(true);
    };

    const handleChatEnd = () => {
      setHasChatSession(false);
      AsyncStorage.removeItem("lastChatSessionExists");
      console.log("🔕 Chat session ended — меню отключено");
    };

    if (visible) checkAccess();

    // Подписка на сигналы
    eventBus.on("chatSessionStarted", handleChatStart);
    eventBus.on("chatSessionEnded", handleChatEnd);

    return () => {
      eventBus.off("chatSessionStarted", handleChatStart);
      eventBus.off("chatSessionEnded", handleChatEnd);
    };
  }, [visible]);

      const [conversationId, setConversationId] = useState<string | null>(null);

    useEffect(() => {
      const fetchConversationId = async () => {
        const storedId = await AsyncStorage.getItem("conversationId");
        setConversationId(storedId);
      };
      fetchConversationId();
    }, []);


  const menuItems = [
    {
      label: String(i18n.t("menu.about")),
      icon: "info",
      route: "/about",
      enabled: true,
    },
    {
      label: String(i18n.t("menu.settings")),
      icon: "settings",
      route: "/settings",
      enabled: termsAccepted,
    },
    {
      label: String(i18n.t("menu.animal_selection")),
      icon: "pets",
      route: "/animal-selection",
      enabled: termsAccepted,
    },
    {
      label: String(i18n.t("menu.chat")),
      icon: "chat",
      route: "/chat",
      onPress: () => {
        if (!conversationId) {
          Alert.alert(i18n.t("no_active_chat_title"), i18n.t("no_active_chat_message"));
          return;
        }
        onClose();
        setTimeout(() => router.replace("/chat"), 200);
      },
      enabled: !!conversationId, // активен, только если есть conversationId
    },

    {
      label: String(i18n.t("menu.summary")),
      icon: "list",
      route: "/summary",
      onPress: () => {
        onClose();
        setTimeout(() => router.replace("/summary"), 200);
      },
      enabled: true, // 🔥 теперь всегда активен
    },

  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animatable.View animation="fadeInUp" duration={300} style={styles.menuContainer}>
          {menuItems.map((item) => {
            const { label, icon, route, enabled } = item;

            let isEnabled = enabled;
            if (route === "/chat") {
              isEnabled = hasChatSession;
            }

            if (isEnabled) {
              return (
                <TouchableOpacity
                  key={route}
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      router.replace(route as any);
                    }, 100);
                  }}
                >
                  <MaterialIcons name={icon as any} size={22} color="#666" style={styles.icon} />
                  <Text style={styles.menuText}>{label}</Text>
                </TouchableOpacity>
              );
            } else {
              return (
                <View key={route} style={styles.menuItem}>
                  <MaterialIcons name={icon as any} size={22} color="#bbb" style={styles.icon} />
                  <Text style={styles.menuTextDisabled}>{label}</Text>
                </View>
              );
            }
          })}

          {/* Выйти */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={async () => {
              onClose();
              setTimeout(async () => {
                // 🐾 читаем актуальные данные питомца
                const petRaw = await AsyncStorage.getItem("pet");
                const pet = petRaw ? JSON.parse(petRaw) : null;
                const petName = pet?.name || "Без имени";

                await handleExitAction(petName); // теперь имя передаётся корректно
                router.replace("/");
              }, 150);
            }}
          >

            <MaterialIcons name="logout" size={22} color="#999" style={styles.icon} />
            <Text style={styles.menuText}>{i18n.t("exit_button")}</Text>
          </TouchableOpacity>

          {/* Закрыть */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={{ fontSize: 22, color: "#ccc" }}>✕</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: screenWidth * 0.8,
    alignItems: "flex-start",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    width: "100%",
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
  },
  menuTextDisabled: {
    fontSize: 16,
    color: "#bbb",
    fontWeight: "400",
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 20,
  },
});

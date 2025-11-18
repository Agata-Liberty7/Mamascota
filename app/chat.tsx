import { Ionicons } from "@expo/vector-icons";
// @ts-ignore
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";


import SymptomSelector from "../components/SymptomSelector";
import i18n from "../i18n";
import type { Pet } from "../types/pet";
import { chatWithGPT } from "../utils/chatWithGPT";
import { getActivePetId, getPets } from "../utils/pets";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ChatScreen() {
  const { pet: petParam } = useLocalSearchParams<{ pet?: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(true);
  
  // ♻️ Проверяем флаг восстановления — если пришли из Summary, пропускаем SymptomSelector
  useEffect(() => {
    (async () => {
      const restoreFlag = await AsyncStorage.getItem("restoreFromSummary");
      if (restoreFlag === "1") {
        console.log("♻️ Режим восстановления: пропускаем SymptomSelector");

        // 💬 Восстанавливаем предыдущую историю чата
        const lastConversationId = await AsyncStorage.getItem("conversationId");
        if (lastConversationId) {
          try {
            const savedChat = await AsyncStorage.getItem(`chatHistory:${lastConversationId}`);
            if (savedChat) {
              const parsed = JSON.parse(savedChat);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChat(parsed);
                setShowSelector(false);
                console.log("💬 История диалога восстановлена:", parsed.length, "сообщений");
              } else {
                console.log("⚠️ История пуста — остаёмся на выборе симптомов");
              }
            }
          } catch (err) {
            console.warn("⚠️ Ошибка при восстановлении истории:", err);
          }
        }

        // 🧹 Убираем флаг
        await AsyncStorage.removeItem("restoreFromSummary");
      }
    })();
  }, [pet]);



  const [inputHeight, setInputHeight] = useState(56);
  const flatListRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // 🐾 Загрузка питомца
  useEffect(() => {
    async function loadPet() {
      try {
        if (petParam) {
          const parsed = JSON.parse(petParam) as Pet;
          setPet(parsed);
          console.log("🐾 Питомец из параметров:", parsed);
        } else {
          const activeId = await getActivePetId();
          const allPets = await getPets();
          if (activeId && allPets.length > 0) {
            const found = allPets.find((p) => p.id === activeId) || null;
            setPet(found);
            console.log("📦 Питомец из AsyncStorage:", found);
          } else {
            console.warn("⚠️ Питомец не найден: нет активного профиля");
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки питомца:", err);
      }
    }
    loadPet();
  }, [petParam]);

  // 🧩 Обработка выбора симптомов
  const handleSymptomSubmit = async (selected: string[], customSymptom?: string) => {
    setShowSelector(false);
    setChat([]); // очищаем чат

    try {
      setLoading(true);
      const translatedSymptoms = selected.map((k) => i18n.t(`symptoms.${k}`));
      if (customSymptom) translatedSymptoms.push(customSymptom.trim());

      const allSymptoms = [...selected];
      if (customSymptom) allSymptoms.push(customSymptom.trim());

      const result = await chatWithGPT({
        message: "",
        pet: pet || undefined,
        symptomKeys: allSymptoms,
      });

      const replyText =
        typeof result === "object"
          ? result.reply || result.error || "⚠️ Ошибка при анализе"
          : String(result);

      setChat([{ role: "assistant", content: replyText }]);

    } catch (error) {
      console.error("Ошибка при запуске reasoning:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // 💬 Отправка пользовательского сообщения (GPT включается здесь)
  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = { role: "user", content: input.trim() };
    const updatedChat = [...chat, newMessage];
    setChat(updatedChat);
    setInput("");

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      setLoading(true);
      const result = await chatWithGPT({
        message: input.trim(),
        pet: pet || undefined,
      });

      const assistantText =
        typeof result === "object"
          ? result.reply || result.error || "⚠️ Нет ответа от агента"
          : String(result);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantText,
      };

      setChat([...updatedChat, assistantMessage]);
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {showSelector ? (
          <SymptomSelector onSubmit={handleSymptomSubmit} />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={chat.filter((m) => m.role !== "system")}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.message,
                    item.role === "user" ? styles.userMsg : styles.assistantMsg,
                  ]}
                >
                  <Text style={styles.msgText}>{item.content}</Text>
                </View>
              )}
              contentContainerStyle={[
                styles.messagesContainer,
                { paddingBottom: inputHeight + insets.bottom + 12 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View
              style={styles.inputArea}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={i18n.t("chat.placeholder")}
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, loading && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#42A5F5" />
                ) : (
                  <Ionicons name="arrow-up-circle" size={32} color="#42A5F5" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  messagesContainer: { padding: 12 },
  message: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMsg: {
    backgroundColor: "#E3F2FD",
    alignSelf: "flex-end",
  },
  assistantMsg: {
    backgroundColor: "#F0F0F0",
    alignSelf: "flex-start",
  },
  msgText: { fontSize: 15, color: "#333" },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f9f9f9",
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

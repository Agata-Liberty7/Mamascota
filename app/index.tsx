// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../i18n';
import { theme } from '../src/theme';
import { restoreSession, clearConversationId } from "../utils/chatWithGPT";
import LanguageNotice from "../components/ui/LanguageNotice";

export default function StartScreen() {
  const router = useRouter();

  const [sessionSaved, setSessionSaved] = useState<boolean>(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const session = await AsyncStorage.getItem('sessionSaved');
        const onboarding = await AsyncStorage.getItem('seenOnboarding');

        setSessionSaved(session === 'true');
        setOnboardingSeen(onboarding === 'true');

        setChecking(false);
      };

      init();
    }, [])
  );

const handleStart = async () => {
  const existingId = await AsyncStorage.getItem("conversationId");

  if (existingId) {
    Alert.alert(
      i18n.t("continue_title"),
      i18n.t("continue_message"),
      [
        {
          text: i18n.t("start_new"),
          style: "destructive",
          onPress: async () => {
            await clearConversationId();
            console.log("🗑️ Старая сессия очищена, начинаем заново.");
            router.replace("/onboarding");
          },
        },
        {
          text: i18n.t("continue_session"),
          onPress: async () => {
            await restoreSession(existingId);
            console.log("♻️ Восстановлена сохранённая сессия:", existingId);

            // 🧩 Проверяем, есть ли сохранённые истории
            const summaryRaw = await AsyncStorage.getItem("chatSummary");
            const summaryList = summaryRaw ? JSON.parse(summaryRaw) : [];

            if (summaryList.length > 1) {
              // Если историй несколько — ведём в Summary для выбора
              console.log("📜 Несколько сохранённых сессий → переход в Summary");
              router.replace("/summary");
            } else {
              // Если одна — ведём сразу в чат
              console.log("💬 Одна активная сессия → переход в чат");
              router.replace("/chat");
            }
          },
        },
      ],
      { cancelable: true }
    );
  } else {
    router.replace("/onboarding");
  }
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: '95%',     // тянемся по ширине экрана
    height: undefined,
    aspectRatio: 1,   // квадрат, сохраняет пропорции
    marginVertical: 24,
    // maxWidth: 480,  // (необязательно) ограничитель на больших экранах
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: theme.radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ⬇️ добавили только это
  langWrapper: {
    marginTop: theme.spacing(3), // прижато? увеличь до spacing(4) или (5)
    marginBottom: theme.spacing(1),
  },
});
  if (checking) return null;

  return (
    <>
      {/* 🔹 LanguageNotice показывается поверх всего интерфейса */}
      <LanguageNotice />

      <View style={styles.container}>
        <Text style={styles.title}>Mamascota</Text>
        <Text style={styles.subtitle}>{i18n.t('start_subtitle')}</Text>

        <Image source={theme.images.start.hero} style={styles.image} resizeMode="contain" />

        <Text style={styles.description}>{i18n.t('start_description')}</Text>

        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>{i18n.t('start_button')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );



}

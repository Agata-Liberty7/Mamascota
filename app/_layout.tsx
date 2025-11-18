// app/_layout.tsx

import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LocalizedExitButton from "../components/ui/LocalizedExitButton";
import MenuButton from "../components/ui/MenuButton";
import { UiSettingsProvider } from "../src/context/UiSettings";
import "../src/setup/textScalePatch";

import { detectAndSetInitialLanguage } from "../utils/detectLanguage";  // ⬅️ ДОБАВИЛИ

export default function AppLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await detectAndSetInitialLanguage();   // ⬅️ АВТООПРЕДЕЛЕНИЕ ЯЗЫКА
      setAppReady(true);
    };

    init();
  }, []);

  if (!appReady) return null;  // ⬅️ НЕ РЕНДЕРИМ НИЧЕГО, ПОКА ЯЗЫК НЕ УСТАНОВЛЕН

  return (
    <UiSettingsProvider>
      <SafeAreaProvider>
        <>
          <MenuButton />
          <Stack
            screenOptions={{
              title: "",
              headerBackTitle: "",
              headerBackVisible: true,
              headerBackButtonDisplayMode: "minimal",
              headerRight: () => <LocalizedExitButton />,
              animation: "fade",
              animationDuration: 200,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="animal-selection" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="summary" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="terms-screen" options={{ headerShown: false }} />
          </Stack>
        </>
      </SafeAreaProvider>
    </UiSettingsProvider>
  );
}

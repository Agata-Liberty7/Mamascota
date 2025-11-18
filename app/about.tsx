import { Feather } from "@expo/vector-icons"; // ✅ Исправленный импорт
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import i18n from "../i18n";

export default function AboutScreen() {
  const { langKey } = useLocalSearchParams();
  const normalizedLangKey = Array.isArray(langKey) ? langKey[0] : langKey ?? "default";

  const handleInstagramPress = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  return (
    <View key={normalizedLangKey} style={styles.container}>
      <Text style={styles.title}>{i18n.t("about.tagline")}</Text>
      <Text style={styles.text}>{i18n.t("about.p1")}</Text>
      <Text style={styles.text}>{i18n.t("about.p2")}</Text>
      <Text style={styles.text}>{i18n.t("about.p3")}</Text>
      <Text style={styles.text}>{i18n.t("about.signature")}</Text>

      <TouchableOpacity onPress={handleInstagramPress} style={styles.iconContainer} accessibilityLabel="Instagram">
        <Feather name="instagram" size={28} color="#E1306C" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
    marginBottom: 12,
  },
  iconContainer: {
    marginTop: 24,
    alignSelf: "center",
    opacity: 0.9,
  },
});

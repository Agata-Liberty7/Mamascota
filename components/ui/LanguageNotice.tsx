import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../../i18n";
import { theme } from "../../src/theme";

export default function LanguageNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = async () => {
      const seen = await AsyncStorage.getItem("hasSeenLanguageNotice");
      if (!seen) {
        setVisible(true);
      }
    };

    check();
  }, []);

  const handleClose = async () => {
    await AsyncStorage.setItem("hasSeenLanguageNotice", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalWrapper}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {i18n.t("language_notice_title", {
              defaultValue: "Language detected",
            })}
          </Text>

          <Text style={styles.text}>
            {i18n.t("language_notice_message", {
              locale: i18n.locale,
              defaultValue: `Interface language set to: ${i18n.locale}`,
            })}
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>
              {i18n.t("ok_button", { defaultValue: "OK" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  buttonText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: "600",
  },
});

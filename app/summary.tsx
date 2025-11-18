// app/summary.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { restoreSession } from "../utils/chatWithGPT";
import i18n from "../i18n";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";

// файловая система (legacy — чтобы стабильно писать base64)
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Asset } from "expo-asset";

type SummaryItem = {
  id: string;
  date: string | number;
  petName: string;
  symptomKeys?: string[];
};

// универсальный перевод с fallback на английский
const t = (key: string, defEn: string) => i18n.t(key, { defaultValue: defEn });

export default function SummaryScreen() {
  const [sessions, setSessions] = useState<SummaryItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const stored = await AsyncStorage.getItem("chatSummary");
        const parsed: any[] = stored ? JSON.parse(stored) : [];

        const globalPet = await AsyncStorage.getItem("pet").then(v => (v ? JSON.parse(v) : null));

        const normalized: SummaryItem[] = parsed
          .map((rec: any) => {
            const petName =
              rec?.pet?.name ||
              rec?.petName ||
              globalPet?.name ||
              t("chat.pet_default", "Pet");
            const symptomKeys: string[] = rec?.symptomKeys || rec?.symptoms || [];
            const date = rec?.date || rec?.timestamp || Date.now();
            const id = rec?.id || rec?.conversationId || String(date);
            return { id, date, petName, symptomKeys };
          })
          .reverse();

        setSessions(normalized);
      } catch (err) {
        console.error("❌ Ошибка загрузки chatSummary:", err);
      }
    };
    loadSessions();
  }, []);

  // ▶️ Восстановить выбранную сессию
  const handleResume = async (item: SummaryItem) => {
    try {
      await AsyncStorage.setItem("selectedSymptoms", JSON.stringify(item.symptomKeys || []));
      await AsyncStorage.setItem("restoreFromSummary", "1");

      // активируем питомца по имени (если список хранится)
      const petsRaw = await AsyncStorage.getItem("pets:list");
      const pets = petsRaw ? JSON.parse(petsRaw) : [];
      const found = pets.find((p: any) => p.name === item.petName);
      if (found) {
        await AsyncStorage.setItem("pets:activeId", found.id);
        console.log("✅ Активный питомец для восстановления:", found.name);
      }

      await restoreSession(item.id);
      router.replace("/chat");
    } catch (err) {
      console.error("❌ Ошибка при восстановлении сессии:", err);
      Alert.alert(t("menu.summary", "Summary"), t("privacy_paragraph2", "If you agree, let's continue together."));
    }
  };

  // 🗑 Удалить одну сессию
  const handleDelete = async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem("chatSummary");
      const parsed: SummaryItem[] = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter(rec => rec.id !== id);
      await AsyncStorage.setItem("chatSummary", JSON.stringify(updated));
      await AsyncStorage.removeItem(`chatHistory:${id}`);
      setSessions(updated);
      console.log("🗑 Сессия удалена:", id);
    } catch (err) {
      console.error("❌ Ошибка при удалении сессии:", err);
      Alert.alert(t("menu.summary", "Summary"), t("privacy_paragraph2", "If you agree, let's continue together."));
    }
  };

  // ===== PDF =====

  // base64 -> Uint8Array (универсально для RN)
  const base64ToBytes = (b64: string) => {
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  };

  const handleExportPDF = async (id: string) => {
    try {
      const chatRaw = await AsyncStorage.getItem(`chatHistory:${id}`);
      const summaryRaw = await AsyncStorage.getItem("chatSummary");
      if (!chatRaw || !summaryRaw) {
        Alert.alert(t("menu.summary", "Summary"), t("settings.clear_done_message", "All saved data have been removed."));
        return;
      }

      const chat = JSON.parse(chatRaw);
      const summary = JSON.parse(summaryRaw).find((s: any) => s.id === id);
      const { petName, symptomKeys, date } = summary || {};

      const isHebrew = (i18n.locale || "").startsWith("he");

      // создаём документ и регистрируем fontkit
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      // шрифт:
      // - he*: ASCII-fallback (очищаем, т.к. pdf-lib без сложной RTL-разметки)
      // - иначе: встраиваем Unicode NotoSans-Regular.ttf (assets/fonts/NotoSans-Regular.ttf)
      let fontRef: any;
      const asciiSanitize = (s: string) => s.replace(/[^\x20-\x7E]/g, "");

      if (isHebrew) {
        // без эмодзи и RTL — чистый ASCII
        // встроим системный стандартный шрифт через pdf-lib (под ASCII ок)
        fontRef = await pdfDoc.embedFont("Helvetica");
      } else {
        const fontAsset = Asset.fromModule(require("../assets/fonts/NotoSans-Regular.ttf"));
        await fontAsset.downloadAsync();
        const fontB64 = await FileSystem.readAsStringAsync(fontAsset.localUri!, { encoding: "base64" });
        const fontBytes = base64ToBytes(fontB64);
        fontRef = await pdfDoc.embedFont(fontBytes, { subset: true });
      }

      // страница
      let page = pdfDoc.addPage([595, 842]); // A4
      const { height } = page.getSize();
      const lineH = 16;
      let y = height - 60;

      const draw = (text: string, size = 12) => {
        const prepared = isHebrew ? asciiSanitize(text) : text;
        page.drawText(prepared, { x: 50, y, size, font: fontRef, color: rgb(0, 0, 0) });
        y -= lineH;
      };

      // заголовок и вводные
      draw(t("menu.summary", "Consultation history"), 16);
      draw("---------------------------------------------");
      draw(`${t("chat.pet_default", "Pet")}: ${petName || t("chat.pet_default", "Pet")}`);
      draw(new Date(date || Date.now()).toLocaleString(isHebrew ? "en" : (i18n.locale || "en")));

      const localizedSymptoms = (symptomKeys || []).map((k: string) => t(`symptoms.${k}`, k));
      draw(`${t("symptomSelector.title", "Symptoms")}: ${localizedSymptoms.join(", ") || "-"}`);
      draw("---------------------------------------------");

      // содержимое чата (эмодзи — убираем)
      const wrap = (s: string) => (s.replace(/[^\x20-\x7E]/g, " ").match(/.{1,80}/g) || [s]);
      chat.forEach((msg: any) => {
        const role = msg.role === "user" ? "USER:" : "ASSIST:";
        const body = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        wrap(`${role} ${body}`).forEach(line => {
          if (y < 60) {
            page = pdfDoc.addPage([595, 842]);
            y = height - 60;
          }
          draw(line);
        });
        y -= 6;
      });

      // сохранить и расшарить
      const pdfBase64 = await pdfDoc.saveAsBase64();
      const fileUri = `${FileSystem.documentDirectory}mamascota_${id}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, pdfBase64, { encoding: "base64" });
      await Sharing.shareAsync(fileUri, { mimeType: "application/pdf" });
      console.log("📄 PDF exportado:", fileUri);
    } catch (err) {
      console.error("❌ Error al exportar PDF:", err);
      Alert.alert(t("menu.summary", "Summary"), t("privacy_paragraph2", "If you agree, let's continue together."));
    }
  };

  const renderItem = ({ item }: { item: SummaryItem }) => (
    <View style={styles.item}>
      <View style={styles.info}>
        <ThemedText type="defaultSemiBold" style={styles.petName}>
          {item.petName}
        </ThemedText>

        <ThemedText style={styles.symptoms} numberOfLines={1}>
          {item.symptomKeys?.length
            ? item.symptomKeys.map((k: string) => t(`symptoms.${k}`, k)).join(", ")
            : "—"}
        </ThemedText>

        <ThemedText style={styles.date}>
          {new Date(item.date).toLocaleString(i18n.locale || "en")}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleResume(item)} style={styles.iconButton}>
          <MaterialIcons name="play-circle-outline" size={26} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleExportPDF(item.id)} style={styles.iconButton}>
          <MaterialIcons name="picture-as-pdf" size={26} color="#E53935" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
          <MaterialIcons name="delete-outline" size={26} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("menu.summary", "Consultation history")}</Text>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>{t("settings.pets.empty", "No saved sessions yet.")}</Text>
      ) : (
        <FlatList data={sessions} renderItem={renderItem} keyExtractor={(item, index) => `${item.id}-${index}`} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: "#333" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  info: { flexDirection: "column" },
  petName: { fontWeight: "600", fontSize: 16, color: "#333" },
  date: { fontSize: 13, color: "#666" },
  symptoms: { fontSize: 13, color: "#555", marginTop: 2, marginBottom: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: { padding: 6 },
  empty: { fontSize: 15, color: "#777", textAlign: "center", marginTop: 50 },
});

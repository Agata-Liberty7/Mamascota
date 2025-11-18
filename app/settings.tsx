import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Button,
} from 'react-native';

import AppModal from '../components/ui/AppModal';
import LanguageSelector from '../components/ui/LanguageSelector';
import PetForm from '../components/ui/PetForm';
import ThemedText from '../components/ui/ThemedText';
import i18n from '../i18n';
import { useUiSettings } from '../src/context/UiSettings';
import {
  deletePet,
  getCurrentPetId as getActivePetId,
  getPetsForSettings,
  setCurrentPetId as setActivePetIdStorage,
  upsertPet,
} from '../src/data/pets';
import { theme } from '../src/theme';
import type { Pet, Species } from '../types/pet';
import { getLocalizedSpeciesLabel } from '../utils/getLocalizedSpeciesLabel';
import { clearAllAppData } from "../utils/clearAllAppData";

const tOr = (fallback: string, ...keys: string[]) => {
  for (const k of keys) {
    const v = i18n.t(k as any);
    const s = typeof v === 'string' ? v : '';
    if (s && s !== k && !s.toLowerCase().includes('missing')) {
      return s;
    }
  }
  return fallback;
};

export default function SettingsScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.locale);
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePetId, setActivePetIdState] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | undefined>(undefined);

  // 🧩 поля формы
  const [fName, setFName] = useState('');
  const [fSpecies, setFSpecies] = useState<Species | undefined>(undefined);
  const [fAge, setFAge] = useState('');
  const [fBreed, setFBreed] = useState('');
  const [fSex, setFSex] = useState<'' | 'male' | 'female'>('');
  const [fNeutered, setFNeutered] = useState(false);

  const { scaleIndex, setScaleIndex } = useUiSettings();

  const L = {
    del: tOr('Delete', 'common.delete', 'delete'),
    cancel: tOr('Cancel', 'common.cancel', 'cancel'),
    save: tOr('Save', 'common.save', 'save'),
  };

  // 🔁 обновление списка питомцев
  const refreshPets = async () => {
    const [list, id] = await Promise.all([getPetsForSettings(), getActivePetId()]);
    setPets(list);
    setActivePetIdState(id);
  };

  // 🔹 загрузка при монтировании
  useEffect(() => {
    (async () => {
      const savedLang = await AsyncStorage.getItem('selectedLanguage');
      if (savedLang) {
        i18n.locale = savedLang;
        setSelectedLanguage(savedLang);
      }
      await refreshPets();
    })();
  }, []);

  // 🔁 перезагрузка при возврате из других экранов
  useFocusEffect(useCallback(() => { refreshPets(); }, []));

  const applyLanguage = async (lang: string) => {
    i18n.locale = lang;
    setSelectedLanguage(lang);
    await AsyncStorage.setItem('selectedLanguage', lang);
  };

  const openEditor = (pet?: Pet) => {
    setEditing(pet);
    setFName(pet?.name ?? '');
    setFSpecies(pet?.species);
    setFAge(pet?.ageYears != null ? String(pet.ageYears) : '');
    setFBreed(pet?.breed ?? '');
    setFSex(pet?.sex ?? '');
    setFNeutered(pet?.neutered ?? false);
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);

  const canSave = fName.trim().length > 0;

  // 💾 безопасное сохранение питомца
  const onSave = async () => {
    if (!canSave) return;
    const parsed = parseFloat((fAge || '').replace(',', '.'));
    const ageYears = Number.isFinite(parsed) && parsed >= 0 && parsed <= 40 ? parsed : undefined;

    const payload: Partial<Omit<Pet, 'species'>> & { species?: Species } = {
      id: editing?.id,
      name: fName.trim(),
      species: fSpecies,
      ageYears,
      breed: fBreed.trim() || undefined,
      sex: fSex || undefined,
      neutered: fNeutered,
    };

    await upsertPet(payload);
    await refreshPets();
    closeEditor();
  };

  const onDelete = async () => {
    if (!editing?.id) return;
    await deletePet(editing.id);
    await refreshPets();
    closeEditor();
  };

  const handleFullReset = async () => {
    Alert.alert(
      i18n.t("settings.clear_data_title"),      // ¿Borrar datos?
      i18n.t("settings.clear_data_message"),    // Se eliminarán todas las sesiones...
      [
        { text: i18n.t("cancel"), style: "cancel" },

        {
          text: i18n.t("settings.clear"),       // Borrar
          style: "destructive",
          onPress: async () => {
            // 1️⃣ Полная очистка хранилища
            await clearAllAppData();

            // 2️⃣ ДОП-ОЧИСТКА для Android (важно!)
            await AsyncStorage.removeItem("pets");
            await AsyncStorage.removeItem("activePetId");
            await AsyncStorage.removeItem("currentPetId");
            await AsyncStorage.removeItem("animalProfile");

            // 3️⃣ Принудительно перезаписываем petsList — чтобы UI НЕ взял старый кэш
            await AsyncStorage.setItem("petsList", JSON.stringify([]));

            // 4️⃣ Сбрасываем состояние react-компонента
            setPets([]);

            console.log("🧹 Datos borrados (Android-safe)");

            // обновляем UI заново
            await refreshPets();
          },
        },
      ]
    );
  };

  const debugShowAllKeys = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);

    console.log("📌 ВСЕ КЛЮЧИ В ANDROID:", keys);
    console.log("📌 ВСЕ ДАННЫЕ:", entries);
    
    Alert.alert(
      "Ключи в AsyncStorage",
      keys.join("\n")
    );
  };


  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.title}>{i18n.t('menu.settings')}</ThemedText>

        {/* 🌍 Язык */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('menu.change_language')}</Text>
          <LanguageSelector selected={selectedLanguage} onSelect={applyLanguage} />
        </View>

        {/* 🔠 Размер текста */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('settings.text_size')}</Text>
          <Text style={styles.note}>{i18n.t('settings.text_size_hint')}</Text>

          <View style={styles.segmentRow}>
            {[0, 1, 2, 3].map((idx) => (
              <Pressable
                key={idx}
                onPress={() => setScaleIndex(idx as 0 | 1 | 2 | 3)}
                style={[styles.segment, scaleIndex === idx && styles.segmentActive]}
              >
                <Text style={styles.segmentText}>
                  {idx === 0 ? i18n.t('settings.text_size_system') : idx === 1 ? 'A' : idx === 2 ? 'A+' : 'A++'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ThemedText style={{ fontSize: 16 }}>Aa Bb Cc 123 — preview</ThemedText>
        </View>

        {/* 🐾 Питомцы */}
        <View style={styles.card}>
          <View className="row" style={styles.row}>
            <Text style={styles.cardTitle}>{i18n.t('settings.pets.title')}</Text>
            <Pressable onPress={() => openEditor(undefined)}>
              <Text style={styles.link}>{i18n.t('settings.pets.add')}</Text>
            </Pressable>
          </View>

          {pets.length === 0 ? (
            <Text style={styles.note}>{i18n.t('settings.pets.empty')}</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {pets.map((p, idx) => (
                <View key={`${p.id ?? 'pet'}_${idx}`} style={styles.petItem}>
                  <TouchableOpacity onPress={() => openEditor(p)} activeOpacity={0.7} style={{ flex: 1 }}>
                    <Text style={styles.petTitle}>
                      {p.name} · {getLocalizedSpeciesLabel(p.species, p.sex)}
                    </Text>
                    {p.breed ? <Text style={styles.noteSmall}>{p.breed}</Text> : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={async () => {
                      if (!p.id) return;
                      await setActivePetIdStorage(p.id);
                      setActivePetIdState(p.id);
                    }}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.link, activePetId === p.id ? { opacity: 1 } : { opacity: 0.8 }]}>
                      {activePetId === p.id ? i18n.t('settings.pets.default') : i18n.t('settings.pets.set_default')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 🧹 Очистка */}
        <View style={{ marginTop: 40, marginBottom: 20 }}>
          <Button
            title={`🧹 ${i18n.t("settings.clear_data")}`}
            color="crimson"
            onPress={handleFullReset}
          />
          <Button
            title="🔍 Показать ключи (DEV)"
            onPress={debugShowAllKeys}
            color="gray"
          />
        </View>
      </ScrollView>

      {/* ✏️ Модалка редактирования / добавления */}
      <AppModal
        visible={editorOpen}
        title={editing ? i18n.t('settings.pets.edit_pet') : i18n.t('settings.pets.add_pet')}
        onClose={closeEditor}
      >
        <PetForm
          species={fSpecies}
          name={fName}
          ageYears={fAge}
          breed={fBreed}
          sex={fSex}
          neutered={fNeutered}
          onSpeciesChange={setFSpecies}
          onNameChange={setFName}
          onAgeChange={setFAge}
          onBreedChange={setFBreed}
          onSexChange={setFSex}
          onNeuteredChange={setFNeutered}
        />

        <View style={[styles.field, styles.row, { justifyContent: 'flex-end', gap: 16 }]}>
          {editing?.id ? (
            <Pressable onPress={onDelete}>
              <Text style={[styles.link, { color: '#b42318' }]}>{L.del}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={closeEditor}>
            <Text style={styles.link}>{L.cancel}</Text>
          </Pressable>

          <Pressable onPress={onSave} disabled={!canSave}>
            <Text style={[styles.link, !canSave && { opacity: 0.4 }]}>{L.save}</Text>
          </Pressable>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: 16, paddingBottom: 32, gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginRight: 8, color: theme.colors.textPrimary },
  note: { fontSize: 13, color: theme.colors.textSecondary },
  noteSmall: { fontSize: 12, color: theme.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 14, textDecorationLine: 'underline', color: theme.colors.textPrimary },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  petTitle: { fontSize: 15, color: theme.colors.textPrimary },
  field: { gap: 6 },
  segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  segmentActive: { borderColor: theme.colors.textPrimary, backgroundColor: theme.colors.cardBg },
  segmentText: { fontSize: 14, color: theme.colors.textPrimary },
});

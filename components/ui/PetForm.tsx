// PetForm.tsx — устойчив к species = undefined | '' и не падает в режиме «показать»
// (species теперь необязательный; добавлен безопасный вывод плейсхолдера)

import React from 'react';
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import i18n from '../../i18n';
import { theme } from '../../src/theme';
import type { Species } from '../../types/pet';
import { getLocalizedSpeciesLabel } from '../../utils/getLocalizedSpeciesLabel';

interface Props {
  species?: Species | '' | null;                       // ← стало: опционально
  name: string;
  ageYears: string;
  breed: string;
  sex: 'male' | 'female' | '';
  neutered: boolean;
  onNameChange: (val: string) => void;
  onSpeciesChange?: (val: Species) => void;       // если есть — показываем выбор
  onAgeChange: (val: string) => void;
  onBreedChange: (val: string) => void;
  onSexChange: (val: 'male' | 'female' | '') => void;
  onNeuteredChange: (val: boolean) => void;
  onChange?: (field: string, value: any) => void;
}

export default function PetForm({
  species,
  name,
  ageYears,
  breed,
  sex = '',
  neutered,
  onSpeciesChange,
  onNameChange,
  onAgeChange,
  onBreedChange,
  onSexChange,
  onNeuteredChange,
  onChange,
}: Props) {
  const effectiveSpecies =
    species && typeof species === 'string' && species.trim() !== ''
      ? (species as Species)
      : undefined;

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.subLabel}>
          {i18n.t('settings.pets.species_label')}
        </Text>

        {/* Если передан onSpeciesChange — показываем облако выбора вида.
            Если нет — выводим значение (или плейсхолдер, если вида нет). */}
        {onSpeciesChange || onChange ? (
          <View style={styles.tagCloud}>
            {[
              'dog','cat','rabbit','ferret','bird','rodent','reptile','fish','exotic',
            ].map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.speciesTag,
                  effectiveSpecies === key && styles.speciesTagSelected,
                ]}
                onPress={() => {
                  onSpeciesChange?.(key as Species);
                  onChange?.('species', key);
                }}
              >
                <Text style={styles.speciesTagText}>{i18n.t(`animal_${key}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.speciesValue}>
            {effectiveSpecies
              ? getLocalizedSpeciesLabel(effectiveSpecies, sex)
              : i18n.t('species_placeholder') /* "Species / breed" */}
          </Text>
        )}
      </View>

      {/* name */}
      <TextInput
        placeholder={i18n.t('name_placeholder')}
        placeholderTextColor={theme.colors.textLight}
        value={name}
        onChangeText={(v) => {
          onNameChange(v);
          onChange?.('name', v);
        }}
        style={styles.input}
      />

      {/* age */}
      <TextInput
        placeholder={i18n.t('age_placeholder')}
        placeholderTextColor={theme.colors.textLight}
        value={ageYears}
        onChangeText={(v) => {
          onAgeChange(v);
          onChange?.('age', v);
        }}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* breed */}
      <TextInput
        placeholder={i18n.t('species_placeholder')}
        placeholderTextColor={theme.colors.textLight}
        value={breed}
        onChangeText={(v) => {
          onBreedChange(v);
          onChange?.('breed', v);
        }}
        style={styles.input}
      />

      {/* sex */}
      <Text style={styles.subLabel}>{i18n.t('sex')}</Text>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => { onSexChange('male'); onChange?.('sex', 'male'); }}
          style={[styles.segment, sex === 'male' && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>♂</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onSexChange('female'); onChange?.('sex', 'female'); }}
          style={[styles.segment, sex === 'female' && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>♀</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onSexChange(''); onChange?.('sex', ''); }}
          style={[styles.segment, sex === '' && styles.segmentActive]}
        >
          <Text style={styles.segmentText}>⚪️</Text>
        </TouchableOpacity>
      </View>

      {/* neutered / spayed */}
      <View style={[styles.row, { marginTop: 8 }]}>
        <Text style={styles.subLabel}>{i18n.t('neutered_spayed')}</Text>
        <Switch
          value={neutered}
          onValueChange={(val) => { onNeuteredChange(val); onChange?.('neutered', val); }}
          ios_backgroundColor="#D1D5DB"
          trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
          thumbColor={Platform.OS === 'android'
            ? (neutered ? theme.colors.buttonPrimaryBg : '#f4f3f4')
            : undefined}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  subLabel: { fontSize: 14, color: theme.colors.textPrimary, marginTop: 4, marginBottom: 6 },
  speciesValue: {
    fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary,
    paddingVertical: 4, paddingHorizontal: 8, backgroundColor: theme.colors.cardBg,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border,
  },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  segment: {
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.background,
  },
  segmentActive: { borderColor: theme.colors.textPrimary, backgroundColor: theme.colors.cardBg },
  segmentText: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap' },
  speciesTag: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16,
    backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ccc',
    marginRight: 8, marginBottom: 8,
  },
  speciesTagSelected: { backgroundColor: '#d0d0d0', borderColor: '#999' },
  speciesTagText: { fontSize: 14, color: '#000' },
});

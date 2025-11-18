import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import i18n from '../i18n';

const SYMPTOMS = [
  'lethargy',
  'vomiting',
  'diarrhea',
  'cough',
  'appetite_loss',
  'limping',
  'drinking_too_much',
  'blood_in_urine',
  'seizures',
  'custom',
];

interface Props {
  onSubmit: (selected: string[]) => void;
}

export default function SymptomSelector({ onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');

  const toggleSymptom = (key: string) => {
    if (key === 'custom') {
      setShowCustomInput(true);
      return;
    }

    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length < 3
          ? [...prev, key]
          : prev
    );
  };

  const handleConfirm = async () => {
    const final = [...selected];
    if (customSymptom.trim()) {
      final.push(customSymptom.trim());
    }

    try {
      await AsyncStorage.setItem("selectedSymptoms", JSON.stringify(final));
      console.log("🩺 Saved selectedSymptoms:", final);
    } catch (e) {
      console.error("❌ Не удалось сохранить selectedSymptoms:", e);
    }

    onSubmit(final);
  };

  const isConfirmDisabled = selected.length === 0 && !customSymptom.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('symptomSelector.title')}</Text>
      <Text style={styles.hint}>{i18n.t('symptomSelector.hint')}</Text>

      <View style={styles.tagsContainer}>
        {SYMPTOMS.map((key) => {
          const isSelected = selected.includes(key) || (key === 'custom' && showCustomInput);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tag, isSelected && styles.tagSelected]}
              onPress={() => toggleSymptom(key)}
            >
              <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                {i18n.t(`symptoms.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showCustomInput && (
        <TextInput
          value={customSymptom}
          onChangeText={setCustomSymptom}
          placeholder="..."
          placeholderTextColor="#888"
          style={styles.customInput}
        />
      )}

      <TouchableOpacity
        style={[styles.button, isConfirmDisabled && { opacity: 0.5 }]}
        onPress={handleConfirm}
        disabled={isConfirmDisabled}
      >
        <Text style={styles.buttonText}>{i18n.t('symptomSelector.confirm')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#42A5F5',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  tagTextSelected: {
    fontWeight: 'bold',
    color: '#1565C0',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#42A5F5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
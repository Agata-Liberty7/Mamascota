import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setTextScaleGlobal } from '../setup/textScaleBus';

const STORAGE_KEY_INDEX = 'ui:textScaleIndex';
// Шаги масштабирования (0=system)
export const SCALE_STEPS = [1.0, 1.1, 1.2, 1.35] as const;
export type ScaleIndex = 0 | 1 | 2 | 3;

type UiSettings = {
  textScale: number;           // фактический множитель
  scaleIndex: ScaleIndex;      // 0..3
  setScaleIndex: (idx: ScaleIndex) => void;
};

const Ctx = createContext<UiSettings | null>(null);

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [scaleIndex, setScaleIndexState] = useState<ScaleIndex>(0);

  // загрузка сохранённого значения
  useEffect(() => {
    setTextScaleGlobal(SCALE_STEPS[scaleIndex]);
    (async () => {
      try {
        const rawIdx = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
        if (rawIdx != null) {
          const idx = Number(rawIdx);
          if (idx >= 0 && idx <= 3) setScaleIndexState(idx as ScaleIndex);
        }
      } catch {}
    })();
  }, []);

  const setScaleIndex = useCallback((idx: ScaleIndex) => {
    
    setScaleIndexState(idx);
    AsyncStorage.setItem(STORAGE_KEY_INDEX, String(idx)).catch(() => {});
    setTextScaleGlobal(SCALE_STEPS[idx]);
  }, []);

  const value = useMemo<UiSettings>(() => ({
    textScale: SCALE_STEPS[scaleIndex],
    scaleIndex,
    setScaleIndex,
  }), [scaleIndex, setScaleIndex]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUiSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUiSettings must be used within UiSettingsProvider');
  return v;
}

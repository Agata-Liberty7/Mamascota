import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useUiSettings } from '../../src/context/UiSettings';

export default function ThemedText({ style, ...props }: TextProps) {
  const { textScale } = useUiSettings();

  // Нормализуем стиль к массиву и домножаем только числовые fontSize
  const styles = (Array.isArray(style) ? style : [style]).filter(Boolean) as TextStyle[];
  const scaled = styles.map(s => {
    if (s && typeof s.fontSize === 'number') {
      return { ...s, fontSize: s.fontSize * textScale };
    }
    return s;
  });

  return <Text {...props} allowFontScaling style={scaled.length ? scaled : undefined} />;
}

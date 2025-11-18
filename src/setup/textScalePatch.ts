import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { getTextScaleGlobal, onTextScaleChange } from './textScaleBus';

let scale = getTextScaleGlobal();
onTextScaleChange(s => { scale = s; });

const origRender = (Text as any).render ?? (Text as any).render;
(Text as any).render = function patchedTextRender(...args: any[]) {
  const origin = origRender?.apply(this, args);
  if (!origin || origin.props?._noScale) return origin;

  const apply = (st: any): any => {
    if (!st) return st;
    if (Array.isArray(st)) return st.map(apply);
    if (typeof st === 'object') {
      const s = st as TextStyle & { _noScale?: boolean };
      if ((s as any)._noScale) return s;
      if (typeof s.fontSize === 'number') {
        return { ...s, fontSize: s.fontSize * scale };
      }
    }
    return st;
  };

  const nextStyle = apply(StyleSheet.flatten(origin.props.style));
  return React.cloneElement(origin, { style: nextStyle });
};

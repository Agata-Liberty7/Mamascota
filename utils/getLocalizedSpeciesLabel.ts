// utils/getLocalizedSpeciesLabel.ts
import i18n from '../i18n';

export function getLocalizedSpeciesLabel(species: string, sex?: 'male' | 'female' | ''): string {
  const sp = String(species ?? '').toLowerCase();
  const raw = String(sex ?? '').toLowerCase();
  const sexKey =
    /^(male|m|♂|samets|самец)$/.test(raw) ? 'male' :
    /^(female|f|♀|samka|самка)$/.test(raw) ? 'female' :
    null;

  const k1 = sexKey ? `animal_${sp}_${sexKey}` : '';
  const k2 = `animal_${sp}`;

  const v1 = k1 ? i18n.t(k1) : '';
  if (v1 && v1 !== k1 && !v1.includes('missing') && v1.length < 50) return v1;

  const v2 = i18n.t(k2);
  if (v2 && v2 !== k2 && !v2.includes('missing') && v2.length < 50) return v2;

  return sp;
}

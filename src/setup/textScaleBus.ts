let current = 1;
const listeners = new Set<(s: number) => void>();

export function setTextScaleGlobal(s: number) {
  current = s;
  listeners.forEach(l => l(s));
}
export function getTextScaleGlobal() {
  return current;
}
export function onTextScaleChange(fn: (s: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

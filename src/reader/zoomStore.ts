import { createMMKV } from 'react-native-mmkv';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

const KEY = 'zoom';
const storage = createMMKV({ id: 'reader' });

export function clampZoom(zoom: number) {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// One zoom level for the whole app. The read is synchronous, so the reader's
// first frame is already at the saved zoom.
export function loadZoom() {
  const saved = storage.getNumber(KEY);
  return Number.isFinite(saved) ? clampZoom(saved as number) : MIN_ZOOM;
}

export function saveZoom(zoom: number) {
  storage.set(KEY, clampZoom(zoom));
}

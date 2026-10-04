import { clampZoom, loadZoom, saveZoom } from '../src/reader/zoomStore';

test('defaults to 1 when nothing has been saved', () => {
  expect(loadZoom()).toBe(1);
});

test('round-trips a saved zoom', () => {
  saveZoom(2.25);
  expect(loadZoom()).toBe(2.25);
});

test('keeps zoom within 1 and 3', () => {
  expect(clampZoom(0.4)).toBe(1);
  expect(clampZoom(7)).toBe(3);
  saveZoom(9);
  expect(loadZoom()).toBe(3);
});

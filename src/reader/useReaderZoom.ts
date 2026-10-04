import { useCallback, useState } from 'react';
import {
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useScrollOffset,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ScrollViewInstance } from './ReaderScrollView';
import { clampZoom, loadZoom, MIN_ZOOM, saveZoom } from './zoomStore';

const DOUBLE_TAP_ZOOM = 2;
const DOUBLE_TAP_DURATION_MS = 220;
const CROSS_PAN_ACTIVATION: [number, number] = [-10, 10];

// The direction the reader's list scrolls in.
export type ReaderAxis = 'vertical' | 'horizontal';

// Zoom for the whole reader, not per page. The list sits in a container that
// is scaled from its top-left corner and shifted across the scroll direction.
// For the vertical reader:
//
//   screenX = shift + scale * layoutX
//   screenY = scale * (contentY - scrollY)
//
// The spread reader scrolls sideways, so there the two axes swap. Movement
// along the scroll direction stays the list's own native scroll, so scrolling
// while zoomed costs nothing extra. Everything here runs on the UI thread;
// React only hears about a zoom level once a gesture has settled on it.
//
// crossSize is the reader's size across the scroll direction. The reader is
// remounted when its size changes, so it is constant for the hook's lifetime.
export function useReaderZoom(axis: ReaderAxis, crossSize: number) {
  const horizontal = axis === 'horizontal';
  const scrollRef = useAnimatedRef<ScrollViewInstance>();
  const scrollOffset = useScrollOffset(scrollRef);

  // The settled zoom: what is persisted, and what React lays out against.
  const [zoom, setZoom] = useState(loadZoom);

  const scale = useSharedValue(zoom);
  // Starts centred, so a restored zoom does not open on the near edge.
  const shift = useSharedValue((-(zoom - 1) * crossSize) / 2);

  // While a zoom is in progress, the content point under the focal point is
  // pinned there. anchorCross is that point in layout space, anchorMain in
  // the list's content space.
  const anchored = useSharedValue(false);
  const anchorId = useSharedValue(0);
  const anchorCross = useSharedValue(0);
  const anchorMain = useSharedValue(0);
  const focalCross = useSharedValue(0);
  const focalMain = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);

  const commitZoom = useCallback((value: number) => {
    // Snap a near-1 zoom to exactly 1 so "zoomed out" is unambiguous.
    const settled = value < MIN_ZOOM + 0.02 ? MIN_ZOOM : clampZoom(value);
    setZoom(settled);
    saveZoom(settled);
  }, []);

  const pinAt = (x: number, y: number) => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(shift);
    const cross = horizontal ? y : x;
    const main = horizontal ? x : y;
    anchorCross.value = (cross - shift.value) / scale.value;
    anchorMain.value = scrollOffset.value + main / scale.value;
    focalCross.value = cross;
    focalMain.value = main;
    anchorId.value += 1;
    anchored.value = true;
  };

  useAnimatedReaction(
    () =>
      anchored.value
        ? { s: scale.value, cross: focalCross.value, main: focalMain.value }
        : null,
    current => {
      if (!current) {
        return;
      }
      shift.value = Math.min(
        0,
        Math.max(
          -(current.s - 1) * crossSize,
          current.cross - current.s * anchorCross.value,
        ),
      );
      const offset = Math.max(0, anchorMain.value - current.main / current.s);
      scrollTo(
        scrollRef,
        horizontal ? offset : 0,
        horizontal ? 0 : offset,
        false,
      );
    },
  );

  const pinch = usePinchGesture({
    onActivate: event => {
      'worklet';
      // The gesture activates a little after the fingers start moving, so its
      // scale is already off 1; dividing it out avoids a jump.
      pinchStartScale.value = scale.value / event.scale;
      pinAt(event.focalX, event.focalY);
    },
    onUpdate: event => {
      'worklet';
      scale.value = clampZoom(pinchStartScale.value * event.scale);
      focalCross.value = horizontal ? event.focalY : event.focalX;
      focalMain.value = horizontal ? event.focalX : event.focalY;
    },
    onDeactivate: () => {
      'worklet';
      anchored.value = false;
      scheduleOnRN(commitZoom, scale.value);
    },
  });

  const isZoomed = useDerivedValue(() => scale.value > MIN_ZOOM);

  // Moves the zoomed reader across its scroll direction.
  const crossPan = usePanGesture({
    enabled: isZoomed,
    maxPointers: 1,
    activeOffsetX: horizontal ? undefined : CROSS_PAN_ACTIVATION,
    activeOffsetY: horizontal ? CROSS_PAN_ACTIVATION : undefined,
    onActivate: () => {
      'worklet';
      cancelAnimation(shift);
    },
    onUpdate: event => {
      'worklet';
      const change = horizontal ? event.changeY : event.changeX;
      shift.value = Math.min(
        0,
        Math.max(-(scale.value - 1) * crossSize, shift.value + change),
      );
    },
    onDeactivate: event => {
      'worklet';
      shift.value = withDecay({
        velocity: horizontal ? event.velocityY : event.velocityX,
        clamp: [-(scale.value - 1) * crossSize, 0],
      });
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: event => {
      'worklet';
      const target = scale.value > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM;
      pinAt(event.x, event.y);
      const id = anchorId.value;
      scale.value = withTiming(
        target,
        { duration: DOUBLE_TAP_DURATION_MS },
        finished => {
          // A pinch that interrupted this animation owns the anchor now.
          if (anchorId.value !== id) {
            return;
          }
          anchored.value = false;
          if (finished) {
            scheduleOnRN(commitZoom, target);
          }
        },
      );
    },
  });

  const gesture = useCompetingGestures(pinch, crossPan, doubleTap);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      horizontal ? { translateY: shift.value } : { translateX: shift.value },
      { scale: scale.value },
    ],
  }));

  return {
    zoom,
    gesture,
    doubleTap,
    zoomStyle,
    scrollRef,
    scrollOffset,
    crossPan,
  };
}

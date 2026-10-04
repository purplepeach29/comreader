import { createContext, useContext, type ComponentRef, type Ref } from 'react';
import type { ScrollView as RNScrollView, ScrollViewProps } from 'react-native';
import { ScrollView, type PanGesture } from 'react-native-gesture-handler';
import type { AnimatedRef } from 'react-native-reanimated';

export type ScrollViewInstance = ComponentRef<typeof RNScrollView>;

type ReaderScroll = {
  scrollRef: AnimatedRef<ScrollViewInstance>;
  // Panning a zoomed reader across its scroll direction has to run alongside
  // the scrolling itself.
  crossPan: PanGesture;
};

export const ReaderScrollContext = createContext<ReaderScroll | null>(null);

// FlashList's scroll view, swapped for one the zoom gestures can coordinate
// with and scroll from the UI thread. FlashList calls this as a render
// function and owns the ref, so the zoom hook's ref is attached alongside it.
export function ReaderScrollView({
  ref,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollViewInstance> }) {
  const reader = useContext(ReaderScrollContext);
  if (!reader) {
    throw new Error('ReaderScrollView needs a ReaderScrollContext');
  }
  const { scrollRef, crossPan } = reader;

  return (
    <ScrollView
      {...props}
      simultaneousWith={crossPan}
      ref={node => {
        scrollRef(node);
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
    />
  );
}

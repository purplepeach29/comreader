import { useCallback, useRef, useState } from 'react';
import type { FlashListRef } from '@shopify/flash-list';

// Opens a list at a given item. FlashList's initialScrollIndex places the list
// from guessed sizes for the items before it, and on Android its scroll
// correction then moved the list a second time, opening several pages too far
// on. Scrolling once the first items have been measured lands correctly. The
// list is hidden until then, so the start of the chapter does not flash.
export function useOpenAtIndex<T>(index: number) {
  const listRef = useRef<FlashListRef<T>>(null);
  const [ready, setReady] = useState(index === 0);

  const onLoad = useCallback(() => {
    if (index === 0) {
      return;
    }
    const list = listRef.current;
    if (!list) {
      setReady(true);
      return;
    }
    list
      .scrollToIndex({ index, animated: false })
      .finally(() => setReady(true));
  }, [index]);

  return { listRef, onLoad, ready };
}

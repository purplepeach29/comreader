import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { Page } from '../api/types';
import { prefetchPagesAfter } from './prefetch';
import { ReaderPage } from './ReaderPage';
import { ReaderScrollContext, ReaderScrollView } from './ReaderScrollView';
import { useOpenAtIndex } from './useOpenAtIndex';
import { useReaderZoom } from './useReaderZoom';

// A page touching the edge of the screen by a sliver is not being read, and
// counting it would make the current page the one before.
export const VIEWABILITY = { itemVisiblePercentThreshold: 1 };

export type ReaderProps = {
  pages: Page[];
  width: number;
  height: number;
  // Index of the page to open at.
  initialPage: number;
  onPageChange: (index: number) => void;
};

// One page per row at full width, scrolling vertically.
export function ScrollReader({
  pages,
  width,
  height,
  initialPage,
  onPageChange,
}: ReaderProps) {
  const [initialIndex] = useState(initialPage);
  const { listRef, onLoad, ready } = useOpenAtIndex<Page>(initialIndex);
  const { zoom, gesture, zoomStyle, scrollRef, crossPan } = useReaderZoom(
    'vertical',
    width,
  );

  const scrollContext = useMemo(
    () => ({ scrollRef, crossPan }),
    [scrollRef, crossPan],
  );

  const renderItem = useCallback(
    ({ item }: { item: Page }) => <ReaderPage page={item} width={width} />,
    [width],
  );

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Page>[] }) => {
      let first = Infinity;
      let last = -1;
      for (const { index } of viewableItems) {
        if (index != null) {
          first = Math.min(first, index);
          last = Math.max(last, index);
        }
      }
      // Until the list has moved to its opening page, what is on screen is
      // the start of the chapter, not what is being read.
      if (last === -1 || !readyRef.current) {
        return;
      }
      onPageChange(first);
      prefetchPagesAfter(pagesRef.current, last);
    },
    [onPageChange],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill}>
        <Animated.View
          style={[styles.zoomed, { width }, zoomStyle, !ready && styles.hidden]}
        >
          <ReaderScrollContext.Provider value={scrollContext}>
            <FlashList
              data={pages}
              renderItem={renderItem}
              keyExtractor={page => String(page.pageNum)}
              renderScrollComponent={ReaderScrollView}
              viewabilityConfig={VIEWABILITY}
              ref={listRef}
              onLoad={onLoad}
              onViewableItemsChanged={onViewableItemsChanged}
              drawDistance={height}
              showsVerticalScrollIndicator={false}
              // Zoomed, only the top 1/zoom of the list's viewport is on
              // screen. This lets the last page scroll up into that part.
              ListFooterComponent={
                <View style={{ height: height * (1 - 1 / zoom) }} />
              }
            />
          </ReaderScrollContext.Provider>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  zoomed: {
    flex: 1,
    transformOrigin: 'top left',
  },
  hidden: {
    opacity: 0,
  },
});

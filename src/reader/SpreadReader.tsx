import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import {
  GestureDetector,
  useCompetingGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { scrollTo } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { prefetchPagesAfter } from './prefetch';
import { ReaderPage } from './ReaderPage';
import { ReaderScrollContext, ReaderScrollView } from './ReaderScrollView';
import { VIEWABILITY, type ReaderProps } from './ScrollReader';
import {
  buildSpreads,
  fitWidth,
  spreadIndexForPage,
  type Spread,
} from './spreads';
import { useOpenAtIndex } from './useOpenAtIndex';
import { useReaderZoom } from './useReaderZoom';
import { MIN_ZOOM } from './zoomStore';

// A tap within this share of the width from either side turns the page.
const EDGE_TAP_FRACTION = 0.2;

const SpreadItem = memo(function ({
  spread,
  width,
  height,
}: {
  spread: Spread;
  width: number;
  height: number;
}) {
  const boxWidth = width / spread.pages.length;
  return (
    <View style={[styles.spread, { width, height }]}>
      {spread.pages.map((page, slot) => (
        <ReaderPage
          // Keyed by slot so a recycled cell reuses its page views.
          key={slot}
          page={page}
          width={Math.floor(fitWidth(page.resolution, boxWidth, height))}
        />
      ))}
    </View>
  );
});

// Two pages side by side, one spread per screen, moving sideways by swipe or
// by a tap near either edge.
export function SpreadReader({
  pages,
  width,
  height,
  initialPage,
  onPageChange,
}: ReaderProps) {
  const spreads = useMemo(() => buildSpreads(pages), [pages]);
  const [initialIndex] = useState(() =>
    spreadIndexForPage(spreads, initialPage),
  );
  const { listRef, onLoad, ready } = useOpenAtIndex<Spread>(initialIndex);
  const {
    zoom,
    gesture,
    doubleTap,
    zoomStyle,
    scrollRef,
    scrollOffset,
    crossPan,
  } = useReaderZoom('horizontal', height);

  const scrollContext = useMemo(
    () => ({ scrollRef, crossPan }),
    [scrollRef, crossPan],
  );

  const lastSpread = spreads.length - 1;
  const edgeTap = useTapGesture({
    // Otherwise the first tap of a double-tap zoom would turn the page.
    requireToFail: doubleTap,
    onActivate: event => {
      'worklet';
      // Whole numbers are spread starts. Zoomed, the list can rest between
      // them, and going back first returns to the start of the current one.
      const position = scrollOffset.value / width;
      let target: number;
      if (event.x < width * EDGE_TAP_FRACTION) {
        target = Math.ceil(position - 0.01) - 1;
      } else if (event.x > width * (1 - EDGE_TAP_FRACTION)) {
        target = Math.floor(position + 0.01) + 1;
      } else {
        return;
      }
      scrollTo(
        scrollRef,
        Math.min(lastSpread, Math.max(0, target)) * width,
        0,
        true,
      );
    },
  });
  const gestures = useCompetingGestures(gesture, edgeTap);

  // Paging is off while zoomed, so zooming back out can leave the list
  // between two spreads.
  const previousZoom = useRef(zoom);
  useEffect(() => {
    const wasZoomed = previousZoom.current !== MIN_ZOOM;
    previousZoom.current = zoom;
    if (wasZoomed && zoom === MIN_ZOOM) {
      scheduleOnUI(() => {
        'worklet';
        scrollTo(
          scrollRef,
          Math.round(scrollOffset.value / width) * width,
          0,
          true,
        );
      });
    }
  }, [zoom, width, scrollRef, scrollOffset]);

  const renderItem = useCallback(
    ({ item }: { item: Spread }) => (
      <SpreadItem spread={item} width={width} height={height} />
    ),
    [width, height],
  );

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Spread>[] }) => {
      let first: Spread | undefined;
      let last: Spread | undefined;
      for (const { item } of viewableItems) {
        if (!first || item.firstIndex < first.firstIndex) {
          first = item;
        }
        if (!last || item.firstIndex > last.firstIndex) {
          last = item;
        }
      }
      // Until the list has moved to its opening spread, what is on screen
      // is the start of the chapter, not what is being read.
      if (!first || !last || !readyRef.current) {
        return;
      }
      onPageChange(first.firstIndex);
      prefetchPagesAfter(
        pagesRef.current,
        last.firstIndex + last.pages.length - 1,
      );
    },
    [onPageChange],
  );

  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.fill}>
        <Animated.View
          style={[
            styles.zoomed,
            { width, height },
            zoomStyle,
            !ready && styles.hidden,
          ]}
        >
          <ReaderScrollContext.Provider value={scrollContext}>
            <FlashList
              horizontal
              data={spreads}
              renderItem={renderItem}
              keyExtractor={spread => String(spread.firstIndex)}
              renderScrollComponent={ReaderScrollView}
              ref={listRef}
              onLoad={onLoad}
              viewabilityConfig={VIEWABILITY}
              onViewableItemsChanged={onViewableItemsChanged}
              // Paging steps by the list's full width, which is one spread
              // only when unzoomed. Zoomed, the list scrolls freely.
              pagingEnabled={zoom === MIN_ZOOM}
              drawDistance={width}
              // Every spread is exactly one screen, so there is nothing to
              // correct, and left on, moving back a spread jumped to the first.
              maintainVisibleContentPosition={{ disabled: true }}
              showsHorizontalScrollIndicator={false}
              // Zoomed, only the left 1/zoom of the list's viewport is on
              // screen. This lets the last spread scroll into that part.
              ListFooterComponent={
                <View style={{ width: width * (1 - 1 / zoom) }} />
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
    transformOrigin: 'top left',
  },
  hidden: {
    opacity: 0,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChapter } from '../api/queries';
import type { Page } from '../api/types';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import type { ScreenProps } from '../navigation/types';
import { cancelPendingPrefetches } from '../reader/prefetch';
import { ScrollReader } from '../reader/ScrollReader';
import { SpreadReader } from '../reader/SpreadReader';
import { colors } from '../theme';

type Size = { width: number; height: number };

function SpreadToggle({
  spread,
  onToggle,
}: {
  spread: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Double-page spread"
      accessibilityState={{ checked: spread }}
      hitSlop={8}
      onPress={onToggle}
      style={[styles.toggle, spread && styles.toggleOn]}
    >
      <Text style={[styles.toggleLabel, spread && styles.toggleLabelOn]}>
        📖
      </Text>
    </Pressable>
  );
}

function Reader({
  pages,
  navigation,
}: {
  pages: Page[];
  navigation: ScreenProps<'Reader'>['navigation'];
}) {
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current =>
      current?.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  // Spread follows the orientation: on in landscape, off in portrait. The
  // toggle overrides that until the next rotation.
  const landscape = size != null && size.width > size.height;
  const [mode, setMode] = useState({ landscape, spread: landscape });
  if (mode.landscape !== landscape) {
    setMode({ landscape, spread: landscape });
  }
  const { spread } = mode;

  useLayoutEffect(() => {
    navigation.setOptions({
      // The navigator takes a render function here, not a component.
      headerRight: () => (
        <SpreadToggle
          spread={spread}
          onToggle={() =>
            setMode(current => ({ ...current, spread: !current.spread }))
          }
        />
      ),
    });
  }, [navigation, spread]);

  // The page being read, so a mode switch or rotation reopens at it.
  const currentPage = useRef(0);
  const onPageChange = useCallback((index: number) => {
    currentPage.current = index;
  }, []);

  useEffect(() => cancelPendingPrefetches, []);

  // A spread is fitted to the screen, so it keeps clear of the system bars
  // and any display cutout. The scrolling reader runs underneath them.
  const insets = useSafeAreaInsets();
  const padding = spread
    ? {
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
      }
    : null;

  const ReaderMode = spread ? SpreadReader : ScrollReader;
  return (
    <View style={[styles.viewport, padding]} onLayout={onLayout}>
      {size && (
        <ReaderMode
          // Page sizes and scroll offsets all depend on the reader's size, so
          // a new size starts the reader again at the current page.
          key={`${size.width}x${size.height}`}
          pages={pages}
          width={size.width - (padding ? insets.left + insets.right : 0)}
          height={size.height - (padding ? insets.bottom : 0)}
          initialPage={currentPage.current}
          onPageChange={onPageChange}
        />
      )}
    </View>
  );
}

export function ReaderScreen({ route, navigation }: ScreenProps<'Reader'>) {
  const chapter = useChapter(route.params.chapterId);

  if (chapter.isPending) {
    return <LoadingView />;
  }
  if (!chapter.data) {
    return <ErrorView error={chapter.error} onRetry={chapter.refetch} />;
  }
  if (chapter.data.chapterPages.length === 0) {
    return <EmptyView message="This chapter has no pages." />;
  }
  return <Reader pages={chapter.data.chapterPages} navigation={navigation} />;
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  toggleLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleLabelOn: {
    color: colors.background,
  },
});

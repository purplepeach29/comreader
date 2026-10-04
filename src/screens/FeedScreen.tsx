import { memo, useCallback } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStories } from '../api/queries';
import type { StorySummary } from '../api/types';
import {
  EmptyView,
  ErrorView,
  ListFooter,
  LoadingView,
} from '../components/StateViews';
import type { ScreenProps } from '../navigation/types';
import { colors } from '../theme';

const MIN_CARD_WIDTH = 160;
const GUTTER = 6;

const StoryCard = memo(function ({
  story,
  onPress,
}: {
  story: StorySummary;
  onPress: (story: StorySummary) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={story.title}
      onPress={() => onPress(story)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={{ uri: story.thumbnailUrl }} style={styles.thumbnail} />
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.title}>
          {story.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {story.creators.join(', ')}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {story.chapterCount}{' '}
          {story.chapterCount === 1 ? 'chapter' : 'chapters'}
          {' · '}
          {story.views} views
        </Text>
      </View>
    </Pressable>
  );
});

export function FeedScreen({ navigation }: ScreenProps<'Feed'>) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stories = useStories();
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = stories;

  const usableWidth = width - insets.left - insets.right - GUTTER * 2;
  const numColumns = Math.max(2, Math.floor(usableWidth / MIN_CARD_WIDTH));

  const openStory = useCallback(
    (story: StorySummary) => navigation.navigate('Chapters', { story }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: StorySummary }) => (
      <StoryCard story={item} onPress={openStory} />
    ),
    [openStory],
  );

  // A failed page stops auto-loading until the user retries
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (stories.isPending) {
    return <LoadingView />;
  }
  if (!stories.data) {
    return <ErrorView error={stories.error} onRetry={stories.refetch} />;
  }
  if (stories.data.length === 0) {
    return <EmptyView message="No stories yet." />;
  }

  return (
    <FlashList
      // Changing the column count re-chunks every row.
      key={numColumns}
      data={stories.data}
      renderItem={renderItem}
      keyExtractor={story => story.storyId}
      numColumns={numColumns}
      onEndReached={loadMore}
      onEndReachedThreshold={1.5}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: GUTTER,
        paddingLeft: GUTTER + insets.left,
        paddingRight: GUTTER + insets.right,
        paddingBottom: insets.bottom,
      }}
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={stories.isRefetching && !isFetchingNextPage}
          onRefresh={() => {
            stories.refetch();
          }}
          tintColor={colors.accent}
        />
      }
      ListFooterComponent={
        <ListFooter
          loading={isFetchingNextPage}
          error={isFetchNextPageError ? stories.error : null}
          onRetry={fetchNextPage}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.background,
  },
  card: {
    flex: 1,
    margin: GUTTER,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
  },
  cardBody: {
    padding: 10,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 40,
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
});

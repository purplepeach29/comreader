import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChapters, useStory } from '../api/queries';
import type { ChapterSummary, StorySummary } from '../api/types';
import {
  EmptyView,
  ErrorView,
  ListFooter,
  LoadingView,
} from '../components/StateViews';
import type { ScreenProps } from '../navigation/types';
import { colors } from '../theme';

const STATUS_LABEL = {
  ONGOING: 'Ongoing',
  HIATUS: 'On hiatus',
  COMPLETED: 'Completed',
} as const;

function StoryHeader({ story }: { story: StorySummary }) {
  const detail = useStory(story.storyId).data;
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Image source={{ uri: story.thumbnailUrl }} style={styles.cover} />
        <View style={styles.headerText}>
          <Text style={styles.storyTitle}>{story.title}</Text>
          <Text style={styles.meta}>{story.creators.join(', ')}</Text>
          <Text style={styles.meta}>
            {detail ? `${STATUS_LABEL[detail.status]} · ` : ''}
            {story.views} views
          </Text>
        </View>
      </View>
      {detail?.description ? (
        <Text style={styles.description}>{detail.description}</Text>
      ) : null}
      <View style={styles.tags}>
        {story.tags.map(tag => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ChapterRow = memo(function ({
  chapter,
  onPress,
}: {
  chapter: ChapterSummary;
  onPress: (chapter: ChapterSummary) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(chapter)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={{ uri: chapter.thumbnailUrl }} style={styles.rowThumb} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>Chapter {chapter.chapterNum}</Text>
        <Text numberOfLines={2} style={styles.meta}>
          {chapter.description}
        </Text>
        <Text style={styles.meta}>
          {chapter.pageCount} pages · {chapter.views} views
        </Text>
      </View>
    </Pressable>
  );
});

export function ChapterListScreen({
  navigation,
  route,
}: ScreenProps<'Chapters'>) {
  const { story } = route.params;
  const insets = useSafeAreaInsets();
  const chapters = useChapters(story.storyId);
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = chapters;

  const openChapter = useCallback(
    (chapter: ChapterSummary) =>
      navigation.navigate('Reader', {
        chapterId: chapter.chapterId,
        chapterNum: chapter.chapterNum,
        type: chapter.type,
        storyTitle: story.title,
      }),
    [navigation, story.title],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChapterSummary }) => (
      <ChapterRow chapter={item} onPress={openChapter} />
    ),
    [openChapter],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (chapters.isPending) {
    return <LoadingView />;
  }
  if (!chapters.data) {
    return <ErrorView error={chapters.error} onRetry={chapters.refetch} />;
  }

  return (
    <FlashList
      data={chapters.data}
      renderItem={renderItem}
      keyExtractor={chapter => chapter.chapterId}
      onEndReached={loadMore}
      onEndReachedThreshold={1.5}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
      }}
      style={styles.list}
      ListHeaderComponent={<StoryHeader story={story} />}
      ListEmptyComponent={<EmptyView message="No chapters yet." />}
      ListFooterComponent={
        <ListFooter
          loading={isFetchingNextPage}
          error={isFetchNextPageError ? chapters.error : null}
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
  header: {
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    gap: 14,
  },
  cover: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  storyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  rowThumb: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

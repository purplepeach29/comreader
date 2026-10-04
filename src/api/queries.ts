import {
  QueryClient,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  ApiError,
  fetchChapter,
  fetchChapters,
  fetchStories,
  fetchStory,
} from './client';
import type { Paginated } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) =>
        failureCount < 2 && (!(error instanceof ApiError) || error.retryable),
    },
  },
});

// Cursor pagination can hand back an item twice if the feed shifts between
// requests, and a duplicate key breaks list recycling.
export function flattenUnique<T>(
  data: InfiniteData<Paginated<T>>,
  getId: (item: T) => string,
) {
  const seen = new Set<string>();
  const items: T[] = [];
  for (const { page } of data.pages) {
    for (const item of page) {
      const id = getId(item);
      if (!seen.has(id)) {
        seen.add(id);
        items.push(item);
      }
    }
  }
  return items;
}

const nextCursor = <T>(last: Paginated<T>) =>
  last.hasMore ? last.continueCursor : undefined;

export function useStories() {
  return useInfiniteQuery({
    queryKey: ['stories'],
    queryFn: ({ pageParam, signal }) => fetchStories(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: nextCursor,
    select: data => flattenUnique(data, story => story.storyId),
  });
}

export function useStory(storyId: string) {
  return useQuery({
    queryKey: ['story', storyId],
    queryFn: ({ signal }) => fetchStory(storyId, signal),
  });
}

export function useChapters(storyId: string) {
  return useInfiniteQuery({
    queryKey: ['chapters', storyId],
    queryFn: ({ pageParam, signal }) =>
      fetchChapters(storyId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: nextCursor,
    select: data => flattenUnique(data, chapter => chapter.chapterId),
  });
}

export function useChapter(chapterId: string) {
  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: ({ signal }) => fetchChapter(chapterId, signal),
  });
}

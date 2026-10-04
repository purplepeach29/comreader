import { API_BASE_URL } from '../config';
import type {
  ChapterDetail,
  ChapterSummary,
  Paginated,
  StoryDetail,
  StorySummary,
} from './types';

export type ApiErrorCode =
  | 'INVALID_LIMIT'
  | 'INVALID_CURSOR'
  | 'MISSING_PARAMETER'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL'
  // Client-side: the request never produced a usable response.
  | 'NETWORK';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  // Only failures that might succeed on a second attempt.
  get retryable() {
    return this.code === 'NETWORK' || this.code === 'INTERNAL';
  }
}

type Query = Record<string, string | number | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return API_BASE_URL + path + (params.length ? `?${params.join('&')}` : '');
}

async function get<T>(
  path: string,
  query?: Query,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    // Let React Query see cancellations as cancellations, not failures.
    if (signal?.aborted) {
      throw error;
    }
    throw new ApiError('NETWORK', null, 'Could not reach the server');
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('NETWORK', response.status, 'Unreadable response');
  }

  if (!response.ok) {
    throw new ApiError(
      body?.error?.code ?? 'INTERNAL',
      response.status,
      body?.error?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return body as T;
}

export const STORIES_PAGE_SIZE = 20;
export const CHAPTERS_PAGE_SIZE = 30;

export function fetchStories(cursor: string | null, signal?: AbortSignal) {
  return get<Paginated<StorySummary>>(
    '/stories',
    { limit: STORIES_PAGE_SIZE, cursor },
    signal,
  );
}

export function fetchStory(storyId: string, signal?: AbortSignal) {
  return get<StoryDetail>(
    `/stories/${encodeURIComponent(storyId)}`,
    undefined,
    signal,
  );
}

export function fetchChapters(
  storyId: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return get<Paginated<ChapterSummary>>(
    '/chapters',
    { story: storyId, limit: CHAPTERS_PAGE_SIZE, cursor },
    signal,
  );
}

export function fetchChapter(chapterId: string, signal?: AbortSignal) {
  return get<ChapterDetail>(
    `/chapters/${encodeURIComponent(chapterId)}`,
    undefined,
    signal,
  );
}

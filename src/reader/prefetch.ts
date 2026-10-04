import { Image } from 'react-native';
import type { Page } from '../api/types';

// picsum rate-limits bursts, so page downloads are spread out.
const MAX_CONCURRENT = 3;
// How many pages downloaded in advance.
const PREFETCH_AHEAD = 6;

const requested = new Set<string>();
const queue: string[] = [];
let active = 0;

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const url = queue.shift() as string;
    active++;
    Image.prefetch(url)
      // A failed download may be retried by a later request for the same page.
      .catch(() => requested.delete(url))
      .finally(() => {
        active--;
        pump();
      });
  }
}


export function prefetchImages(urls: string[]) {
  for (const url of urls) {
    if (!requested.has(url)) {
      requested.add(url);
      queue.push(url);
    }
  }
  pump();
}

export function prefetchPagesAfter(pages: Page[], lastVisible: number) {
  prefetchImages(
    pages
      .slice(lastVisible + 1, lastVisible + 1 + PREFETCH_AHEAD)
      .map(page => page.pageUrl),
  );
}

// Drops downloads that have not started, for when the reader closes.
export function cancelPendingPrefetches() {
  for (const url of queue) {
    requested.delete(url);
  }
  queue.length = 0;
}

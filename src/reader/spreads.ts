import type { Page } from '../api/types';

export type Spread = {
  pages: Page[];
  // Index of the spread's first page within the chapter.
  firstIndex: number;
};

function isWide([width, height]: Page['resolution']) {
  return width > height;
}

// Pairs pages in reading order, lower page number on the left. A page wider
// than it is tall already has a spread's shape, so it is shown alone, as is a
// page left without a partner.
export function buildSpreads(pages: Page[]): Spread[] {
  const spreads: Spread[] = [];
  let index = 0;
  while (index < pages.length) {
    const page = pages[index];
    const next = pages[index + 1];
    const paired =
      next != null && !isWide(page.resolution) && !isWide(next.resolution);
    spreads.push({ pages: paired ? [page, next] : [page], firstIndex: index });
    index += paired ? 2 : 1;
  }
  return spreads;
}

export function spreadIndexForPage(spreads: Spread[], pageIndex: number) {
  const index = spreads.findIndex(
    spread => spread.firstIndex + spread.pages.length > pageIndex,
  );
  return index === -1 ? Math.max(0, spreads.length - 1) : index;
}

// The widest a page can be drawn inside a box without changing its shape.
export function fitWidth(
  [width, height]: Page['resolution'],
  boxWidth: number,
  boxHeight: number,
) {
  return Math.min(boxWidth, (boxHeight * width) / height);
}

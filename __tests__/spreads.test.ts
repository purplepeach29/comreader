import type { Page } from '../src/api/types';
import {
  buildSpreads,
  fitWidth,
  spreadIndexForPage,
} from '../src/reader/spreads';

function page(pageNum: number, width = 800, height = 1200): Page {
  return {
    pageNum,
    pageUrl: `https://example.test/${pageNum}`,
    altText: `Page ${pageNum}`,
    resolution: [width, height],
  };
}

function pageNums(pages: Page[]) {
  return buildSpreads(pages).map(spread => spread.pages.map(p => p.pageNum));
}

test('pairs pages with the lower page number first', () => {
  expect(pageNums([page(1), page(2), page(3), page(4)])).toEqual([
    [1, 2],
    [3, 4],
  ]);
});

test('leaves the last page of an odd chapter alone', () => {
  expect(pageNums([page(1), page(2), page(3)])).toEqual([[1, 2], [3]]);
  expect(pageNums([page(1)])).toEqual([[1]]);
  expect(pageNums([])).toEqual([]);
});

test('shows a page wider than tall alone', () => {
  const pages = [page(1), page(2, 1200, 800), page(3), page(4), page(5)];
  expect(pageNums(pages)).toEqual([[1], [2], [3, 4], [5]]);
});

test('records where each spread starts in the chapter', () => {
  const pages = [page(1), page(2, 1200, 800), page(3), page(4)];
  expect(buildSpreads(pages).map(spread => spread.firstIndex)).toEqual([
    0, 1, 2,
  ]);
});

test('finds the spread holding a page', () => {
  const spreads = buildSpreads([page(1), page(2), page(3), page(4), page(5)]);
  expect(spreadIndexForPage(spreads, 0)).toBe(0);
  expect(spreadIndexForPage(spreads, 1)).toBe(0);
  expect(spreadIndexForPage(spreads, 2)).toBe(1);
  expect(spreadIndexForPage(spreads, 4)).toBe(2);
  expect(spreadIndexForPage(spreads, 99)).toBe(2);
  expect(spreadIndexForPage([], 0)).toBe(0);
});

test('fits a page inside a box without changing its shape', () => {
  // Limited by the box height.
  expect(fitWidth([800, 1200], 450, 300)).toBe(200);
  // Limited by the box width.
  expect(fitWidth([1200, 800], 450, 400)).toBe(450);
});

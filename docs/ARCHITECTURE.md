# Architecture

Bare React Native 0.87 with TypeScript.

## Screens and data

`App.tsx` mounts a native stack: Feed → Chapters → Reader.

`src/api/client.ts` is a small `fetch` wrapper. Every failure becomes an `ApiError` carrying the backend's `code`, and screens branch on the code, never the message. `src/api/queries.ts` wraps it in React Query hooks. The feed and the chapter list are cursor-paginated infinite queries, de-duplicated by id so a feed that shifts between requests cannot produce a duplicate list key. A failed next page stops auto-loading and shows a retry footer.

All lists are FlashList v2. A chapter's `type` exists only on the chapter list item, so it travels to the reader as a route parameter.

## Reader

`ReaderScreen` loads the chapter, measures its own area, and renders one of two readers from `src/reader/`:

- `ScrollReader`: one page per row, scrolling vertically.
- `SpreadReader`: `buildSpreads` pairs pages with the lower number on the left; a wide page or a leftover page stands alone. Each spread is one screen, paged sideways, and a tap near either edge scrolls by one spread.

Every page carries its resolution, so each slot is sized before its image arrives and nothing is measured. Type A and type B therefore share one code path. An image that fails, from rate limiting or the image host's 5000px limit, becomes a placeholder of the correct height with a retry. That state lives in `useRecyclingState`, because list cells are reused.

Spread mode follows the orientation, and the header toggle overrides it until the next rotation. The screen tracks the page being read. Each reader is keyed by its size, so a toggle or a rotation rebuilds it and `useOpenAtIndex` reopens it at that page.

## Zoom

`useReaderZoom` zooms the whole reader, not individual pages. The list sits inside a container that is scaled from its top-left corner:

```
screenX = shift + scale × layoutX
screenY = scale × (contentY − scrollY)
```

Movement along the reading direction stays the list's own native scroll, so no extra work runs per frame while scrolling zoomed. Pinch and double-tap come from Gesture Handler and change `scale` on the UI thread in Reanimated worklets. During a zoom, a reaction keeps the content under the fingers fixed by setting `shift` and calling `scrollTo` in the same frame. When zoomed, a pan gesture running alongside the scroll view moves `shift`.

React hears about a zoom level only when a gesture settles. It is then saved to MMKV, which is read synchronously, so a reopened reader draws its first frame already zoomed. There is one zoom value for the whole app, from 1× to 3×.

Zoomed, only the first 1/zoom of the list is on screen, so a footer of `viewport × (1 − 1/zoom)` lets the chapter's end scroll into view.

The spread reader uses the same hook with the two axes swapped. Paging is on at 1× and off while zoomed.

<!-- Instructions for running 
Start Docker Desktop, then bring the backend back up:

cd ../app-assignment-companion && docker compose up -d && cd ../comreader

Forward the backend port to the phone:
npm run android:ports

Start the bundler in one terminal
npx react-native run-android  -->

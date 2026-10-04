# Edge cases

## Handled

### Feed and chapter list

- The same story or chapter returned on two pages of a cursor: de-duplicated by id, so list keys stay unique.
- A next page that fails to load: auto-loading stops and the list footer shows a retry, so a dead backend is not hit on every scroll.
- A first load that fails: a full-screen message with a retry. "Could not reach the server" and "no longer available" are told apart by the error `code`.
- An empty feed: a message, not a blank screen.
- A request still in flight when its screen closes: cancelled, and not reported as a failure.
- Rotation on the feed: the column count is recomputed from the width.

### Vertical reader

- A page image that fails (rate limiting, timeout): a placeholder at the page's correct height with a retry, so the pages below do not move.
- The 349 pages taller than the image host's 5000px limit: they can never load from the URL given, and show the same placeholder.
- A recycled list cell: a page's failed state is reset when the cell is reused for another page.
- A chapter with no pages: a message.
- Leaving the reader: image downloads that have not started are dropped.

### Zoom

- A saved zoom is applied before the first frame, and opens centred.
- A missing or unreadable saved zoom: falls back to 1×.
- A pinch that ends within 2% of 1×: settles on exactly 1×.
- Zoomed in at the end of a chapter: the last page can still be scrolled fully into view.
- A pinch that starts during a double-tap animation: the pinch takes over.

### Spread mode

- A chapter with an odd number of pages: the last page is shown alone, centred.
- A page wider than it is tall (about 13% of type B pages): shown alone and not squeezed into half the screen. The page before it is then also shown alone.
- Type B pages of different heights in one spread: each is fitted to its half of the screen from its `resolution`, so nothing is measured or shifts when images load.
- A tap on the first or last spread's outer edge: stays where it is.
- The first tap of a double-tap zoom near an edge: does not turn the page.
- A swipe that starts near an edge: turns one spread, not two.
- Zoomed in: the list scrolls freely across spreads, an edge tap goes to the start of the next spread, and a back tap first returns to the start of the current one. Zooming back to 1× snaps to the nearest spread.
- System bars and display cutout: a spread is fitted inside them, in both orientations.

### Switching mode and rotating

- Rotating to landscape turns spread on, and to portrait turns it off. The header toggle overrides this until the next rotation.
- The page being read is kept across a toggle or a rotation, in both directions. Going from vertical to spread opens the spread that holds the page at the top of the screen.
- Zoom is the same value in both modes.

## Not handled

- Offline reading: nothing loads without the backend, apart from images already in the system image cache.
- A failed page's "Try again" button that falls inside an edge-tap zone (the outer 20% of the width): the tap retries and also turns the page. This happens in portrait spread mode, where a page is narrow.
- Very tall type B pages in spread mode: a 783×3883 page fitted to the screen height is about a third of the screen wide and hard to read without zooming. Spread mode suits type A.
- Rotating or toggling restores the page, not the position within it: a tall page reopens at its top.
- Right-to-left system languages: untested. The spread row and the sideways list may be mirrored, which would put the lower page number on the right.
- A pinch whose fingers move along the scroll direction (up and down in the vertical reader, sideways in spread mode) may scroll instead of zoom. 
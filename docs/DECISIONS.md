# Decision notes


## A over B

### 1. Global zoom over per-story zoom

Chose: one zoom value for the whole app.

Why: the brief says zoom survives chapter change and app kill. One value is also the simplest state to persist and restore before the first frame.

What would flip it: readers wanting different zoom for different comics, for example a dense type A manga and a wide type B strip. The data makes this plausible, since page widths range from 600 to 1200 and 97 of 100 stories mix both types.

### 2. Failed-page placeholder over rewriting image URLs 

Context: picsum rejects any dimension above 5000px with HTTP 400. 349 pages across 195 type B chapters are taller than that (up to 5961px) and can never load from the URL the API returns.

Chose: show a placeholder at the page's correct height (known from `resolution`) with a retry, the same state used for rate-limited or timed-out images.

Rejected: rewriting the URL to a scaled-down size with the same aspect ratio, for example 1194×5961 to 1001×5000. It would make the pages load, but the app would be parsing the image host's URL format, which only works because the host happens to be picsum.

What would flip it: [to confirm] the API documenting a size parameter or returning multiple renditions per page, so requesting a smaller image is part of the contract and not a guess about the host.

### 3. Spread zoom by scaling the list over a separate zoomable pager 

Context: spread mode scrolls sideways one spread per screen, and the zoom has to apply to the whole reader there too.

Chose: the same design as the vertical reader with the two axes swapped. The list sits in a scaled container, sideways movement stays the list's native scroll, and a pan gesture moves the container up and down. Paging is on at 1× and off while zoomed, so a zoomed spread scrolls freely into the next one; zooming back out snaps to the nearest spread.

Rejected: a pager that holds only the current spread and its neighbours in a container panned and scaled entirely by gestures. It would keep a zoomed swipe inside one spread, but it is a second zoom implementation with its own edge rules, and sideways movement would no longer be native scrolling.

What would flip it: wanting a zoomed swipe to stop at the edge of the spread and need a second swipe to turn the page, as most manga readers do. Free scrolling cannot do that.

## Tried and did not work

### 1. FlashList's `initialScrollIndex` for reopening at the current page 

Tried: when the reader is rebuilt for a mode switch or a rotation, pass the current page as `initialScrollIndex`.

What happened: on the phone, switching from spread to vertical at page 13 of a 32-page type A chapter opened at page 19. FlashList 2.3.3 has no way to be told item sizes, so it places the opening item from guessed sizes for the items before it (200 at first, then a running average). When the guesses were replaced by real sizes, the list was scrolled to the new position and its scroll correction also moved it by the same amount: the logged offset was 6035 (correct) and the list ended at about 9366. Opening at page 11 happened to work, so it depends on timing.

Now: the list opens at the top, hidden, and is scrolled to the page with `scrollToIndex` once its first items are measured, then shown (`src/reader/useOpenAtIndex.ts`). Checked on the phone at pages 11, 13 and 23 in both directions and across rotation.

Related: in the sideways spread list, FlashList's default `maintainVisibleContentPosition` made every move back a spread jump to the first spread. Every spread is exactly one screen wide, so it is turned off for that list.

### 2. A two-finger pan to make the pinch beat the scroll

Suspected problem: the pinch gesture only activates once the fingers have spread by about three times the touch slop, while the list starts scrolling after one. A pinch whose fingers move along the scroll direction could therefore scroll instead of zoom. Scripted pinches of that kind did scroll; scripted pinches across the scroll direction zoomed.

Tried: a pan gesture needing two fingers and no distance, running alongside the pinch, to claim any two-finger touch before the list could.

What happened: with scripted pinches it did not stop the scroll, and the pinch that had worked no longer activated. Reverted.


## Scroll FPS

Measured 2026-10-04 at 3× zoom, the maximum, in the vertical reader.

| | Type A | Type B |
|---|---|---|
| Chapter | Shoot Vassal Conduit, chapter 1 (954×1249 pages) | Shoot Vassal Conduit, chapter 2 (783 wide, 631 to 3883 tall) |
| Average FPS while scrolling | 120.0 | 120.0 |
| Frames rendered | 1,570 | 1,577 |
| Janky frames | 8 (0.51%) | 5 (0.32%) |
| Frame time, 50th / 90th / 95th / 99th percentile | 5 / 7 / 7 / 9 ms | 5 / 7 / 7 / 9 ms |
| Missed vsync | 0 | 0 |

Device: Samsung Galaxy A36 5G (SM-A366U1, Snapdragon 6 Gen 3), Android 16, 1080×2340 display at 120 Hz, so a frame has 8.33 ms.

Build: release (`./gradlew :app:assembleRelease`, arm64-v8a, Hermes), not debuggable, installed over USB.

Method: `scripts/scroll-fps.py`. It runs `adb shell dumpsys gfxinfo com.comreader reset`, then ten upward flings with `adb shell input swipe 540 1900 540 500 300`, 1.6 s apart, and reads `adb shell dumpsys gfxinfo com.comreader framestats` after each. The rows in the table other than FPS are gfxinfo's own totals over every frame of the run. FPS is the number of frames divided by the time between them, over the 1,200 frames framestats retained (the last 120 of each fling), skipping the pauses between flings. No gap between two frames was longer than 1.5 frame intervals in either run.

Zoom: confirmed as 3.00× before and after the runs, by reading a page's on-screen height in spread mode (608 px at 1×, 1,824 px measured). Zoom was set with a scripted two-finger pinch (`adb shell monkey` with a `PinchZoom` script).

Limits: the phone was on USB power. Ten flings at 3× cover few pages (pages 1 to 7 of the type A chapter, 10 to 14 of type B), and some of those images were already in the image cache from earlier runs. Spread mode was not measured.



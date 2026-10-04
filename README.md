# ComReader

A comic reader written in bare React Native 0.87 (no Expo) with TypeScript. It is the frontend only and talks to the companion backend.

## What is implemented

| Component | Weight | Status |
|---|---|---|
| Story feed with infinite scroll → chapter list → vertical reader, for type A and type B comics | 30% | Done |
| Double-page spread: header toggle, swipe or edge-tap to move sideways, switches automatically on rotation | 30% | Done |
| Pinch zoom applied to the whole reader, kept across chapters and after the app is killed | 40% | Done |

Zoom runs from 1× to 3×. Scrolling at 3× measured 120 FPS on a Samsung Galaxy A36 5G in a release build; the method and full numbers are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Where to find each deliverable

| The brief asks for | File |
|---|---|
| Architecture write-up | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Edge cases handled and not handled | [docs/EDGE_CASES.md](docs/EDGE_CASES.md) |
| Three decisions of A over B, and what would flip each | [docs/DECISIONS.md](docs/DECISIONS.md) |
| One thing tried that did not work | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Scroll FPS at maximum zoom, with device and method | [docs/DECISIONS.md](docs/DECISIONS.md), script in [scripts/scroll-fps.py](scripts/scroll-fps.py) |

## Running it

You need Node 22.11 or later, Docker, and the usual [React Native Android setup](https://reactnative.dev/docs/set-up-your-environment) with a phone or emulator visible to `adb`.

1. Start the backend from the [companion repo](https://github.com/titin-fanon/app-assignment-companion):

   ```sh
   docker compose up -d
   ```

2. Install dependencies in this repo:

   ```sh
   npm install
   ```

3. Forward the backend's port to the device. Rerun this whenever the device reconnects.

   ```sh
   npm run android:ports
   ```

4. Start the bundler in one terminal:

   ```sh
   npm start
   ```

5. Build and install the app from a second terminal:

   ```sh
   npm run android
   ```

The app calls `http://localhost:3001`, which step 3 routes to the host machine. To run over Wi-Fi with no USB cable, set `LAN_HOST` in [src/config.ts](src/config.ts) to the host's LAN address instead.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm test
```

## Code layout

- `App.tsx`: providers and the navigation stack (Feed → Chapters → Reader).
- `src/api/`: the fetch wrapper, React Query hooks and response types.
- `src/screens/`: one file per screen.
- `src/reader/`: the vertical and spread readers, the zoom hook, zoom persistence and image prefetching.
- `__tests__/`: Jest tests for the API client, spread pairing and the zoom store.

[Apk link](https://drive.google.com/file/d/16WD-ZYwLWTLwO4BAjcrsw7A7LRTf0gr0/view?usp=share_link)
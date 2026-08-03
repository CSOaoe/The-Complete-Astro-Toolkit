# AstroToolkit

AstroToolkit is a cross-platform React Native app for planning astrophotography sessions, browsing deep-sky targets, calculating framing, tracking imaging projects and organising equipment. It runs with Expo on Android and iPhone and stores all user data locally.

The Tonight screen can use foreground device location or manually entered observing-site coordinates. Target altitude and the best imaging window are calculated from each target's right ascension and declination, the observer's latitude/longitude, and local date/time. Location is never tracked in the background or sent to a backend.

## Requirements

- Node.js 22.13 or later (required by Expo SDK 57)
- npm
- Expo Go on a physical Android or iPhone, or an Android/iOS simulator

## Install and run

```bash
npm install
npm start
```

Scan the QR code with Expo Go. The development server also offers shortcuts for supported local simulators.

### Android

Start an Android emulator or connect a device with Expo Go, then run:

```bash
npm run android
```

### iPhone

On macOS, start an iOS Simulator and run:

```bash
npm run ios
```

On Windows or Linux, run `npm start` and scan the QR code with Expo Go on an iPhone connected to the same network. Native iOS simulator builds require macOS/Xcode.

## Quality checks

```bash
npm run typecheck
npm test
npm run lint
```

## Project structure

```text
src/
  app/                  Expo Router routes, tab screens and detail screens
    (tabs)/             Tonight, Catalogue, Calculate, Journal, Equipment
    catalogue/[id].tsx  Typed target detail route
    location.tsx        Device/manual observing-site setup
    about.tsx           About/settings modal
  components/           Reusable UI and template components
  context/              Local application data provider
  data/                 Deep-sky catalogue and sample records
  theme/                Colours, spacing and radii
  types/                Domain data models
  utils/                Pure calculations and unit tests
```

## Architecture

Expo Router provides file-based navigation with one root stack and a five-tab navigator. Screens use a small design system built from reusable `Screen`, `Card`, `Button`, `Input`, `EmptyState`, `SectionHeader` and `StatusBadge` components.

`AppDataProvider` owns journal projects, equipment, imaging rigs, favourites and the observing location. It hydrates data from AsyncStorage at startup, exposes typed mutation functions and persists every change locally. There is no backend, account or subscription layer.

Calculation functions are pure and kept outside the UI. This makes the field-of-view, pixel-scale, integration-time, target-altitude and Moon-phase formulas independently testable with Vitest. Forms validate required and numeric fields before updating state.

## Included sample data

- 20 real deep-sky catalogue entries with coordinates and imaging guidance
- Five sample targets on the Tonight screen
- One sample journal project
- A sample telescope, camera, filter and imaging rig

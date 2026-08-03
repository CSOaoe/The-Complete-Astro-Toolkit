# AstroToolkit

AstroToolkit is a cross-platform React Native app for planning astrophotography sessions, browsing 53,900+ deep-sky and comet targets, calculating framing and exposure, checking Moon distance and weather, following PixInsight workflows, tracking sessions and organising equipment. It runs with Expo on Android and iPhone, keeps catalogue data offline, and supports optional Supabase cloud sync.

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
    astro-flight.tsx    Native Fly Through Your AstroData composer
    location.tsx        Device/manual observing-site setup
    about.tsx           About/settings modal
  components/           Reusable UI and template components
  context/              Local application data provider
  data/                 Deep-sky and JPL comet catalogues plus sample records
  theme/                Colours, spacing and radii
  types/                Domain data models
  utils/                Pure calculations and unit tests
```

## Architecture

Expo Router provides file-based navigation with one root stack and a five-tab navigator. Screens use a small design system built from reusable `Screen`, `Card`, `Button`, `Input`, `EmptyState`, `SectionHeader` and `StatusBadge` components.

`AppDataProvider` owns journal projects, equipment, imaging rigs, favourites, observing location and session history. It hydrates data from AsyncStorage at startup, exposes typed mutation functions and persists every change locally. Optional Supabase sync stores one user-owned JSON backup protected by Row Level Security.

Calculation functions are pure and kept outside the UI. This makes the field-of-view, pixel-scale, integration-time, target-altitude and Moon-phase formulas independently testable with Vitest. Forms validate required and numeric fields before updating state.

## Included sample data

- 50,000 real deep-sky catalogue entries from the HYG DSO database, including 20 enhanced imaging guides
- 3,899 non-fragment comet records generated from NASA/JPL SBDB orbital data
- Five sample targets on the Tonight screen
- One sample journal project
- A sample telescope, camera, filter and imaging rig

## Expanded planning tools

- Astro Flight two-layer composer with animated framing, warp, rotation and camera-drift preview
- Visual sensor framing over real DSS2 sky-survey imagery, with catalogue-wide target search and camera rotation
- Time-dependent comet coordinates calculated from JPL orbital elements
- Moon-to-target angular separation using Astronomy Engine ephemerides
- Physics-based subexposure and total-frame calculator
- Location-aware 24-hour cloud, humidity, wind, seeing and transparency forecast
- Date-based imaging planner and completed session history
- Decision-based PixInsight workflow assistant
- Persistent favourite-target view

## Optional cloud sync

Copy `.env.example` to `.env.local` and provide a Supabase project URL and publishable anonymous key. Create this table:

```sql
create table astrotoolkit_backups (
  user_id uuid primary key references auth.users,
  payload jsonb not null,
  updated_at timestamptz not null
);

alter table astrotoolkit_backups enable row level security;
create policy "Users read own backup" on astrotoolkit_backups for select using (auth.uid() = user_id);
create policy "Users create own backup" on astrotoolkit_backups for insert with check (auth.uid() = user_id);
create policy "Users update own backup" on astrotoolkit_backups for update using (auth.uid() = user_id);
```

Without these variables the Cloud Sync screen explains setup and every other feature remains available locally.

## Data attribution

The generated 50,000-object deep-sky catalogue is adapted from the HYG DSO database and is licensed CC BY-SA 2.5. Comet orbital data comes from NASA/JPL SBDB. Online target and framing images are coordinate-based DSS2 survey cutouts served by CDS Aladin; an archival survey field may not contain a moving comet. Weather is provided by Open-Meteo (CC BY 4.0), with 7Timer astronomical forecast data where available. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

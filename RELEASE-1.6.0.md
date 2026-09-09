# AstroToolkit 1.6.0

Android version code 9; Expo SDK 57. Existing custom launcher/adaptive icon retained.

## New and improved

- Plan my night: rig-aware capture blocks with local-horizon, darkness and forecast checks, explanations, estimated exposure counts and batch save to the Imaging planner.
- Visual framing workspace: persistent pan, pinch magnification, two-finger camera rotation, undo/redo, saved compositions, manual previous-image overlay and transfers to mosaics, sessions and observatory pointing.
- Forecast confidence: download age, cache/stale warnings, explicit seeing-model versus weather-estimate labels, and recorded actual conditions with forecast comparisons.
- Phone/tablet layouts: side-by-side workspaces on larger screens, collapsible controls, favourite and recent tools alongside the alphabetical tool list.
- Portable JSON backup/restore: validation, category preview, typed confirmation and a recovery snapshot before replacing stored data. No account required.
- Comet tracking: observer-specific JPL Horizons positions, sampled motion across the rig frame, and pixel-based trailing estimates.
- Optional ASCOM Alpaca dashboard: read telescope/camera/focuser status; explicit hardware connection and mount-slew confirmation; site, horizon and Sun checks; stop-motion command.

## Verification and limits

Automated tests cover forecast parsing, backup validation, composition coordinates, comet ephemerides, night scheduling and mocked Alpaca requests, in addition to the existing regression suite. Android/web production export and Expo compatibility checks are part of release validation. Browser smoke checks verify image loading, pan coordinates and undo.

Physical Android/tablet multitouch and real observatory equipment have not been tested. Always supervise mount motion; software checks cannot detect physical collisions, cables or a misconfigured mount. The previous-image overlay is a manual visual reference, not automatic plate registration. Survey images are archival, not live comet photographs. Forecast freshness measures download time, not model issue time. JPL and weather features require reachable external services; cached forecasts are explicitly marked.

Backups do not contain downloaded offline image packs or local image files. Export and keep a backup before replacing data. Existing dependency advisories are not a claim of an audit-clean dependency tree.

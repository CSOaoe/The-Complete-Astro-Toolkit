# Third-party data and services

## HYG deep-sky database

`src/data/catalogue.generated.json` is an adapted 50,000-object subset of David Nash's HYG deep-sky database. The source database is licensed under [Creative Commons Attribution-ShareAlike 2.5](https://creativecommons.org/licenses/by-sa/2.5/). The adapted catalogue file is distributed under the same licence. Source: <https://github.com/astronexus/HYG-Database/blob/main/misc/dso.csv>.

## NASA/JPL Small-Body Database

`src/data/comets.generated.json` contains comet designations and orbital elements retrieved from the [NASA/JPL Small-Body Database Query API](https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html). Current app coordinates are approximate two-body calculations from those elements and should be confirmed against a precise ephemeris before observing.

## CDS Aladin DSS2 imagery

Target detail and visual-framing backgrounds use coordinate-based colour DSS2 cutouts served by the [CDS Aladin HiPS image service](https://aladin.cds.unistra.fr/hips/). These archival survey images require an internet connection. For moving comets, the cutout is centred on the calculated current coordinates but the historical survey exposure may not show the comet itself.

## Open-Meteo

Weather forecasts are supplied by [Open-Meteo](https://open-meteo.com/) under CC BY 4.0. Open-Meteo combines forecasts from national weather services. See its documentation for model attribution.

## 7Timer

Astronomical seeing and transparency forecasts use the [7Timer Astro API](https://www.7timer.info/doc.php?lang=en) when available.

## Astronomy Engine

Moon ephemeris calculations use [Astronomy Engine](https://github.com/cosinekitty/astronomy), distributed under the MIT licence.

## Astrometry.net

The optional Plate Solving screen uploads a user-selected image to the [Nova Astrometry.net API](https://astrometry.net/doc/net/api.html). The app requests that uploads are private, not modifiable and not available for commercial reuse. Users supply their own API key, which is retained only in the active screen's memory.

## Monthly guide references

The August 2026 guide is an original app-oriented rewrite based on the user's [Cosmic Captures guide](https://www.cosmiccaptures.com/august2026guide). Eclipse facts were checked against [NASA eclipse catalogues](https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html) and [Timeanddate](https://www.timeanddate.com/eclipse/lunar/2026-august-28); meteor timing was checked against the [International Meteor Organization 2026 calendar](https://imo.net/files/meteor-shower/cal2026.pdf).

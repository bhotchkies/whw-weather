# WHW Weather · Troop 600

Hourly weather and midge forecast for the West Highland Way, 31 July – 8 August 2026.
Built to work with no mobile signal.

**Live:** https://bhotchkies.github.io/whw-weather/

---

## Install it before you leave

This is a web page that behaves like an app. **It must be opened once on wifi
before the trip** — that is when it saves itself to the phone. A phone that has
never opened it will show nothing on Rannoch Moor.

### iPhone / iPad

Works in Safari or Chrome — both use the same Share-button flow, since iOS
requires every browser to run on the same engine underneath. Safari is the
one guaranteed to work on any iOS version; Chrome supports it from iOS 17.

1. Open the link in Safari or Chrome.
2. Tap the **Share** button (square with an arrow — bottom center in Safari,
   in the address bar in Chrome).
3. Scroll down, tap **Add to Home Screen**.
4. Tap **Add**.
5. Open it once from the home screen icon so it caches.

### Android

1. Open the link in **Chrome**.
2. Tap the **⋮** menu, top right.
3. Tap the install option — wording varies by phone: **Install and create
   shortcut**, **Install app**, or **Add to Home screen**. Same result here.
4. Open it once from the home screen icon so it caches.

---

## How to read it

**The bar at the top is the most important thing on the screen.** It says how old
the data is. Green is fresh, amber is a few hours old, red means stale — the
forecast on screen may be a day out of date. It never hides.

- **Numbers along the top** are the days. Today is outlined; tap any day.
- Each day shows three places: where you **start**, where you stop **midway**,
  and where you sleep **tonight**.
- **Rain** is shown as a hatched block — light hatch is drizzle, dense is rain,
  cross-hatch is heavy. The percentage is the chance of it happening.
- **Midges** are little bug icons, one to five. Five is Extreme.
- **Dashed boxes** mark exposed ground with no shelter — Conic Hill, Rannoch
  Moor, the Devil's Staircase, the Lairig Mor. They show the numbers for roughly
  when the group will be there. They do not tell you what to do.
- Days marked **outlook** are beyond the high-resolution forecast range. Treat
  them as a rough steer, not a plan.
- **Moon** button switches to the deeper shirt-khaki palette; **Sun** switches
  back. High contrast is the default because it is the one that stays readable
  in sun and rain.
- **Refresh** forces an update when you spot a bar of signal. It spins and reads
  "Updating" while it works, then flashes "Updated ✓". If it can't reach the
  network it says so and offers **Retry**, while still showing how old your data
  is — that number matters more than the failed attempt.
- The little **hill icon** next to a place name gets you a distance. It takes
  one GPS fix, works with **no signal at all**, and switches your phone's GPS
  straight back off afterward — nothing runs in the background between taps.
  The number shown the rest of the time is whatever that last tap found,
  labeled with how long ago it was taken.
- The **Map** button in that same popup opens an offline map with the trail
  drawn on it. It needs a one-time download (see below) but no signal at all
  after that. Off the trail, it draws a dashed line to the nearest point and
  says so — it's a straight line, not a route, so check the ground before
  following it.

Temperatures are °F with °C beside them. Wind is mph, with gusts marked `g`.
Rain is mm. All times are UK time, including for anyone watching from home.

---

## How it works

- **Weather:** [Open-Meteo](https://open-meteo.com), no API key. The UK Met
  Office `ukmo_seamless` model supplies temperature, wind and rainfall for the
  first ~6 days; `best_match` supplies rain probability throughout and fills the
  days beyond UKMO's range.
- **Midges:** computed locally in the browser. See [MIDGE_MODEL.md](MIDGE_MODEL.md).
- **Offline:** a service worker caches the page; forecast data is kept in
  `localStorage` with its timestamp. The network is always tried first, with an
  8-second timeout, and it falls back to the last good data.
- **Distance:** the West Highland Way route, distilled from a public GPX track
  into a small on-device polyline (`route.js`). A tap snaps your GPS fix onto
  it and reports miles and feet of climb to go — no network involved. Ascent
  is scaled to match the planning doc's per-day figures, since raw GPS
  elevation is noisy; the printed mileage is always the doc's, live distance is
  the only thing GPS drives.
- **Offline map:** a real basemap ([MapLibre](https://maplibre.org) + a
  [Protomaps](https://protomaps.com) extract of OpenStreetMap data, © OpenStreetMap
  contributors, ODbL) covering a corridor either side of the trail plus a
  coarser view of the wider area, so panning off the corridor never shows a
  blank screen. It's a **convenience, not a safety device** — the group
  carries a Garmin for genuine emergencies — and it never polls your location:
  one fix per tap, same as the distance popup, no background tracking. The
  whole thing (map data, plus the small map-drawing library itself) is a
  one-time ~12 MB download, opt-in, kept in the phone's own storage rather
  than the app's regular cache so it doesn't inflate anyone else's first load.
- A full refresh is about **110 KB** compressed — 16 days, hourly, for all 16
  locations, plus 15-minute precipitation for the next 48 hours. Roughly a third
  of a photo, so refreshing often costs almost nothing.

There is deliberately **no baked-in fallback forecast**. A web app cannot be
installed without a network connection in the first place, so a first launch
always has connectivity to fetch live data — a committed snapshot would have
been dead weight in every phone's cache.

### Files

| File | Purpose |
|---|---|
| `index.html` | Shell and styling |
| `app.js` | Fetch, cache, render |
| `itinerary.js` | Route, stops, times — from the Daily tab of the planning doc |
| `midge.js` | Midge index |
| `geo.js` | GPS fix, trail snapping, pace and unit formatting |
| `route.js` | Generated trail polyline — see `tools/build_route.js` |
| `map.js` | Offline map: IndexedDB store, download manager, MapLibre wiring |
| `map_style.js` | The map's visual style |
| `map/` | Vendored MapLibre + pmtiles.js, glyphs, and the two generated `.pmtiles` archives — see `tools/build_map.js` |
| `sw.js` | Offline cache |

---

Weather data by Open-Meteo. The midge index is a weather proxy and cannot see
sheltered pockets — it will be wrong in exactly the damp, still corners where
midges are worst. Carry the head net.

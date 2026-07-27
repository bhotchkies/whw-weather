# WHW Weather · Troop 600

Hourly weather and midge forecast for the West Highland Way, 31 July – 8 August 2026.
Built to work with no mobile signal.

**Live:** https://bhotchkies.github.io/whw-weather/

---

## Install it before you leave

This is a web page that behaves like an app. **It must be opened once on wifi
before the trip** — that is when it saves itself to the phone. A phone that has
never opened it will show nothing on Rannoch Moor.

### iPhone / iPad — must use Safari

Chrome on iOS cannot install web apps. Use Safari.

1. Open the link in **Safari**.
2. Tap the **Share** button (square with an arrow, bottom centre).
3. Scroll down, tap **Add to Home Screen**.
4. Tap **Add**.
5. Open it once from the home screen icon so it caches.

### Android

1. Open the link in **Chrome**.
2. Tap the **⋮** menu, top right.
3. Tap **Add to Home screen** (or **Install app** if offered).
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
- **Midges** are thistles, one to five. Five is Extreme.
- **Dashed boxes** mark exposed ground with no shelter — Conic Hill, Rannoch
  Moor, the Devil's Staircase, the Lairig Mor. They show the numbers for roughly
  when the group will be there. They do not tell you what to do.
- Days marked **outlook** are beyond the high-resolution forecast range. Treat
  them as a rough steer, not a plan.
- **Sun** button raises the contrast for bright light. **Refresh** forces an
  update when you spot a bar of signal.

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
- A full refresh is about **29 KB** compressed, so refreshing often costs
  almost nothing.

### Files

| File | Purpose |
|---|---|
| `index.html` | Shell and styling |
| `app.js` | Fetch, cache, render |
| `itinerary.js` | Route, stops, times — from the Daily tab of the planning doc |
| `midge.js` | Midge index |
| `sw.js` | Offline cache |
| `snapshot.json` | Forecast baked in at deploy time, so a fresh install shows something |

### Re-baking the snapshot before departure

Worth doing on 29–30 July so a late install has current data:

```bash
python bake_snapshot.py
```

Then commit and push.

---

Weather data by Open-Meteo. The midge index is a weather proxy and cannot see
sheltered pockets — it will be wrong in exactly the damp, still corners where
midges are worst. Carry the head net.

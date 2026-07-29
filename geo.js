// Trail distance and pace from GPS. Kept separate from app.js on purpose: this
// is the only file allowed to touch navigator.geolocation, so nothing in the
// render path can ever request a fix by accident.
//
// Design constraints (see the trail-distance plan for the full reasoning):
// - One-shot fixes only. Never watchPosition — that is the fast way to arrive
//   at Kinlochleven with a dead phone.
// - Everything displayed is miles and feet. Meters exist only inside the maths
//   here; nothing metric should reach app.js's templates.
// - Off-trail distance is always answerable (straight line + trail distance),
//   never withheld.

import { ROUTE, ROUTE_STRIDE, ROUTE_ANCHORS } from './route.js';

const FIX_KEY = 'whw.fix';
const M_PER_MILE = 1609.344;
const FT_PER_M = 3.28084;

// Below this, an off-trail reading is GPS noise (accuracy + a few strides at a
// stile or a viewpoint), not a meaningful detour. Above it, the detour is real
// and gets shown as its own line.
const OFF_TRAIL_NOISE_MI = 0.25;

// Beyond this, snap()'s "nearest point on the trail" stops being trustworthy —
// the local flat-earth projection it uses is only valid within a few hundred
// km of Scotland, so a fix from actually testing the app at home (or a wild
// GPS jump) can snap to an arbitrary point on the line rather than a genuinely
// nearby one. No real hiking detour comes anywhere close to this — the
// biggest known village detour (Balmaha) is under a mile.
const OFF_TRAIL_MAX_MI = 5;

// A pace outside this range is a bad fix (GPS jump) or a data-entry problem,
// not a Scout troop's actual walking speed. Fall back to the planned pace.
const PACE_MIN_MPH = 0.5;
const PACE_MAX_MPH = 4.0;

// How far a fix has to sit from the day's baseline before it counts as "we
// actually left" rather than "still standing around at breakfast".
const REBASE_MI = 0.25;

// ------------------------------------------------------------------- units
//
// All display goes through these three. Nothing metric should reach a template.

export function milesStr(mi) {
  if (mi == null) return '—';
  if (mi < 0.25) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

export function feetStr(ft) {
  if (ft == null) return '—';
  return `${Math.round(ft).toLocaleString('en-US')} ft`;
}

// Fix accuracy is always small enough to read as feet.
export function accuracyStr(accM) {
  if (accM == null) return '—';
  return `±${Math.round(accM * FT_PER_M)} ft`;
}

// ------------------------------------------------------------------- snapping

// Nearest point on the simplified route polyline to (lat, lon), by perpendicular
// distance to each segment — the same projection and maths as the build step,
// just against the already-simplified ROUTE rather than the raw GPX.
const DEG = Math.PI / 180;
const EARTH_R = 6371000;
const MID_LAT = 56.4;
const KX = EARTH_R * DEG * Math.cos(MID_LAT * DEG);
const KY = EARTH_R * DEG;
const project = (lat, lon) => [lon * KX, lat * KY];

function pointAt(i) {
  const o = i * ROUTE_STRIDE;
  return {
    lat: ROUTE[o], lon: ROUTE[o + 1], mi: ROUTE[o + 2],
    ascFt: ROUTE[o + 3], eleFt: ROUTE[o + 4],
  };
}

const routeLen = ROUTE.length / ROUTE_STRIDE;

// Returns the trail position nearest a GPS fix: cumulative miles and ascent
// along the trail at that point, plus how far off the trail (in meters) the
// fix itself was. The route is a simple out-and-back-free line with strictly
// increasing mileage, so a plain scan over ~1,200 points is all this needs —
// no spatial index, comfortably sub-millisecond.
export function snap(lat, lon) {
  const [px, py] = project(lat, lon);
  let best = Infinity;
  let bestMi = 0;
  let bestAscFt = 0;
  let bestNearLat = lat;
  let bestNearLon = lon;

  for (let i = 0; i < routeLen - 1; i++) {
    const a = pointAt(i);
    const b = pointAt(i + 1);
    const [ax, ay] = project(a.lat, a.lon);
    const [bx, by] = project(b.lat, b.lon);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let u = lenSq ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    u = Math.max(0, Math.min(1, u));
    const cx = ax + u * dx;
    const cy = ay + u * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) {
      best = d;
      bestMi = a.mi + (b.mi - a.mi) * u;
      bestAscFt = a.ascFt + (b.ascFt - a.ascFt) * u;
      // The interpolated point ITSELF, in lat/lon — not projected back from
      // (cx, cy), which would reintroduce the local projection's own small
      // error. Interpolating lat/lon directly is exact given a and b are
      // already real coordinates.
      bestNearLat = a.lat + (b.lat - a.lat) * u;
      bestNearLon = a.lon + (b.lon - a.lon) * u;
    }
  }
  return { mi: bestMi, ascFt: bestAscFt, offM: best, nearLat: bestNearLat, nearLon: bestNearLon };
}

// ---------------------------------------------------------------- elevation
//
// Height above sea level, as opposed to ascFt above it, which is cumulative
// climb and only ever increases. These two are easy to confuse and produce
// very different pictures: plotting ascFt gives a staircase that never comes
// back down.

// Height at an arbitrary trail mile, interpolated between the two route points
// either side of it. Clamped at both ends rather than returning null, so a fix
// snapped fractionally past the last point still answers.
export function elevationAt(mi) {
  if (mi <= ROUTE[2]) return pointAt(0).eleFt;
  const last = pointAt(routeLen - 1);
  if (mi >= last.mi) return last.eleFt;
  for (let i = 0; i < routeLen - 1; i++) {
    const a = pointAt(i);
    const b = pointAt(i + 1);
    if (mi >= a.mi && mi <= b.mi) {
      const span = b.mi - a.mi;
      const u = span > 0 ? (mi - a.mi) / span : 0;
      return a.eleFt + (b.eleFt - a.eleFt) * u;
    }
  }
  return last.eleFt;
}

// The elevation profile between two trail miles, as { mi, eleFt } samples.
//
// Both endpoints are interpolated exactly rather than snapped to the nearest
// route point, so the drawn area closes flush against the plot's left and
// right edges instead of starting wherever a point happens to fall just
// inside. At this route's resolution a leg holds 104-236 points, which is
// already under one point per pixel at the popup's width — no decimation.
export function profileFor(startMi, endMi) {
  if (!(endMi > startMi)) return [];
  const out = [{ mi: startMi, eleFt: elevationAt(startMi) }];
  for (let i = 0; i < routeLen; i++) {
    const p = pointAt(i);
    if (p.mi > startMi && p.mi < endMi) out.push({ mi: p.mi, eleFt: p.eleFt });
  }
  out.push({ mi: endMi, eleFt: elevationAt(endMi) });
  return out;
}

// The trail position of an itinerary stop — { mi, ascFt } — or null for stops
// that are not on the trail at all (Glasgow Airport on the travel days).
export function anchor(locId) {
  return ROUTE_ANCHORS[locId] ?? null;
}

export function anchorMile(locId) {
  return anchor(locId)?.mi ?? null;
}

// ------------------------------------------------------------- off-trail math

// Distance to a destination, split into the off-trail hop (straight-line,
// since the GPS fix's own offset from the trail says nothing about what's in
// between) and the on-trail distance from there. Below the noise floor the
// off-trail leg is dropped entirely rather than shown as a fake precision.
//
// `mi` may come out negative when the destination is behind you (already
// passed it) — callers are expected to handle that themselves.
export function distanceTo(fix, targetLocId) {
  const anchor = anchorMile(targetLocId);
  if (anchor == null) return null;
  // Beyond OFF_TRAIL_MAX_MI the additive model breaks down: a huge off-trail
  // leg can swamp a negative on-trail leg (destination "behind" the snapped
  // point) and produce a nonsense positive total instead of tripping the
  // "passed" check. Rather than trust the maths at that range, say so.
  if (fix.offM > OFF_TRAIL_MAX_MI * M_PER_MILE) return { tooFar: true };
  const offTrailMi = fix.offM > OFF_TRAIL_NOISE_MI * M_PER_MILE
    ? fix.offM / M_PER_MILE
    : 0;
  const onTrailMi = anchor - fix.mi;
  return { offTrailMi, onTrailMi, totalMi: offTrailMi + onTrailMi, tooFar: false };
}

// Ascent remaining to a point on today's leg, scaled from the GPX profile's
// *shape* onto the planning doc's authoritative total for the whole leg. The
// smoothed GPX profile is only accurate to within ~3.5% for the whole route;
// per leg it has been seen off by over 40% (GPS elevation noise does not
// average out evenly over a shorter distance). Scaling means the number
// always reconciles with the figure already printed on the day card, and the
// profile only decides what fraction of it sits between here and the target.
//
// `dayFromAscFt`/`dayToAscFt` are the GPX ascent at the leg's official start
// and end (day.from / day.to) — the normalizing span. `targetAscFt` defaults
// to the leg's end, so calling with just the leg bounds gives "climb left to
// tonight's stop"; passing a third point's ascFt (e.g. Midway) gives "climb
// left to lunch" using the same leg-wide scale.
export function ascentRemaining(day, fix, dayFromAscFt, dayToAscFt, targetAscFt = dayToAscFt) {
  if (!day.ascent || dayFromAscFt == null || dayToAscFt == null || targetAscFt == null) return null;
  const legTotal = dayToAscFt - dayFromAscFt;
  if (legTotal <= 0) return null;
  const legRemaining = targetAscFt - fix.ascFt;
  const fraction = Math.max(0, Math.min(1, legRemaining / legTotal));
  return day.ascent * fraction;
}

// ------------------------------------------------------------------ fix cache
//
// One cache entry per day, holding the pace baseline and the latest fix. Not a
// history — just enough to answer "how far" and "how fast" for today.

function readCache() {
  try {
    const s = localStorage.getItem(FIX_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function writeCache(cache) {
  try { localStorage.setItem(FIX_KEY, JSON.stringify(cache)); }
  catch { /* quota — the fix just won't survive a reload */ }
}

// Returns the cache for `date`, or null if there is none yet or it belongs to
// a different day (a new day always starts with a clean baseline).
export function getFix(date) {
  const c = readCache();
  return c && c.date === date ? c : null;
}

// Records a new GPS fix for `date`. `fix` is the raw result of locate()
// ({ lat, lon, accM, t }); `snapped` is snap(fix.lat, fix.lon).
//
// Baseline rebase logic: while unconfirmed, a new fix within REBASE_MI of the
// current baseline replaces it outright — this is what discards a pre-departure
// tap taken while still standing at breakfast. The first fix that lands
// REBASE_MI or further from the baseline confirms it *at that fix* — the
// moment movement is first detected becomes the pace baseline for the rest of
// the day, per Blair's call on 2026-07-28.
export function recordFix(date, fix, snapped) {
  let cache = getFix(date);
  const point = { mi: snapped.mi, t: fix.t };

  if (!cache) {
    cache = { date, base: { ...point, confirmed: false }, last: null };
  } else if (!cache.base.confirmed) {
    const moved = Math.abs(point.mi - cache.base.mi) >= REBASE_MI;
    cache.base = { ...point, confirmed: moved };
  }

  // lat/lon of the raw fix, plus the nearest point ON the trail, are kept
  // alongside the trail-relative numbers — the distance popup only ever
  // needs mi/ascFt/offM, but the map (real coordinates, drawn on real ground)
  // needs the actual fix and, when off-trail, where to draw the recovery
  // line to, without re-snapping later.
  cache.last = {
    mi: snapped.mi, ascFt: snapped.ascFt, offM: snapped.offM,
    lat: fix.lat, lon: fix.lon,
    nearLat: snapped.nearLat, nearLon: snapped.nearLon,
    accM: fix.accM, t: fix.t,
  };
  writeCache(cache);
  return cache;
}

// ---------------------------------------------------------------------- pace

// Measured pace from the day's confirmed baseline to the latest fix, including
// any time spent stopped — deliberately, since the rest of the day will
// include breaks too and a moving-average pace would promise an arrival the
// group is not actually going to make.
//
// Falls back to the day's planned pace when there is no confirmed baseline yet,
// the two fixes are too close together to measure meaningfully, or the result
// falls outside a plausible walking speed (a bad GPS fix, not a fast Scout).
export function paceEstimate(day, cache) {
  const planned = day.miles && day.estHigh ? day.miles / day.estHigh : null;
  const plannedResult = { mph: planned, source: 'planned', sinceT: null };
  if (!planned) return null;
  if (!cache?.base?.confirmed || !cache.last) return plannedResult;

  const elapsedH = (cache.last.t - cache.base.t) / 3_600_000;
  const coveredMi = cache.last.mi - cache.base.mi;
  if (elapsedH < 1 / 60 || coveredMi <= 0) return plannedResult;

  const mph = coveredMi / elapsedH;
  if (mph < PACE_MIN_MPH || mph > PACE_MAX_MPH) return plannedResult;

  return { mph, source: 'measured', sinceT: cache.base.t };
}

// ---------------------------------------------------------------------- ETA

// hoursFromNow, given a distance still to cover and a pace estimate.
export function etaHours(remainingMi, pace) {
  if (!pace || remainingMi == null || remainingMi <= 0) return null;
  return remainingMi / pace.mph;
}

// ------------------------------------------------------------------- locate

// ?lat=&lon= pins the fix for testing, exactly like app.js's ?now= pins the
// clock — a real link anyone can tap instead of needing devtools. Optional
// ?acc= sets the reported accuracy in feet (default 30). Ignored unless both
// lat and lon are present and numeric, so a stray ?lat= alone can't half-work.
const LOCATE_OVERRIDE = (() => {
  if (typeof location === 'undefined') return null; // no DOM (e.g. Node-based testing)
  const p = new URLSearchParams(location.search);
  // has() first: Number(null) is 0, not NaN, so a plain isFinite check alone
  // would treat an absent ?lat=/?lon= as a real fix at Null Island (0,0) and
  // silently skip real GPS on every load that doesn't set them.
  if (!p.has('lat') || !p.has('lon')) return null;
  const lat = Number(p.get('lat'));
  const lon = Number(p.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // Number(null) is 0, not NaN — has() is checked explicitly so an absent
  // ?acc= falls back to the default rather than reporting zero-error GPS.
  const accFt = p.has('acc') ? Number(p.get('acc')) : NaN;
  return { lat, lon, accM: (Number.isFinite(accFt) ? accFt : 30) / FT_PER_M };
})();

// One geolocation fix. Rejects on permission denial, timeout, or any other
// PositionError — callers decide how to surface that (the popup shows a plain
// "couldn't get a fix" rather than a raw error code).
//
// enableHighAccuracy is correct here specifically *because* this is one-shot:
// the battery cost of GPS is a function of how long it stays on, not how
// precise the fix is, and a single high-accuracy read is done in seconds.
export function locate() {
  if (LOCATE_OVERRIDE) return Promise.resolve({ ...LOCATE_OVERRIDE, t: Date.now() });
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accM: pos.coords.accuracy,
        t: Date.now(),
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

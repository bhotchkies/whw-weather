// Turns the West Highland Way GPX track into route.js — the polyline the app
// snaps a GPS fix onto to answer "how much further".
//
// Run by hand, output committed:   node tools/build_route.js
//
// This is a build tool, not shipped code. It is the only place the 800 KB GPX
// is ever read; the browser only ever sees the ~30 KB result.

const fs = require('fs');
const path = require('path');

const GPX = path.join(__dirname, 'west_highland_way.gpx');
const OUT = path.join(__dirname, '..', 'route.js');

const M_PER_MILE = 1609.344;
const FT_PER_M = 3.28084;

// Elevation smoothing. Raw GPS elevation jitters by a metre or two between
// consecutive points, and summing every positive step counts that jitter as
// climbing: the raw track totals 28,097 ft against the planning doc's 11,641.
// An 11-point moving average plus a 5 m threshold brings the whole-route total
// to within 3.5% of the doc. Per leg it is still unreliable — see the note on
// scaling in the plan — so this profile is used for shape, not magnitude.
const SMOOTH_HALF_WINDOW = 5;
const ASCENT_THRESHOLD_M = 5;

// Ramer-Douglas-Peucker tolerance. 10 m keeps the line within a GPS fix's own
// accuracy while cutting the point count by 87%.
const SIMPLIFY_TOLERANCE_M = 10;

// A stop further than this from the trail gets flagged for review. Villages are
// legitimately off the trail; a trailside landmark that trips this is a typo.
const ANCHOR_WARN_M = 300;

// ------------------------------------------------------------------- geometry

const DEG = Math.PI / 180;
const EARTH_R = 6371000;

// Everything here happens inside one Scottish glen's worth of latitude, so a
// local equirectangular projection is accurate to well under a metre and makes
// the perpendicular-distance maths plain arithmetic.
const MID_LAT = 56.4;
const KX = EARTH_R * DEG * Math.cos(MID_LAT * DEG);
const KY = EARTH_R * DEG;

const project = (lat, lon) => [lon * KX, lat * KY];

function metresBetween(a, b) {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const meanLat = ((a.lat + b.lat) / 2) * DEG;
  return EARTH_R * Math.hypot(dLat, dLon * Math.cos(meanLat));
}

// Perpendicular distance from p to the segment a-b, clamped to the segment.
function distToSegment(p, a, b) {
  const [px, py] = project(p.lat, p.lon);
  const [ax, ay] = project(a.lat, a.lon);
  const [bx, by] = project(b.lat, b.lon);
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (!lenSq) return Math.hypot(px - ax, py - ay);
  let u = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

// ----------------------------------------------------------------- gpx to raw

function readTrack() {
  const xml = fs.readFileSync(GPX, 'utf8');
  const re = /<trkpt lat="([-\d.]+)" lon="([-\d.]+)">\s*<ele>([-\d.]+)<\/ele>/g;
  const pts = [];
  for (const m of xml.matchAll(re)) {
    pts.push({ lat: Number(m[1]), lon: Number(m[2]), ele: Number(m[3]) });
  }
  if (pts.length < 1000) {
    throw new Error(`only ${pts.length} track points parsed — check the GPX format`);
  }
  return pts;
}

// Cumulative miles and cumulative ascent at FULL resolution. This has to happen
// before simplification: simplifying first and re-measuring shortens the route
// by 1.2 mi, because every removed point removes a little real distance.
function measure(pts) {
  const smoothed = pts.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -SMOOTH_HALF_WINDOW; k <= SMOOTH_HALF_WINDOW; k++) {
      const j = i + k;
      if (j >= 0 && j < pts.length) { sum += pts[j].ele; n++; }
    }
    return sum / n;
  });

  let metres = 0;
  let ascent = 0;
  let ref = smoothed[0];
  pts[0].mi = 0;
  pts[0].ascFt = 0;

  for (let i = 1; i < pts.length; i++) {
    metres += metresBetween(pts[i - 1], pts[i]);
    const rise = smoothed[i] - ref;
    // Only commit a climb once it clears the noise floor; reset the reference
    // on a matching descent so a long downhill does not bank phantom ascent.
    if (rise > ASCENT_THRESHOLD_M) { ascent += rise; ref = smoothed[i]; }
    else if (rise < -ASCENT_THRESHOLD_M) { ref = smoothed[i]; }
    pts[i].mi = metres / M_PER_MILE;
    pts[i].ascFt = ascent * FT_PER_M;
  }
  return pts;
}

// -------------------------------------------------------------- simplification

// Iterative Ramer-Douglas-Peucker. Written with an explicit stack rather than
// recursion because 9,531 points can nest deep enough to matter.
function simplify(pts, tolerance) {
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;

  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distToSegment(pts[i], pts[first], pts[last]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxIdx !== -1 && maxDist > tolerance) {
      keep[maxIdx] = 1;
      stack.push([first, maxIdx], [maxIdx, last]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// ------------------------------------------------------------------- anchors

// The trail mile nearest a stop. For a village this is the point at which you
// turn off the trail toward it, which is the number you actually want.
function anchorFor(pts, lat, lon) {
  const target = { lat, lon };
  let best = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < pts.length; i++) {
    const d = metresBetween(target, pts[i]);
    if (d < best) { best = d; bestIdx = i; }
  }
  return { mi: pts[bestIdx].mi, ascFt: pts[bestIdx].ascFt, offM: best };
}

// ---------------------------------------------------------------------- output

function emit(simplified, anchors, total) {
  const flat = [];
  for (const p of simplified) {
    flat.push(p.lat.toFixed(5), p.lon.toFixed(5), p.mi.toFixed(4), Math.round(p.ascFt));
  }

  // Four numbers per point: latitude, longitude, cumulative miles, cumulative
  // ascent in feet. A flat array rather than objects purely for size — 1,166
  // points of {lat,lon,mi,ascFt} costs three times as much to ship.
  const rows = [];
  for (let i = 0; i < flat.length; i += 4 * 8) {
    rows.push('  ' + flat.slice(i, i + 4 * 8).join(','));
  }

  const anchorLines = Object.entries(anchors)
    .map(([id, a]) => `  ${id}: { mi: ${a.mi.toFixed(4)}, ascFt: ${Math.round(a.ascFt)} },`)
    .join('\n');

  return `// GENERATED by tools/build_route.js — do not edit by hand.
// Source: West Highland Way track, AllTrails, ${simplified.length} points after
// simplification. Cumulative distance and ascent were measured at full
// resolution before simplifying, so these values carry no simplification error.
//
// Total route: ${total.mi.toFixed(2)} mi, ${Math.round(total.ascFt).toLocaleString('en-US')} ft of smoothed ascent.

// Flat quadruples: latitude, longitude, cumulative miles, cumulative ascent (ft).
export const ROUTE_STRIDE = 4;
export const ROUTE = [
${rows.join(',\n')},
];

export const ROUTE_MILES = ${total.mi.toFixed(4)};

// Trail mile and cumulative ascent (ft) of each itinerary stop. For villages
// off the trail this is the point at which you leave the trail for them, not
// the village itself.
export const ROUTE_ANCHORS = {
${anchorLines}
};
`;
}

// ------------------------------------------------------------------------ main

async function main() {
  const { LOCATIONS, DAYS } = await import('../itinerary.js');

  const raw = measure(readTrack());
  const total = { mi: raw[raw.length - 1].mi, ascFt: raw[raw.length - 1].ascFt };
  const simplified = simplify(raw, SIMPLIFY_TOLERANCE_M);

  // Glasgow Airport is a trip location, not a trail location — travel days
  // start and end there, but it is 11 km from the nearest trail point, which
  // is close enough that a naive threshold would still anchor it (wrongly) to
  // mile 0. Exclude it by id rather than by distance.
  const NOT_ON_TRAIL = new Set(['glasgow']);

  const anchors = {};
  for (const loc of LOCATIONS) {
    if (NOT_ON_TRAIL.has(loc.id)) continue;
    anchors[loc.id] = anchorFor(raw, loc.lat, loc.lon);
  }

  fs.writeFileSync(OUT, emit(simplified, anchors, total));

  // ---- review table ----------------------------------------------------
  console.log(`\ntrack points   ${raw.length} -> ${simplified.length} after ${SIMPLIFY_TOLERANCE_M} m simplify`);
  console.log(`route length   ${total.mi.toFixed(2)} mi`);
  console.log(`smoothed climb ${Math.round(total.ascFt).toLocaleString('en-US')} ft\n`);

  console.log('stop            mile    off trail');
  let previousMi = -1;
  let outOfOrder = false;
  const warnings = [];
  for (const loc of LOCATIONS) {
    const a = anchors[loc.id];
    if (!a) { console.log(`${loc.id.padEnd(14)}   —    not on the trail`); continue; }
    if (a.mi < previousMi) outOfOrder = true;
    previousMi = a.mi;
    const flag = a.offM > ANCHOR_WARN_M ? '  <-- review' : '';
    if (flag) warnings.push(loc.id);
    console.log(`${loc.id.padEnd(14)} ${a.mi.toFixed(2).padStart(6)}  ${String(Math.round(a.offM)).padStart(5)} m${flag}`);
  }

  console.log('\nleg                          gpx mi   doc mi    gpx ft   doc ft');
  for (const day of DAYS) {
    if (day.travelDay || !day.miles) continue;
    const from = anchors[day.from];
    const to = anchors[day.to];
    if (!from || !to) continue;
    const label = `${day.label} ${day.from}>${day.to}`;
    console.log(
      `${label.padEnd(28)} ${(to.mi - from.mi).toFixed(2).padStart(6)} ${String(day.miles).padStart(8)}`
      + ` ${String(Math.round(to.ascFt - from.ascFt)).padStart(9)} ${String(day.ascent).padStart(8)}`
    );
  }

  console.log(`\nwrote ${path.relative(process.cwd(), OUT)}`
    + ` (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
  if (outOfOrder) console.log('WARNING: anchors are not in trail order — snapping picked a wrong point.');
  if (warnings.length) console.log(`REVIEW: more than ${ANCHOR_WARN_M} m off the trail — ${warnings.join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

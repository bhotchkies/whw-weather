// West Highland Way weather + midge tracker.
// Live-first, cache-as-fallback: every load tries the network, and falls back to
// the last good response when there is no signal. Nothing here needs an API key.

import { LOCATIONS, LOC, DAYS, PRONUNCIATIONS, PRONOUNCE_BY_ID } from './itinerary.js';
import { midgeScore, midgeBand } from './midge.js';

const CACHE_KEY = 'whw.forecast.v2';
const REFRESH_THROTTLE_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const FLASH_MS = 1800;

// Rain tiers, in mm per hour. The headline windows use RAIN; DRIZZLE is shown
// but reads as damp rather than as a reason to stop and put shells on.
const DRIZZLE_MM = 0.1;
const RAIN_MM = 0.5;
const TZ = 'Europe/London';

// UKMO seamless is the model we act on; best_match supplies rain probability
// everywhere and fills the days beyond UKMO's ~6 day horizon.
const PRIMARY = 'ukmo_seamless';
const FALLBACK = 'best_match';

const HOURLY_VARS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'precipitation', 'precipitation_probability', 'cloud_cover',
  'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
  'shortwave_radiation', 'is_day',
];

function apiUrl() {
  const p = new URLSearchParams({
    latitude: LOCATIONS.map((l) => l.lat).join(','),
    longitude: LOCATIONS.map((l) => l.lon).join(','),
    hourly: HOURLY_VARS.join(','),
    // 15-minute precipitation powers glance mode. Available ~48h ahead, which is
    // exactly the window you can act on. Costs ~13 KB gzipped for all locations.
    minutely_15: 'precipitation',
    forecast_minutely_15: '192',
    daily: 'sunrise,sunset',
    models: `${PRIMARY},${FALLBACK}`,
    timezone: TZ,
    wind_speed_unit: 'mph',
    forecast_days: '16',
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

// ---------------------------------------------------------------- data access

// Prefer the primary model, fall back to best_match, and report which was used
// so far-out days can be labelled as outlook rather than forecast.
function pick(block, base, i) {
  const a = block[`${base}_${PRIMARY}`];
  if (a && a[i] != null) return { v: a[i], outlook: false };
  const b = block[`${base}_${FALLBACK}`];
  if (b && b[i] != null) return { v: b[i], outlook: true };
  return { v: null, outlook: true };
}

function fracHour(iso) {
  return Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60;
}

// Flatten one location's response into hour records keyed by ISO date.
function buildHours(entry) {
  const H = entry.hourly;
  const D = entry.daily;

  const sun = {};
  D.time.forEach((d, i) => {
    const sr = D[`sunrise_${PRIMARY}`]?.[i] ?? D[`sunrise_${FALLBACK}`]?.[i];
    const ss = D[`sunset_${PRIMARY}`]?.[i] ?? D[`sunset_${FALLBACK}`]?.[i];
    if (sr && ss) sun[d] = { sunrise: fracHour(sr), sunset: fracHour(ss) };
  });

  const byDate = {};
  H.time.forEach((iso, i) => {
    const date = iso.slice(0, 10);
    const hour = Number(iso.slice(11, 13));
    const s = sun[date] ?? { sunrise: 5.2, sunset: 21.5 };

    const tempC = pick(H, 'temperature_2m', i);
    const wind = pick(H, 'wind_speed_10m', i);
    if (tempC.v == null && wind.v == null) return;

    const rec = {
      iso, hour, date,
      tempC: tempC.v,
      feelsC: pick(H, 'apparent_temperature', i).v,
      humidity: pick(H, 'relative_humidity_2m', i).v,
      rainMm: pick(H, 'precipitation', i).v ?? 0,
      // Probability only exists on best_match, so read it directly.
      rainProb: H[`precipitation_probability_${FALLBACK}`]?.[i] ?? null,
      cloud: pick(H, 'cloud_cover', i).v,
      windMph: wind.v,
      gustMph: pick(H, 'wind_gusts_10m', i).v,
      windDir: pick(H, 'wind_direction_10m', i).v,
      radiation: pick(H, 'shortwave_radiation', i).v ?? 0,
      isDay: pick(H, 'is_day', i).v === 1,
      outlook: tempC.outlook,
      sunrise: s.sunrise,
      sunset: s.sunset,
    };
    rec.midge = midgeScore(rec, rec.hour, s.sunrise, s.sunset, date);
    (byDate[date] ||= []).push(rec);
  });
  return byDate;
}

// 15-minute precipitation is a SUM over the preceding quarter hour, not a rate,
// so the hourly mm/h thresholds are divided by four.
const SLOT_DRIZZLE_MM = DRIZZLE_MM / 4;
const SLOT_RAIN_MM = RAIN_MM / 4;

function buildQuarters(entry) {
  const M = entry.minutely_15;
  if (!M?.time) return [];
  const key = `precipitation_${PRIMARY}`;
  const alt = `precipitation_${FALLBACK}`;
  const a = M[key], b = M[alt];
  return M.time.map((iso, i) => {
    const mm = (a && a[i] != null) ? a[i] : (b ? b[i] : null);
    return {
      iso,
      date: iso.slice(0, 10),
      // Fractional hour of day, so 14:15 becomes 14.25.
      at: Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60,
      mm: mm ?? 0,
      tier: mm == null ? 0 : mm >= SLOT_RAIN_MM ? 2 : mm >= SLOT_DRIZZLE_MM ? 1 : 0,
    };
  });
}

let MODEL = null; // { fetchedAt, byLocation: {id: {date: [hours]}}, quarters: {id: [...]} }

function normalise(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const byLocation = {};
  const quarters = {};
  list.forEach((entry, i) => {
    const id = LOCATIONS[i]?.id;
    if (!id) return;
    byLocation[id] = buildHours(entry);
    quarters[id] = buildQuarters(entry);
  });
  return { byLocation, quarters };
}

function loadCache() {
  try {
    const s = localStorage.getItem(CACHE_KEY);
    if (!s) return null;
    const o = JSON.parse(s);
    return { fetchedAt: o.fetchedAt, ...normalise(o.raw) };
  } catch { return null; }
}

function saveCache(raw) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), raw }));
  } catch { /* quota — keep running on the in-memory copy */ }
}

let lastAttempt = 0;
let inFlight = false;

async function refresh({ force = false } = {}) {
  if (inFlight) return;
  if (!force && Date.now() - lastAttempt < REFRESH_THROTTLE_MS) return;
  if (!navigator.onLine && !force) { render(); return; }

  inFlight = true;
  lastAttempt = Date.now();
  netState = 'fetching';
  renderStatus();

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl(), { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    saveCache(raw);
    MODEL = { fetchedAt: Date.now(), ...normalise(raw) };
    netState = 'idle';
    // Hold a visible confirmation briefly, otherwise a fast refresh looks
    // identical to nothing having happened.
    flashUntil = Date.now() + FLASH_MS;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(renderStatus, FLASH_MS + 100);
    render();
  } catch (e) {
    netState = 'failed';
    render();
  } finally {
    clearTimeout(timer);
    inFlight = false;
  }
}

// ------------------------------------------------------------------ formatting

const f = (c) => (c == null ? null : Math.round(c * 9 / 5 + 32));

function temp(c) {
  if (c == null) return '<span class="na">—</span>';
  return `<span class="t-f">${f(c)}°</span><span class="t-c">${Math.round(c)}C</span>`;
}

// Times are stored as 24h and only converted for display, so the arrival and
// exposed-window arithmetic never has to parse an AM/PM string back out.
function ampm(h) {
  const total = Math.round(h * 60);
  const H = Math.floor(total / 60) % 24;
  const M = total % 60;
  const suffix = H < 12 ? 'AM' : 'PM';
  const h12 = H % 12 || 12;
  return M ? `${h12}:${String(M).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

// Convert an "HH:MM" field from the itinerary for display.
function clock(hhmmStr) {
  const [H, M] = hhmmStr.split(':').map(Number);
  return ampm(H + M / 60);
}

function rainTier(mm) {
  if (mm == null) return 0;
  if (mm >= 2.0) return 3;
  if (mm >= RAIN_MM) return 2;
  if (mm >= DRIZZLE_MM) return 1;
  return 0;
}

// Collapse consecutive hours into runs of the same tier.
function rainWindows(hours) {
  const runs = [];
  let cur = null;
  for (const h of hours) {
    const t = rainTier(h.rainMm);
    if (cur && cur.tier === t) { cur.end = h.hour + 1; cur.max = Math.max(cur.max, h.rainMm); cur.probs.push(h.rainProb); }
    else { if (cur) runs.push(cur); cur = { tier: t, start: h.hour, end: h.hour + 1, max: h.rainMm, probs: [h.rainProb] }; }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.tier > 0);
}

function avgProb(probs) {
  const v = probs.filter((p) => p != null);
  if (!v.length) return null;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

const TIER_WORD = ['dry', 'drizzle', 'rain', 'heavy rain'];

// One plain-English line, led by rain transitions because that is the decision.
function verdict(hours) {
  if (!hours.length) return 'Not yet forecast.';
  const wins = rainWindows(hours);
  const parts = [];

  if (!wins.length) {
    parts.push('Dry throughout');
  } else {
    const real = wins.filter((w) => w.tier >= 2);
    const src = real.length ? real : wins;
    parts.push(src.slice(0, 2).map((w) => {
      const p = avgProb(w.probs);
      return `${TIER_WORD[w.tier]} ${ampm(w.start)}–${ampm(w.end)}${p != null ? ` (${p}%)` : ''}`;
    }).join(', '));
  }

  const gust = Math.max(...hours.map((h) => h.gustMph ?? 0));
  if (gust >= 30) parts.push(`gusts to ${Math.round(gust)} mph`);

  const peakMidge = Math.max(...hours.map((h) => h.midge ?? 0));
  parts.push(`midges peak ${peakMidge}/10`);

  return parts.join(' · ');
}

// ------------------------------------------------------------------- rendering

// Top-down beetle silhouette: oval body (fills solid when "on") with a centre
// dorsal split line and three pairs of short leg-stubs. Earlier attempts drew
// a head-and-limbs figure that reliably read as a stick person rather than a
// bug — a vertical body with two limb-pairs branching outward at "shoulder"
// and "hip" height is exactly the schema people parse as humanoid, no matter
// how the individual strokes are angled. A rounded top-down shape with short
// legs tucked close to the body breaks that reading entirely.
const midgeGlyph = (filled) => `<svg class="mg ${filled ? 'on' : 'off'}" viewBox="0 0 12 16" aria-hidden="true">
<path d="M6 1.5C8 1.5 9 3.5 9 6L9 11C9 13.5 8 14.5 6 14.5C4 14.5 3 13.5 3 11L3 6C3 3.5 4 1.5 6 1.5Z"/>
<path d="M6 2.3L6 14.2M3 5L1.7 4.5M9 5L10.3 4.5M3 8.3L1.6 8.3M9 8.3L10.4 8.3M3 11.6L1.7 12.1M9 11.6L10.3 12.1"/></svg>`;

function midgeCell(score) {
  if (score == null) return '<span class="na">—</span>';
  const { level, label } = midgeBand(score);
  const pips = [1, 2, 3, 4, 5].map((i) => midgeGlyph(i <= level)).join('');
  return `<span class="midge" title="${label} ${score}/10">${pips}</span>`;
}

function rainCell(h) {
  const t = rainTier(h.rainMm);
  if (!t) return '<span class="na">·</span>';
  const p = h.rainProb != null ? `<i>${h.rainProb}%</i>` : '';
  return `<span class="rain r${t}"><b></b>${h.rainMm.toFixed(1)}${p}</span>`;
}

function hourRows(hours) {
  if (!hours.length) return '<p class="none">Not yet forecast — beyond model range.</p>';
  return `<table class="hrs"><thead><tr>
      <th>Hr</th><th>Temp</th><th>Rain</th><th>Wind</th><th>Midge</th>
    </tr></thead><tbody>${hours.map((h) => {
      const gust = h.gustMph != null && h.gustMph - (h.windMph ?? 0) > 8
        ? `<i>g${Math.round(h.gustMph)}</i>` : '';
      // The "now" badge is always in the markup and revealed by CSS, so marking
      // the current hour is a class toggle and never needs a re-render.
      return `<tr data-date="${h.date}" data-hour="${h.hour}">
        <td class="hr">${h.hour % 12 || 12}<span class="ap">${h.hour < 12 ? 'am' : 'pm'}</span><span class="nowtag">now</span></td>
        <td>${temp(h.tempC)}</td>
        <td>${rainCell(h)}</td>
        <td class="wind">${h.windMph == null ? '—' : Math.round(h.windMph)}${gust}</td>
        <td>${midgeCell(h.midge)}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

function slice(byDate, date, from, to) {
  const hours = byDate?.[date] ?? [];
  return hours.filter((h) => h.hour >= from && h.hour <= to);
}

// Small muted respelling after a place name, only where one exists.
function pronounced(locId) {
  const p = PRONOUNCE_BY_ID[locId];
  return p ? ` <span class="pron">${p}</span>` : '';
}

function block(role, locId, date, from, to, extra = '') {
  const loc = LOC[locId];
  const hours = slice(MODEL?.byLocation?.[locId], date, from, to);
  const outlook = hours.length && hours.every((h) => h.outlook);
  return `<section class="blk${outlook ? ' outlook' : ''}">
    <h3><span class="role">${role}</span> ${loc.name}${pronounced(locId)}
      ${outlook ? '<em class="tag">outlook</em>' : ''}</h3>
    <p class="verdict">${verdict(hours)}</p>
    ${extra}
    ${hourRows(hours)}
  </section>`;
}

// Where the group is expected to be, as a band rather than a false-precise time.
function arrivalBand(day) {
  if (!day.departBy) return null;
  const d = Number(day.departBy.slice(0, 2)) + Number(day.departBy.slice(3)) / 60;
  return { low: d + day.estLow, high: d + day.estHigh, depart: d };
}

// The numbers for one named window at one place. Used for exposed stretches on
// foot and for the Loch Linnhe crossing. States conditions, draws no conclusion.
function numbersPanel(locId, date, from, to, title, tag) {
  const hours = slice(MODEL?.byLocation?.[locId], date, Math.floor(from), Math.ceil(to));
  if (!hours.length) return '';
  const feels = hours.map((h) => h.feelsC).filter((x) => x != null);
  const gust = Math.max(...hours.map((h) => h.gustMph ?? 0));
  const wind = Math.max(...hours.map((h) => h.windMph ?? 0));
  const rain = hours.reduce((a, h) => a + (h.rainMm ?? 0), 0);
  return `<section class="exposed">
    <h4>${title} <em>${tag}</em></h4>
    <p class="nums">
      <span>~${ampm(from)}–${ampm(to)}</span>
      <span>feels ${feels.length ? temp(Math.min(...feels)) : '—'}</span>
      <span>wind ${Math.round(wind)}<i> gust ${Math.round(gust)}</i> mph</span>
      <span>rain ${rain.toFixed(1)} mm<i> total</i></span>
    </p>
  </section>`;
}

function exposedBlocks(day) {
  if (!day.exposed?.length) return '';
  const band = arrivalBand(day);
  if (!band) return '';
  return day.exposed.map((seg) => numbersPanel(
    seg.at, day.date,
    band.depart + seg.from, band.depart + seg.to,
    seg.name, 'exposed · no shelter',
  )).join('');
}

function dayCard(day) {
  const band = arrivalBand(day);
  const meta = [];
  if (day.miles) meta.push(`${day.miles} mi`);
  if (day.ascent) meta.push(`${day.ascent.toLocaleString()} ft`);
  if (day.departBy) meta.push(`depart ${clock(day.departBy)}`);
  if (band) {
    meta.push(band.low === band.high
      ? `arrive ~${ampm(band.low)}`
      : `arrive ${ampm(band.low)}–${ampm(band.high)}`);
  }

  // Travel days move too, so they get the same "A → B" heading as walking days.
  // Deliberately no inline pronunciation here — two respellings plus the arrow
  // reliably wrapped onto an awkward extra line at phone width. The block
  // headers below (Start/Midway/End) carry it instead; there's room there.
  const title = `${LOC[day.from].name} → ${LOC[day.to].name}`;

  let blocks = '';
  if (day.travelDay) {
    const stops = day.stops ?? [{ role: 'Here', loc: day.to, from: 6, to: 23 }];
    blocks = stops.map((s) => {
      const note = s.note ? `<p class="lunch">${s.note}</p>` : '';
      const panel = day.marine && day.marine.at === s.loc
        ? numbersPanel(day.marine.at, day.date, day.marine.from, day.marine.to,
                       day.marine.name, 'open water · wind exposed')
        : '';
      return block(s.role, s.loc, day.date, s.from, s.to, note + panel);
    }).join('');
  } else {
    const walkFrom = Math.floor(band.depart);
    const walkTo = Math.min(23, Math.ceil(band.high));
    const midFrom = Math.max(walkFrom, Math.floor(band.depart + (band.high - band.depart) * 0.35));
    const midTo = Math.min(23, midFrom + 4);

    const lunchLine = day.lunch
      ? `<p class="lunch">${day.lunch.kind === 'booked'
          ? `Booked ${clock(day.lunch.time)} · ${day.lunch.place}`
          : `${day.lunch.kind === 'packed' ? 'Packed lunch' : 'Lunch'} · ${day.lunch.place}${day.lunch.note ? ` (${day.lunch.note})` : ''}`}</p>`
      : '';

    blocks =
      block('Start', day.from, day.date, walkFrom, Math.min(walkFrom + 4, 23)) +
      (day.mid ? block('Midway', day.mid, day.date, midFrom, midTo, lunchLine) : '') +
      exposedBlocks(day) +
      block('End', day.to, day.date, 16, 23);
  }

  return `<article class="day" data-date="${day.date}">
    <header>
      <p class="eyebrow">${day.label} · ${fmtDate(day.date)}</p>
      <h2>${title}</h2>
      ${meta.length ? `<p class="meta">${meta.join(' · ')}</p>` : ''}
      ${day.note ? `<p class="note">${day.note}</p>` : ''}
      ${day.lodging ? `<p class="lodging">Tonight: ${day.lodging}</p>` : ''}
    </header>
    ${blocks}
  </article>`;
}

// ---------------------------------------------------------------- glance mode
//
// One screen, read at arm's length without glasses, one hand, three seconds.
// The headline is the next CHANGE in the rain, not the current state — you can
// already see whether it is raining; what you cannot see is when it stops.

const GLANCE_STRIP_HOURS = 4;      // 16 blocks at ~22px on a 375px screen
const GLANCE_SCAN_HOURS = 8;       // how far ahead to look for the next flip

// Which of the day's points the group is nearest, from the schedule. Deliberately
// not GPS: no permission prompt, no battery, no cold-fix delay, and the name is
// printed large so a wrong guess is obvious and one tap away from fixed.
function inferPoint(day, hourNow) {
  const pts = [];
  if (day.stops) {
    day.stops.forEach((s) => pts.push({ loc: s.loc, from: s.from }));
  } else {
    const band = arrivalBand(day);
    // No band means no timed movement to place the group along: the day
    // collapses to its single destination.
    if (!band) return { points: [{ loc: day.to, from: 0 }], index: 0 };
    pts.push({ loc: day.from, from: band.depart });
    if (day.mid) pts.push({ loc: day.mid, from: band.depart + (band.high - band.depart) * 0.45 });
    pts.push({ loc: day.to, from: band.high - 0.5 });
  }
  let idx = 0;
  pts.forEach((p, i) => { if (hourNow >= p.from) idx = i; });
  return { points: pts, index: idx };
}

// Quarter-hour slots for a location from `fromHour` onward on `date`.
//
// 15-minute data only runs ~48h ahead, so beyond that this falls back to the
// hourly series expanded into quarters. The display stays identical; only the
// resolution drops, and `coarse` says so.
function quartersFrom(locId, date, fromHour, spanHours) {
  const all = MODEL?.quarters?.[locId] ?? [];
  const out = [];
  for (const q of all) {
    if (q.date < date) continue;
    if (q.date === date && q.at < fromHour) continue;
    out.push(q);
    if (out.length >= spanHours * 4) break;
  }
  if (out.length) return { slots: out, coarse: false };

  const hours = MODEL?.byLocation?.[locId]?.[date] ?? [];
  const slots = [];
  for (const h of hours) {
    if (h.hour < Math.floor(fromHour)) continue;
    const tier = rainTier(h.rainMm);
    for (let k = 0; k < 4; k++) {
      slots.push({ at: h.hour + k * 0.25, date, mm: (h.rainMm ?? 0) / 4, tier });
    }
    if (slots.length >= spanHours * 4) break;
  }
  return { slots, coarse: true };
}

// The next wet→dry or dry→wet flip. Returns null when nothing changes in range.
function nextFlip(slots) {
  if (!slots.length) return null;
  const wetNow = slots[0].tier > 0;
  const found = slots.find((q) => (q.tier > 0) !== wetNow);
  return { wetNow, startTier: slots[0].tier, flip: found ?? null };
}

function glanceHeadline(slots) {
  const s = nextFlip(slots);
  if (!s) return { label: 'No forecast', value: '—' };
  const word = s.startTier === 0 ? 'Dry' : s.startTier === 1 ? 'Drizzle' : 'Rain';
  if (!s.flip) return { label: word, value: `Next ${GLANCE_SCAN_HOURS} hrs` };
  return { label: `${word} until`, value: ampm(s.flip.at) };
}

function glanceStrip(slots) {
  const blocks = slots.slice(0, GLANCE_STRIP_HOURS * 4);
  if (!blocks.length) return '';
  const cells = blocks.map((q) =>
    `<i class="q t${q.tier}" title="${ampm(q.at)} ${q.mm.toFixed(2)}mm"></i>`).join('');
  // A tick under each whole hour, so the strip can be read against the clock.
  const ticks = blocks.map((q, i) =>
    `<i class="qt">${i % 4 === 0 ? ampm(Math.floor(q.at)).replace(' ', '') : ''}</i>`).join('');
  return `<div class="strip">${cells}</div><div class="strip ticks">${ticks}</div>`;
}

function glanceValue(label, value) {
  return `<div class="gv"><span class="gvl">${label}</span><span class="gvv">${value}</span></div>`;
}

let glancePointOverride = null; // set by tapping the location name

function renderGlance() {
  const now = nowInScotland();
  const day = DAYS[selected];
  const hourNow = day.date === now.date ? now.hour + 0.01 : (day.departBy ? Number(day.departBy.slice(0, 2)) : 9);

  const inferred = inferPoint(day, hourNow);
  const points = inferred.points ?? [{ loc: day.to }];
  const idx = glancePointOverride != null
    ? glancePointOverride % points.length
    : (inferred.index ?? 0);
  const locId = points[idx].loc;
  // Only offer the cycle when the day actually has somewhere else to go.
  const canCycle = points.length > 1;

  const startAt = day.date === now.date ? hourNow : (day.departBy ? Number(day.departBy.slice(0, 2)) : 8);
  const { slots, coarse } = quartersFrom(locId, day.date, startAt, GLANCE_SCAN_HOURS);
  const head = glanceHeadline(slots);

  // Supporting values come from the hourly series — 15-min resolution only
  // exists for precipitation.
  const hours = MODEL?.byLocation?.[locId]?.[day.date] ?? [];
  const h = hours.find((x) => x.hour === Math.floor(hourNow)) ?? hours[0];
  const feels = h?.feelsC != null ? `${f(h.feelsC)}°` : '—';
  const wind = h?.windMph != null
    ? `${Math.round(h.windMph)}${h.gustMph != null ? `<b>g${Math.round(h.gustMph)}</b>` : ''}`
    : '—';
  const midge = h?.midge != null ? `${h.midge}<b>/10</b>` : '—';

  return `<div class="glance">
    ${canCycle
      ? `<button class="gloc" id="gloc">${LOC[locId].name}<span class="gcyc">tap to change</span></button>`
      : `<p class="gloc">${LOC[locId].name}</p>`}
    <p class="ghl">${head.label}</p>
    <p class="ghv">${head.value}</p>
    ${glanceStrip(slots)}
    ${slots.length && coarse ? '<p class="gnote">Hourly detail · 15-min resolution within 48 hrs</p>' : ''}
    <div class="gvals">
      ${glanceValue('Feels', feels)}
      ${glanceValue('Wind', wind)}
      ${glanceValue('Midge', midge)}
    </div>
    <button class="gexit" id="gexit">Detail</button>
  </div>`;
}

// Static reference list, rendered once at boot — alphabetical, since this is a
// lookup ("was it Balmaha or Kinlochleven?"), not a narrative walk-through.
function renderPronunciationList() {
  const sorted = [...PRONUNCIATIONS].sort((a, b) => a.label.localeCompare(b.label));
  document.getElementById('pronList').innerHTML = sorted.map((p) => `<li>
    <b>${p.label}</b>
    <span>${p.respelling}${p.note ? `<i>${p.note}</i>` : ''}</span>
  </li>`).join('');
}

function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ------------------------------------------------------------------ app state

// Everything is anchored to UK local time, including for anyone following along
// from Seattle — the question is always "what is it doing there, now".
// ?now=2026-08-06T14 pins the reference time, so the current-hour marker can be
// checked before the trip starts. Ignored when absent or malformed.
const NOW_OVERRIDE = (() => {
  const raw = new URLSearchParams(location.search).get('now');
  const m = raw && raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
  return m ? { date: m[1], hour: Number(m[2]) } : null;
})();

function nowInScotland() {
  if (NOW_OVERRIDE) return NOW_OVERRIDE;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    // Some locales report midnight as hour 24.
    hour: Number(parts.hour) % 24,
  };
}

function todayInScotland() {
  return nowInScotland().date;
}

// Mark the current hour in every table it appears in — the same hour shows up
// in the Start, Midway and End blocks, and all of them should light up.
function markNow() {
  const now = nowInScotland();
  document.querySelectorAll('table.hrs tr[data-hour]').forEach((tr) => {
    tr.classList.toggle(
      'now',
      tr.dataset.date === now.date && Number(tr.dataset.hour) === now.hour
    );
  });
}

function defaultDayIndex() {
  const t = todayInScotland();
  const i = DAYS.findIndex((d) => d.date === t);
  if (i >= 0) return i;
  return t < DAYS[0].date ? 0 : DAYS.length - 1;
}

let selected = defaultDayIndex();
let glanceMode = false;

function setGlance(on) {
  glanceMode = on;
  glancePointOverride = null;   // a fresh entry re-infers from the schedule
  localStorage.setItem('whw.glance', on ? '1' : '0');
  document.getElementById('glance').textContent = on ? 'Detail' : 'Glance';
  // Glance always concerns today; leaving it returns you to the same day.
  if (on) selected = defaultDayIndex();
  render();
}

// 'idle' | 'fetching' | 'failed'. Drives the banner and the Refresh button so a
// tap is always visibly acknowledged, even on a connection that never answers.
let netState = 'idle';
let flashUntil = 0;
let flashTimer = null;

function staleness() {
  if (!MODEL) return { cls: 'red', text: 'No data yet — connect and refresh' };
  const mins = Math.round((Date.now() - MODEL.fetchedAt) / 60000);
  const off = !navigator.onLine ? ' · offline' : '';
  if (mins < 60) return { cls: 'green', text: `Updated ${mins} min ago${off}` };
  const hrs = Math.round(mins / 60);
  if (hrs < 4) return { cls: 'green', text: `Updated ${hrs} h ago${off}` };
  if (hrs < 12) return { cls: 'amber', text: `Updated ${hrs} h ago${off}` };
  return { cls: 'red', text: `STALE — ${hrs} h old${off}` };
}

function renderStatus() {
  const bar = document.getElementById('status');
  const btn = document.getElementById('refresh');
  const txt = bar.querySelector('.txt');
  const s = staleness();

  btn.classList.remove('busy', 'done');

  if (netState === 'fetching') {
    bar.className = 'busy';
    txt.textContent = 'Refreshing…';
    btn.innerHTML = '<span class="spin"></span>Updating';
    btn.disabled = true;
  } else {
    btn.disabled = false;

    if (netState === 'failed') {
      bar.className = 'red';
      // Always keep the age of the data visible — that is the thing that
      // matters, not the fact that one attempt failed.
      txt.textContent = navigator.onLine
        ? `Refresh failed · ${s.text}`
        : `No signal · ${s.text}`;
      btn.textContent = 'Retry';
    } else {
      bar.className = s.cls;
      txt.textContent = s.text;

      if (Date.now() < flashUntil) {
        btn.textContent = 'Updated ✓';
        btn.classList.add('done');
      } else {
        btn.textContent = 'Refresh';
      }
    }
  }

  syncStatusHeight();
}

// #tabs sticks just below #status, whose height genuinely varies with its
// content — a failed-refresh banner ("No signal · STALE — 14 h old") wraps to
// two lines on a phone width, roughly doubling the bar's height. A hardcoded
// offset here previously drifted from the real height (measured 39px vs an
// actual 52-77px depending on state), so once both bars were pinned during
// scroll, #status silently overlapped and clipped the top of the tab row —
// reported as the tab bar "shrinking". Track the true height in a CSS custom
// property instead of guessing at a fixed pixel value.
function syncStatusHeight() {
  const h = document.getElementById('status').offsetHeight;
  document.documentElement.style.setProperty('--status-h', `${h}px`);
}

function render() {
  renderStatus();

  document.body.classList.toggle('glance-mode', glanceMode);
  if (glanceMode) {
    document.getElementById('tabs').innerHTML = '';
    document.getElementById('cards').innerHTML = renderGlance();
    document.getElementById('gexit').addEventListener('click', () => setGlance(false));
    // Absent on single-location days, where there is nothing to cycle to.
    document.getElementById('gloc')?.addEventListener('click', () => {
      glancePointOverride = (glancePointOverride ?? 0) + 1;
      render();
    });
    window.scrollTo({ top: 0 });
    return;
  }

  const today = todayInScotland();
  document.getElementById('tabs').innerHTML = DAYS.map((d, i) => {
    const cls = [
      i === selected ? 'sel' : '',
      d.date === today ? 'today' : '',
      d.date < today ? 'past' : '',
    ].filter(Boolean).join(' ');
    return `<button class="${cls}" data-i="${i}">${d.label.replace('Day ', '')}</button>`;
  }).join('');

  document.getElementById('cards').innerHTML = dayCard(DAYS[selected]);
  markNow();
  window.scrollTo({ top: 0 });
}

function wire() {
  document.getElementById('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    selected = Number(b.dataset.i);
    history.replaceState(null, '', `?day=${selected + 1}`);
    render();
  });

  document.getElementById('refresh').addEventListener('click', () => {
    if (inFlight) return;
    // Immediate physical acknowledgement on Android; iOS ignores it silently.
    if (navigator.vibrate) navigator.vibrate(12);
    refresh({ force: true });
  });

  document.getElementById('contrast').addEventListener('click', () => applyTheme(true));
  document.getElementById('glance').addEventListener('click', () => setGlance(!glanceMode));

  // Rotation and text-size changes can change #status's height, which #tabs's
  // sticky offset depends on.
  window.addEventListener('resize', syncStatusHeight);

  window.addEventListener('online', () => refresh({ force: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    markNow();   // the hour may well have rolled over while the app was away
    refresh();
  });

  // Roll the marker over without a full re-render, which would reset the scroll
  // position out from under whoever is reading.
  setInterval(markNow, 30000);
}

// High contrast is the default; 'dusk' is the deeper shirt khaki. Called with no
// argument from the button to toggle, and once at boot to restore the choice.
const GROUND = { bright: '#EFE8D6', dusk: '#9C8E6D' };

// Same house style as the beetle glyph: filled core shape + thin stroke accents.
const SUN_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true">
<path class="fill" d="M5.4,8a2.6,2.6 0 1,0 5.2,0a2.6,2.6 0 1,0 -5.2,0"/>
<path class="stroke" d="M8 2.4L8 0.6M8 13.6L8 15.4M13.6 8L15.4 8M2.4 8L0.6 8M11.7 4.3L13 3M11.7 11.7L13 13M4.3 11.7L3 13M4.3 4.3L3 3"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true">
<path class="fill" d="M14 8.5A6 6 0 1 1 7.5 2A4.7 4.7 0 0 0 14 8.5Z"/></svg>`;

function applyTheme(toggle = false) {
  const body = document.body;
  if (toggle) body.classList.toggle('dusk');
  const dusk = body.classList.contains('dusk');

  localStorage.setItem('whw.theme', dusk ? 'dusk' : 'bright');
  // The icon shows where you're going, not where you are — a sun to bring
  // back daylight, a moon to drop into the deeper palette.
  const btn = document.getElementById('contrast');
  btn.innerHTML = dusk ? SUN_ICON : MOON_ICON;
  btn.setAttribute('aria-label', dusk ? 'Sun' : 'Moon');
  btn.title = dusk ? 'Switch to the bright palette' : 'Switch to the deeper shirt palette';
  document.querySelector('meta[name="theme-color"]')
    .setAttribute('content', dusk ? GROUND.dusk : GROUND.bright);
}

function boot() {
  if (localStorage.getItem('whw.theme') === 'dusk') document.body.classList.add('dusk');
  applyTheme(false);

  const params = new URLSearchParams(location.search);
  const q = Number(params.get('day'));
  if (q >= 1 && q <= DAYS.length) selected = q - 1;

  // ?glance=1 lets a second home screen icon open straight into glance mode.
  glanceMode = params.get('glance') === '1' || localStorage.getItem('whw.glance') === '1';
  document.getElementById('glance').textContent = glanceMode ? 'Detail' : 'Glance';

  // No baked-in fallback data: a PWA cannot be installed without a network in
  // the first place, so a first launch always has connectivity to fetch live.
  MODEL = loadCache();

  renderPronunciationList();
  wire();
  render();
  refresh({ force: true });

  if ('serviceWorker' in navigator) {
    // If a worker was already controlling this page and a new one takes over,
    // the code on screen is stale — reload once so nobody walks around on an
    // old version. Guarded so the very first install does not reload.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });

    // updateViaCache: 'none' so the worker script itself is never read from the
    // HTTP cache when checking for updates.
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      reg.update();
      setInterval(() => reg.update(), 60 * 60 * 1000);
    }).catch(() => {});
  }
}

boot();

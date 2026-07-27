// West Highland Way weather + midge tracker.
// Live-first, cache-as-fallback: every load tries the network, and falls back to
// the last good response when there is no signal. Nothing here needs an API key.

import { LOCATIONS, LOC, DAYS } from './itinerary.js';
import { midgeScore, midgeBand } from './midge.js';

const CACHE_KEY = 'whw.forecast.v2';
const REFRESH_THROTTLE_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const FLASH_MS = 1800;
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

let MODEL = null; // { fetchedAt, byLocation: { id: { date: [hours] } } }

function normalise(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const byLocation = {};
  list.forEach((entry, i) => {
    const id = LOCATIONS[i]?.id;
    if (id) byLocation[id] = buildHours(entry);
  });
  return byLocation;
}

function loadCache() {
  try {
    const s = localStorage.getItem(CACHE_KEY);
    if (!s) return null;
    const o = JSON.parse(s);
    return { fetchedAt: o.fetchedAt, byLocation: normalise(o.raw) };
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
    MODEL = { fetchedAt: Date.now(), byLocation: normalise(raw) };
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

// Rain tiers. The headline windows use RAIN; DRIZZLE is shown but reads as damp.
const DRIZZLE_MM = 0.1;
const RAIN_MM = 0.5;
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

const thistle = (filled) => `<svg class="th ${filled ? 'on' : 'off'}" viewBox="0 0 12 16" aria-hidden="true">
<path d="M6 15V9M6 9c-2 0-3-1.4-3-3s1.3-2.6 3-2.6S9 4.4 9 6s-1 3-3 3z"/>
<path d="M4 3.4L3 1.2M6 3.2V0.6M8 3.4L9 1.2M3.2 12.4L1 11M8.8 12.4L11 11"/></svg>`;

function midgeCell(score) {
  if (score == null) return '<span class="na">—</span>';
  const { level, label } = midgeBand(score);
  const pips = [1, 2, 3, 4, 5].map((i) => thistle(i <= level)).join('');
  return `<span class="midge" title="${label} ${score}/10">${pips}</span>`;
}

function rainCell(h) {
  const t = rainTier(h.rainMm);
  if (!t) return '<span class="na">·</span>';
  const p = h.rainProb != null ? `<i>${h.rainProb}%</i>` : '';
  return `<span class="rain r${t}"><b></b>${h.rainMm.toFixed(1)}${p}</span>`;
}

function hourRows(hours, { highlight = [] } = {}) {
  if (!hours.length) return '<p class="none">Not yet forecast — beyond model range.</p>';
  return `<table class="hrs"><thead><tr>
      <th>Hr</th><th>Temp</th><th>Rain</th><th>Wind</th><th>Midge</th>
    </tr></thead><tbody>${hours.map((h) => {
      const hot = highlight.includes(h.hour) ? ' class="hi"' : '';
      const gust = h.gustMph != null && h.gustMph - (h.windMph ?? 0) > 8
        ? `<i>g${Math.round(h.gustMph)}</i>` : '';
      return `<tr${hot}>
        <td class="hr">${h.hour % 12 || 12}<span class="ap">${h.hour < 12 ? 'am' : 'pm'}</span></td>
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

function block(role, locId, date, from, to, extra = '') {
  const loc = LOC[locId];
  const hours = slice(MODEL?.byLocation?.[locId], date, from, to);
  const outlook = hours.length && hours.every((h) => h.outlook);
  return `<section class="blk${outlook ? ' outlook' : ''}">
    <h3><span class="role">${role}</span> ${loc.name}
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

function exposedBlocks(day) {
  if (!day.exposed?.length) return '';
  const band = arrivalBand(day);
  if (!band) return '';
  return day.exposed.map((seg) => {
    const from = Math.floor(band.depart + seg.from);
    const to = Math.ceil(band.depart + seg.to);
    const hours = slice(MODEL?.byLocation?.[seg.at], day.date, from, to);
    if (!hours.length) return '';
    const feels = hours.map((h) => h.feelsC).filter((x) => x != null);
    const gust = Math.max(...hours.map((h) => h.gustMph ?? 0));
    const wind = Math.max(...hours.map((h) => h.windMph ?? 0));
    const rain = hours.reduce((a, h) => a + (h.rainMm ?? 0), 0);
    return `<section class="exposed">
      <h4>${seg.name} <em>exposed · no shelter</em></h4>
      <p class="nums">
        <span>~${ampm(from)}–${ampm(to)}</span>
        <span>feels ${feels.length ? temp(Math.min(...feels)) : '—'}</span>
        <span>wind ${Math.round(wind)}<i> gust ${Math.round(gust)}</i> mph</span>
        <span>rain ${rain.toFixed(1)} mm<i> total</i></span>
      </p>
    </section>`;
  }).join('');
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

  const from = LOC[day.from], to = LOC[day.to];
  const title = day.travelDay ? to.name : `${from.name} → ${to.name}`;

  let blocks = '';
  if (day.travelDay) {
    blocks = block('Here', day.to, day.date, 6, 23);
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
      block('Tonight', day.to, day.date, 16, 23);
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

function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ------------------------------------------------------------------ app state

function todayInScotland() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function defaultDayIndex() {
  const t = todayInScotland();
  const i = DAYS.findIndex((d) => d.date === t);
  if (i >= 0) return i;
  return t < DAYS[0].date ? 0 : DAYS.length - 1;
}

let selected = defaultDayIndex();

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
    return;
  }

  btn.disabled = false;

  if (netState === 'failed') {
    bar.className = 'red';
    // Always keep the age of the data visible — that is the thing that matters,
    // not the fact that one attempt failed.
    txt.textContent = navigator.onLine
      ? `Refresh failed · ${s.text}`
      : `No signal · ${s.text}`;
    btn.textContent = 'Retry';
    return;
  }

  bar.className = s.cls;
  txt.textContent = s.text;

  if (Date.now() < flashUntil) {
    btn.textContent = 'Updated ✓';
    btn.classList.add('done');
  } else {
    btn.textContent = 'Refresh';
  }
}

function render() {
  renderStatus();

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

  window.addEventListener('online', () => refresh({ force: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}

// High contrast is the default; 'dusk' is the deeper shirt khaki. Called with no
// argument from the button to toggle, and once at boot to restore the choice.
const GROUND = { bright: '#EFE8D6', dusk: '#9C8E6D' };

function applyTheme(toggle = false) {
  const body = document.body;
  if (toggle) body.classList.toggle('dusk');
  const dusk = body.classList.contains('dusk');

  localStorage.setItem('whw.theme', dusk ? 'dusk' : 'bright');
  // The button names where you are going, not where you are.
  document.getElementById('contrast').textContent = dusk ? 'Sun' : 'Moon';
  document.querySelector('meta[name="theme-color"]')
    .setAttribute('content', dusk ? GROUND.dusk : GROUND.bright);
}

function boot() {
  if (localStorage.getItem('whw.theme') === 'dusk') document.body.classList.add('dusk');
  applyTheme(false);

  const q = Number(new URLSearchParams(location.search).get('day'));
  if (q >= 1 && q <= DAYS.length) selected = q - 1;

  // No baked-in fallback data: a PWA cannot be installed without a network in
  // the first place, so a first launch always has connectivity to fetch live.
  MODEL = loadCache();

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

    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update();
      setInterval(() => reg.update(), 60 * 60 * 1000);
    }).catch(() => {});
  }
}

boot();

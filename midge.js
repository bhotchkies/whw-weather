// Midge activity index for the Scottish Highland midge (Culicoides impunctatus).
//
// This is a weather proxy, computed locally so it works with no connectivity.
// It follows the constants published by biteforecast.scot, which in turn cites
// APS Biocontrol / Smidge and Blackwell's work on Scottish biting midges:
//
//   - below 7 C there is no activity at all
//   - dusk runs from 1 h before sunset to 90 min after; dawn is 1 h either side
//     of sunrise; outside those windows the night is strongly suppressed
//   - wind is the dominant suppressor: 8-12 mph progressively kills activity,
//     sustained 12 mph+ effectively ends it
//   - bright midday sun suppresses; overcast does not
//
// Scored 0-10. It cannot see sheltered pockets — a campsite edge, a wooded
// hollow, a still burn — which routinely feel worse than the broad forecast.

const NO_ACTIVITY_BELOW_C = 7;

// Linear interpolation between two points, clamped outside the range.
function ramp(x, x0, y0, x1, y1) {
  if (x <= x0) return y0;
  if (x >= x1) return y1;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

// Midges peak around 15 C and fall away in both directions.
function temperatureFactor(tempC) {
  if (tempC < NO_ACTIVITY_BELOW_C) return 0;
  if (tempC < 11) return ramp(tempC, 7, 0.38, 11, 0.85);
  if (tempC < 15) return ramp(tempC, 11, 0.8, 15, 1.0);
  if (tempC < 21) return ramp(tempC, 15, 1.0, 21, 0.75);
  if (tempC < 26) return ramp(tempC, 21, 0.75, 26, 0.25);
  return 0.1;
}

// They desiccate quickly, so dry air suppresses them sharply.
function humidityFactor(rh) {
  if (rh < 55) return 0.25;
  if (rh < 80) return ramp(rh, 55, 0.25, 80, 0.95);
  return ramp(rh, 80, 0.95, 95, 1.0);
}

// The strongest single lever. Speeds are mph to match the published thresholds.
// Calibrated against BiteForecast's own Rannoch Moor series (see MIDGE_MODEL.md).
function windFactor(mph) {
  if (mph < 5) return 1.0;
  if (mph < 8) return ramp(mph, 5, 1.0, 8, 0.55);
  if (mph < 12) return ramp(mph, 8, 0.55, 12, 0.12);
  if (mph < 18) return ramp(mph, 12, 0.12, 18, 0.05);
  return 0.02;
}

// Crepuscular: dusk is worst, dawn close behind, the middle of the night dead.
// `hour` is a fractional hour of the day; sunrise/sunset likewise.
function timeOfDayFactor(hour, sunrise, sunset) {
  const duskStart = sunset - 1.0;
  const duskEnd = sunset + 1.5;
  const dawnStart = sunrise - 1.0;
  const dawnEnd = sunrise + 2.5; // calibration showed their dawn runs later than +1h

  if (hour >= duskStart && hour <= duskEnd) return 1.0;
  if (hour >= dawnStart && hour <= dawnEnd) return 0.88;
  if (hour > dawnEnd && hour < duskStart) return 0.55; // daylight, suppressed
  return 0.30;                                          // overnight dead zone
}

// Direct sun drives them into cover; overcast does not. Used only in daylight.
function brightnessFactor(radiation, isDay) {
  if (!isDay) return 1.0;
  if (radiation >= 450) return 0.45;
  if (radiation >= 200) return ramp(radiation, 200, 0.85, 450, 0.45);
  return 1.0;
}

// Heavy rain knocks them down. Drizzle does not — still, damp, drizzly air is
// close to ideal for them, which is why it gets no penalty at all.
function rainFactor(mmPerHour) {
  if (mmPerHour >= 2.0) return 0.25;
  if (mmPerHour >= 0.5) return ramp(mmPerHour, 0.5, 0.8, 2.0, 0.25);
  return 1.0;
}

// Early August sits in the second brood, the worst of the Scottish season.
function seasonFactor(isoDate) {
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  if (month < 5 || month > 9) return 0.05;
  if (month === 5) return day < 20 ? 0.3 : 0.6;
  if (month === 6) return 0.85;
  if (month === 7 || month === 8) return 1.0;
  return day < 15 ? 0.8 : 0.45; // September tails off
}

/**
 * Score one hour, 0-10.
 * @param {object} h - tempC, humidity, windMph, radiation, isDay, rainMm
 * @param {number} hour - fractional hour of day, local time
 * @param {number} sunrise - fractional hour
 * @param {number} sunset - fractional hour
 * @param {string} isoDate - YYYY-MM-DD
 */
export function midgeScore(h, hour, sunrise, sunset, isoDate) {
  if (h.tempC == null || h.windMph == null) return null;
  if (h.tempC < NO_ACTIVITY_BELOW_C) return 0;

  const raw =
    temperatureFactor(h.tempC) *
    humidityFactor(h.humidity ?? 80) *
    windFactor(h.windMph) *
    timeOfDayFactor(hour, sunrise, sunset) *
    brightnessFactor(h.radiation ?? 0, h.isDay) *
    rainFactor(h.rainMm ?? 0) *
    seasonFactor(isoDate);

  return Math.max(0, Math.min(10, Math.round(raw * 10)));
}

// Bands are non-overlapping, unlike the published table which lists 7 twice.
export function midgeBand(score) {
  if (score == null) return { label: '—', level: 0 };
  if (score <= 3) return { label: 'Low', level: 1 };
  if (score <= 5) return { label: 'Moderate', level: 2 };
  if (score <= 7) return { label: 'High', level: 3 };
  if (score <= 8) return { label: 'Severe', level: 4 };
  return { label: 'Extreme', level: 5 };
}

// Places from the trip doc — lodging, meals, shops, transport. Drawn on the
// offline map only. Deliberately NOT in itinerary.js's LOCATIONS, whose order
// is load-bearing for the Open-Meteo query — adding these there would fetch a
// forecast for every one of them and pollute every weather surface in the app.
//
// Coordinates come from the !3d/!4d pair in each Google Maps short link's
// redirect target (or, for a "/search/lat,lon" style short link, the lat/lon
// in that path directly) — the source link is kept above each entry so any of
// them can be re-checked. The @lat,lon prefix in those URLs is the viewport
// center, not the pin, and can be off by more than a mile; do not use it.
//
// `dates` is an array, not a single date, because a handful of places serve
// two days (e.g. a campsite is one night's dinner and the next morning's
// breakfast) — it holds DAYS[].date strings from itinerary.js so the "is this
// today's place" test on the map is a plain string compare.
//
// Two names below don't match Google's own listing for the pin: "The Ways
// Inn" (Day 6 snack stop) resolves to "Kingshouse Hotel" on Google Maps, and
// the Milngavie Train Station link resolves to the generic town-center pin,
// not a station-specific location. Both kept under the trip doc's name since
// that's what the group calls them; coordinates are Google's regardless.
//
// "Highland Get Away" (Day 6 dinner alternative / Day 7 breakfast) has no map
// link in the doc, so it's left out — same rule as everything else here.

export const PLACE_KINDS = {
  lodging:   { label: 'Lodging',   color: '#5B3A5B' },
  food:      { label: 'Food',      color: '#8A4B1E' },
  shop:      { label: 'Shop',      color: '#3B5C6B' },
  transport: { label: 'Transport', color: '#4A4A3A' },
};

export const PLACES = [
  // ---- Jul 31 / Aug 1 — Milngavie ----------------------------------------
  // https://maps.app.goo.gl/hLNioboyvUCNYx8d7
  {
    id: 'premier-milngavie', name: 'Premier Inn Milngavie', kind: 'lodging',
    dates: ['2026-07-31'], lat: 55.93484, lon: -4.31560,
  },
  // https://maps.app.goo.gl/D3ewoCvhLDCLVhfh6
  {
    id: 'garvie-and-co', name: 'Garvie & Co', kind: 'food',
    dates: ['2026-07-31'], lat: 55.94218, lon: -4.31715,
  },
  // https://maps.app.goo.gl/SESN7Za2691pcitP8
  {
    id: 'tesco-milngavie', name: 'Tesco Superstore', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.93974, lon: -4.31491,
  },
  // https://maps.app.goo.gl/Fh897ztwHp8JFMNq6
  {
    id: 'mands-milngavie', name: 'M&S Foodhall', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.94084, lon: -4.31752,
  },
  // https://goo.gl/maps/jFgpLCkKCZkJRj8d8 — resolves to the generic
  // Milngavie town pin, not the station specifically.
  {
    id: 'milngavie-station', name: 'Milngavie Train Station', kind: 'transport',
    dates: ['2026-08-01'], lat: 55.94129, lon: -4.31440,
  },

  // ---- Aug 1 — Drymen ------------------------------------------------------
  // https://maps.app.goo.gl/RhXqcjcH23BbQ14u5
  {
    id: 'the-clachan', name: 'The Clachan Inn', kind: 'food',
    dates: ['2026-08-01'], lat: 56.06607, lon: -4.45256,
  },
  // https://maps.app.goo.gl/d8BszMMPhNuKAuwy6 (Dumgoyne)
  {
    id: 'turnip-the-beet', name: 'Turnip The Beet', kind: 'food',
    dates: ['2026-08-01'], lat: 56.02866, lon: -4.38073,
  },
  // https://maps.app.goo.gl/HfXMrBPJd89GA6E16 (Dumgoyne)
  {
    id: 'beech-tree-cafe', name: 'Beech Tree Cafe Bar', kind: 'food',
    dates: ['2026-08-01'], lat: 56.02098, lon: -4.37073,
  },
  // https://maps.app.goo.gl/Bt7QyJWYCjzv2A5e9
  {
    id: 'kip-in-the-kirk-hillside', name: 'Kip in the Kirk (Hillside)', kind: 'lodging',
    dates: ['2026-08-01'], lat: 56.06604, lon: -4.45231,
  },
  // https://maps.app.goo.gl/drAVKNqrNd4AXRZA9
  {
    id: 'kip-in-the-kirk-hillview', name: 'Kip in the Kirk (Hillview)', kind: 'lodging',
    dates: ['2026-08-01'], lat: 56.06607, lon: -4.45276,
  },
  // https://maps.app.goo.gl/qjesFwpo9E2LbBUK8
  {
    id: 'spar-drymen', name: 'SPAR Drymen', kind: 'shop',
    dates: ['2026-08-01'], lat: 56.06577, lon: -4.45201,
  },
  // https://maps.app.goo.gl/JZc9fqm6okUWxQck6
  {
    id: 'drymen-bakery', name: 'Drymen Bakery & Deli', kind: 'shop',
    dates: ['2026-08-01'], lat: 56.06597, lon: -4.45222,
  },

  // ---- Aug 2 — Balmaha / Rowardennan ---------------------------------------
  // https://maps.app.goo.gl/UwzFDiSZDBrzP3mg9
  {
    id: 'oak-tree-inn', name: 'Oak Tree Inn', kind: 'food',
    dates: ['2026-08-02'], lat: 56.08408, lon: -4.53991,
  },
  // https://maps.app.goo.gl/pkyCtozHR4PSabbR6
  {
    id: 'rowardennan-yh', name: 'Rowardennan Youth Hostel', kind: 'lodging',
    dates: ['2026-08-02'], lat: 56.15793, lon: -4.64339,
  },

  // ---- Aug 3/4 — Inverarnan -------------------------------------------------
  // https://maps.app.goo.gl/1T84AWhhFKiKPwyV8
  {
    id: 'drovers-inn', name: 'The Drovers Inn', kind: 'food',
    dates: ['2026-08-03'], lat: 56.32835, lon: -4.72176,
  },
  // https://maps.app.goo.gl/jCYRJpaaat9CjdaM8 — Day 3 dinner + Day 4 breakfast.
  {
    id: 'beinglas-campsite', name: 'Beinglas Campsite', kind: 'lodging',
    dates: ['2026-08-03', '2026-08-04'], lat: 56.33118, lon: -4.71687,
  },

  // ---- Aug 4/5 — Tyndrum -----------------------------------------------------
  // https://maps.app.goo.gl/RZ1GKHQGuhHs8WAp6 — Day 4 dinner + Day 5 breakfast.
  {
    id: 'real-food-cafe', name: 'Real Food Cafe', kind: 'food',
    dates: ['2026-08-04', '2026-08-05'], lat: 56.43586, lon: -4.71092,
  },
  // https://maps.app.goo.gl/LeSjyh2hW651mu8DA
  {
    id: 'by-the-way', name: 'By The Way, Tyndrum', kind: 'lodging',
    dates: ['2026-08-04'], lat: 56.43390, lon: -4.71312,
  },
  // https://maps.app.goo.gl/ECNPNCx2u2dTzqyW6
  {
    id: 'green-welly-stop', name: 'Green Welly Stop', kind: 'shop',
    dates: ['2026-08-04'], lat: 56.43820, lon: -4.71263,
  },
  // https://maps.app.goo.gl/C57cuJftfvb7dtNH7
  {
    id: 'brodies-mini-mart', name: 'Brodies Mini Mart', kind: 'shop',
    dates: ['2026-08-04'], lat: 56.43862, lon: -4.71342,
  },

  // ---- Aug 5 — Inveroran -----------------------------------------------------
  // https://maps.app.goo.gl/sneMsvVPYsfM1Ltc8
  {
    id: 'bridge-of-orchy-hotel', name: 'Bridge of Orchy Hotel', kind: 'food',
    dates: ['2026-08-05'], lat: 56.51772, lon: -4.76896,
  },
  // https://maps.app.goo.gl/TURX1CajbdVu5ttMA
  {
    id: 'inveroran-hotel', name: 'Inveroran Hotel', kind: 'lodging',
    dates: ['2026-08-05'], lat: 56.53294, lon: -4.80749,
  },

  // ---- Aug 6 — Kinlochleven ----------------------------------------------
  // https://maps.app.goo.gl/D7f2Xfg2rQenS8bd8 — resolves to Kingshouse Hotel.
  {
    id: 'the-ways-inn', name: 'The Ways Inn', kind: 'food',
    dates: ['2026-08-06'], lat: 56.65143, lon: -4.84122,
  },
  // https://maps.app.goo.gl/8a1MHxADGiev7Zkz5
  {
    id: 'rice-and-chips', name: 'Rice and Chips', kind: 'food',
    dates: ['2026-08-06'], lat: 56.71456, lon: -4.96430,
  },
  // https://maps.app.goo.gl/2c4dJUPfEU95fGTL7
  {
    id: 'blackwater-pods', name: 'Blackwater Pods', kind: 'lodging',
    dates: ['2026-08-06'], lat: 56.71439, lon: -4.96034,
  },

  // ---- Aug 7 — Fort William ---------------------------------------------
  // https://maps.app.goo.gl/iKwu9NJBnRbs3jK99
  {
    id: 'macaris', name: "Macari's", kind: 'food',
    dates: ['2026-08-07'], lat: 56.81680, lon: -5.11311,
  },
  // https://maps.app.goo.gl/T5NMbBBujVoTbpZg8
  {
    id: 'travelodge-fort-william', name: 'Travelodge Fort William', kind: 'lodging',
    dates: ['2026-08-07'], lat: 56.81635, lon: -5.11360,
  },

  // ---- Aug 8 — Fort William to Glasgow -----------------------------------
  // https://maps.app.goo.gl/iKmxjpq4VEpFMv9P8
  {
    id: 'seal-cruise-harbour', name: 'Fort William Harbour (Seal Cruise)', kind: 'transport',
    dates: ['2026-08-08'], lat: 56.81639, lon: -5.11426,
  },
  // https://maps.app.goo.gl/NVUEfX9YcLHyoqk7A — ~6 mi outside the downloaded
  // corridor; renders on the coarse backdrop only, with no street detail.
  {
    id: 'premier-glasgow-airport', name: 'Premier Inn Glasgow Airport', kind: 'lodging',
    dates: ['2026-08-08'], lat: 55.86215, lon: -4.42585,
  },
];

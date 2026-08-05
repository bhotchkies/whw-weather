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
// Honesty boxes, water taps, groceries and gear shops come from a set of
// Google My Maps exports ("Honesty Box.kmz", "Water.kmz", "Grocery.kmz",
// "Gear Shop.kmz") rather than the trip doc — each entry notes its source
// file instead of a Maps link. All water-tap entries are deliberately named
// just "Water Tap" regardless of the source file's town-specific name.
// Two points came in far outside the 2.5 mi corridor and right at Glencoe
// village, which the WHW doesn't actually pass through (Invercoe Caravan
// Park from Water.kmz, a Gulf petrol station from Grocery.kmz) — both
// dropped as unreachable without a real detour. The Green Welly Stop's own
// gear shop isn't repeated as a separate 'gear' entry since it's the exact
// same site as the existing 'shop' entry for it.

export const PLACE_KINDS = {
  lodging:   { label: 'Lodging',   color: '#5B3A5B' },
  food:      { label: 'Food',      color: '#8A4B1E' },
  shop:      { label: 'Shop',      color: '#3B5C6B' },
  transport: { label: 'Transport', color: '#4A4A3A' },
  water:     { label: 'Water',     color: '#1565C0' },
  gear:      { label: 'Gear',      color: '#2E7D32' },
  sight:     { label: 'Sight',     color: '#B8860B' },
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
  // From "Grocery.kmz".
  {
    id: 'waite-and-rose-cafe', name: 'Waite & Rose Café', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.93442, lon: -4.31475,
  },
  // From "Grocery.kmz".
  {
    id: 'aldi-milngavie', name: 'ALDI', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.93275, lon: -4.31493,
  },
  // From "Grocery.kmz" — distinct from spar-drymen below, same chain.
  {
    id: 'spar-milngavie', name: 'Spar Milngavie', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.94136, lon: -4.31811,
  },
  // From "Grocery.kmz".
  {
    id: 'shop-local-milngavie', name: 'Shop Local Milngavie', kind: 'shop',
    dates: ['2026-07-31'], lat: 55.94371, lon: -4.31052,
  },

  // ---- Aug 1 — Drymen ------------------------------------------------------
  // Trail mile 3.85, between Milngavie and Dumgoyne.
  {
    id: 'blairs-hill', name: "Blair's Hill", kind: 'sight',
    dates: ['2026-08-01'], lat: 55.988158, lon: -4.343480,
  },
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
  // From "Honesty Box.kmz" (trail mile 9.72, between Dumgoyne and Drymen).
  {
    id: 'gartness-honesty-box', name: 'Gartness Honesty Box', kind: 'food',
    dates: ['2026-08-01'], lat: 56.05179, lon: -4.40823,
  },
  // From "Honesty Box.kmz" (trail mile 10.81) — "Home baking shed" per its
  // description.
  {
    id: 'altquhur-byre', name: 'Altquhur Byre', kind: 'food',
    dates: ['2026-08-01'], lat: 56.05304, lon: -4.43186,
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
  // https://maps.app.goo.gl/gha8PZcrdERRYFF96
  {
    id: 'kip-in-the-kirk-checkin', name: 'Kip in the Kirk (Check in)', kind: 'lodging',
    dates: ['2026-08-01'], lat: 56.06658, lon: -4.45088,
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
  // From "Water.kmz" — label deliberately generic ("Water Tap"), not the
  // town-specific name each pin has in the source file.
  {
    id: 'water-tap-drymen', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-01', '2026-08-02'], lat: 56.06572, lon: -4.45260,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-drymen-camping', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-01'], lat: 56.05364, lon: -4.43206,
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
  // From "Grocery.kmz".
  {
    id: 'balmaha-village-shop', name: 'Balmaha Village Shop', kind: 'shop',
    dates: ['2026-08-02'], lat: 56.08414, lon: -4.53967,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-balmaha', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-02'], lat: 56.08452, lon: -4.54132,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-milarrochy-bay', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-02'], lat: 56.10013, lon: -4.56127,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-cashel', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-02'], lat: 56.11218, lon: -4.58207,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-sallochy', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-02'], lat: 56.12728, lon: -4.60772,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-ben-lomond', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-02'], lat: 56.15199, lon: -4.64229,
  },

  // ---- Aug 3/4 — Inverarnan -------------------------------------------------
  // https://maps.app.goo.gl/kyL7Kkasthbydh5d8 — an honesty box with food and
  // snacks, just past Rowardennan on Day 3's route.
  {
    id: 'bens-bakes', name: "Ben's Bakes", kind: 'food',
    dates: ['2026-08-03'], lat: 56.15949, lon: -4.64200,
  },
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
  // From "Grocery.kmz".
  {
    id: 'beinglas-campsite-shop', name: 'Beinglas Campsite Shop', kind: 'shop',
    dates: ['2026-08-03', '2026-08-04'], lat: 56.33085, lon: -4.71708,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-beinglas', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-03', '2026-08-04'], lat: 56.33101, lon: -4.71694,
  },

  // ---- Aug 4/5 — Tyndrum -----------------------------------------------------
  // From "Grocery.kmz" — Crianlarich is Day 4's mid-stop.
  {
    id: 'londis-crianlarich', name: 'Londis Crianlarich', kind: 'shop',
    dates: ['2026-08-04'], lat: 56.39210, lon: -4.61716,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-crianlarich', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-04'], lat: 56.39080, lon: -4.61825,
  },
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
  // From "Water.kmz".
  {
    id: 'water-tap-tyndrum-holiday-park', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-04', '2026-08-05'], lat: 56.43346, lon: -4.70833,
  },
  // From "Water.kmz" — at the Green Welly Stop complex, same site as
  // green-welly-stop above.
  {
    id: 'water-tap-green-welly', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-04', '2026-08-05'], lat: 56.43812, lon: -4.71276,
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
  // From "Grocery.kmz".
  {
    id: 'buth-bheag', name: 'Buth Bheag - The Wee Shop', kind: 'shop',
    dates: ['2026-08-05', '2026-08-06'], lat: 56.53271, lon: -4.80793,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-inveroran', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-05', '2026-08-06'], lat: 56.53280, lon: -4.80765,
  },

  // ---- Aug 6 — Kinlochleven ----------------------------------------------
  // On Rannoch Moor, between Inveroran and Kingshouse.
  {
    id: 'ba-cottage-turnoff', name: 'Ba Cottage Turnoff', kind: 'sight',
    dates: ['2026-08-06'], lat: 56.604444, lon: -4.807787,
  },
  // https://maps.app.goo.gl/D7f2Xfg2rQenS8bd8 — resolves to Kingshouse Hotel.
  {
    id: 'the-ways-inn', name: 'The Ways Inn', kind: 'food',
    dates: ['2026-08-06'], lat: 56.65143, lon: -4.84122,
  },
  // From "Water.kmz" — near Kingshouse, on the route despite the "Glencoe"
  // name (the ski resort sits at the top of the glen, right by the trail).
  {
    id: 'water-tap-glencoe-mountain-resort', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-06'], lat: 56.63302, lon: -4.82684,
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
  // From "Honesty Box.kmz" — in Kinlochleven itself, on both the Day 6
  // arrival evening and the Day 7 departure morning.
  {
    id: 'wee-midgie-honesty-box', name: 'The Wee Midgie Honesty Box', kind: 'food',
    dates: ['2026-08-06', '2026-08-07'], lat: 56.71659, lon: -4.96528,
  },
  // https://maps.app.goo.gl/kVRXYnKCR6cupccDA — Day 6 dinner alternative /
  // Day 7 breakfast. Coordinates given directly as 56°42'48.5"N, 4°57'48.6"W
  // (the short link couldn't be resolved from this environment).
  {
    id: 'the-highland-getaway', name: 'The Highland Getaway', kind: 'food',
    dates: ['2026-08-06', '2026-08-07'], lat: 56.71347, lon: -4.96350,
  },
  // From "Grocery.kmz".
  {
    id: 'coop-kinlochleven', name: 'Co-op Food Kinlochleven', kind: 'shop',
    dates: ['2026-08-06', '2026-08-07'], lat: 56.71301, lon: -4.96423,
  },
  // From "Water.kmz".
  {
    id: 'water-tap-kinlochleven', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-06', '2026-08-07'], lat: 56.71370, lon: -4.96260,
  },
  // From "Water.kmz" — same site as blackwater-pods above.
  {
    id: 'water-tap-blackwater', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-06', '2026-08-07'], lat: 56.71439, lon: -4.96034,
  },

  // ---- Aug 7 — Fort William ---------------------------------------------
  // Between the Tigh-na-Sleubhaich ruins and Glen Nevis.
  {
    id: 'dun-deardril-turnoff', name: 'Dun Deardril Fort Turnoff', kind: 'sight',
    dates: ['2026-08-07'], lat: 56.785987, lon: -5.072113,
  },
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
  // From "Water.kmz".
  {
    id: 'water-tap-glen-nevis', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-07'], lat: 56.80560, lon: -5.07392,
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
  // From "Water.kmz".
  {
    id: 'water-tap-fort-william', name: 'Water Tap', kind: 'water',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.81638, lon: -5.11384,
  },
  // From "Grocery.kmz".
  {
    id: 'tesco-express-fort-william', name: 'Tesco Express', kind: 'shop',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.81980, lon: -5.10831,
  },
  // From "Grocery.kmz".
  {
    id: 'morrisons-fort-william', name: 'Morrisons', kind: 'shop',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.82161, lon: -5.10547,
  },
  // From "Gear Shop.kmz". The Green Welly Stop's own gear shop is not
  // repeated here — it's the same site as the shop-kind green-welly-stop
  // entry above, and adding a second marker on top of it would just stack.
  {
    id: 'nevisport', name: 'Nevisport', kind: 'gear',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.81992, lon: -5.10728,
  },
  // From "Gear Shop.kmz".
  {
    id: 'ellis-brigham', name: 'Ellis Brigham', kind: 'gear',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.82024, lon: -5.10434,
  },
  // From "Gear Shop.kmz".
  {
    id: 'cotswold-outdoor', name: 'Cotswold Outdoor', kind: 'gear',
    dates: ['2026-08-07', '2026-08-08'], lat: 56.81659, lon: -5.11347,
  },
];

// Trip data for the West Highland Way, Troop 600, August 2026.
// Source of truth is the "Daily" tab of the planning doc. Distances, ascents and
// depart-by times come from there; the older "Notes" tab disagrees and is ignored.

// Every place the app forecasts for. Order here defines the order of the
// latitude/longitude lists sent to Open-Meteo, so it must stay stable.
export const LOCATIONS = [
  { id: 'milngavie',   name: 'Milngavie',              lat: 55.9417, lon: -4.3122 },
  { id: 'dumgoyne',    name: 'Dumgoyne',               lat: 55.9986, lon: -4.3767 },
  { id: 'drymen',      name: 'Drymen',                 lat: 56.0619, lon: -4.4457 },
  { id: 'balmaha',     name: 'Balmaha',                lat: 56.0742, lon: -4.5617 },
  { id: 'rowardennan', name: 'Rowardennan',            lat: 56.1560, lon: -4.6420 },
  { id: 'inversnaid',  name: 'Inversnaid',             lat: 56.2400, lon: -4.6890 },
  { id: 'inverarnan',  name: 'Inverarnan',             lat: 56.3335, lon: -4.7175 },
  { id: 'crianlarich', name: 'Crianlarich high point', lat: 56.3860, lon: -4.6270 },
  { id: 'tyndrum',     name: 'Tyndrum',                lat: 56.4340, lon: -4.7130 },
  { id: 'orchy',       name: 'Bridge of Orchy',        lat: 56.5210, lon: -4.7690 },
  { id: 'inveroran',   name: 'Inveroran',              lat: 56.5495, lon: -4.8175 },
  { id: 'kingshouse',  name: 'Kingshouse',             lat: 56.6428, lon: -4.8140 },
  { id: 'kinlochleven',name: 'Kinlochleven',           lat: 56.7135, lon: -4.9640 },
  { id: 'sleubhaich',  name: 'Tigh-na-Sleubhaich',     lat: 56.7570, lon: -5.0180 },
  { id: 'fortwilliam', name: 'Fort William',           lat: 56.8180, lon: -5.1080 },
  { id: 'glasgow',     name: 'Glasgow Airport',        lat: 55.8660, lon: -4.4340 },
];

export const LOC = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

// Plain-English phonetic respelling, not IPA — the audience is a Scout troop,
// not linguists. Only the genuinely non-obvious names; skips ones an English
// speaker would just read correctly (Kingshouse, Fort William, Drymen-adjacent
// regulars). `label` is denormalised from LOCATIONS.name on purpose, so this
// list stays correct even if a display name changes, and so Edinburgh — a
// side-trip destination in the planning doc, not a route stop — can appear
// with no matching location id.
//
// Every respelling below was reviewed and corrected by Blair (trip leader)
// on 27 Jul 2026, superseding the research-sourced first draft. Six of the
// original fourteen changed on review — Rowardennan, Inverarnan, Orchy,
// Inveroran and Tigh-na-Sleubhaich all differed from what web research alone
// produced, and Tigh-na-Sleubhaich in particular turned out wrong in every
// syllable except "na". Edinburgh is his own preferred four-syllable form,
// not the clipped three-syllable one most guides give. Loch Lomond and Loch
// Linnhe were added afterward at his request and confirmed as proposed.
export const PRONUNCIATIONS = [
  { id: 'milngavie',    label: 'Milngavie',           respelling: 'mull-GUY' },
  { id: 'drymen',       label: 'Drymen',               respelling: 'DRIM-en' },
  { id: 'balmaha',      label: 'Balmaha',              respelling: 'bal-ma-HAH' },
  { id: null,           label: 'Loch Lomond',          respelling: 'lokh LOH-mund', note: 'the loch you walk beside, days 1-3' },
  { id: 'rowardennan',  label: 'Rowardennan',          respelling: 'ROW-a-DEN-an' },
  { id: 'inversnaid',   label: 'Inversnaid',           respelling: 'in-ver-SNAYD' },
  { id: 'inverarnan',   label: 'Inverarnan',           respelling: 'in-ver-AR-nun' },
  { id: 'crianlarich',  label: 'Crianlarich',          respelling: 'CREE-an-LA-rich' },
  { id: 'tyndrum',      label: 'Tyndrum',              respelling: 'TYNE-drum' },
  { id: 'inveroran',    label: 'Inveroran',            respelling: 'in-ver-OR-uhn' },
  { id: 'orchy',        label: 'Orchy',                respelling: 'OR-key' },
  { id: 'kinlochleven', label: 'Kinlochleven',         respelling: 'kin-lokh-LEV-en' },
  { id: 'sleubhaich',   label: 'Tigh-na-Sleubhaich',   respelling: 'Tee-nuh-SLOO-ich' },
  { id: null,           label: 'Loch Linnhe',          respelling: 'lokh LIN-ee', note: 'the loch on the Day 8 cruise' },
  { id: 'glasgow',      label: 'Glasgow',              respelling: 'GLAHZ-go' },
  { id: null,           label: 'Edinburgh',            respelling: 'ED-in-bur-uh', note: 'side trip, not on the trail' },
];

// Inline lookup for day-card headings: location id -> respelling.
export const PRONOUNCE_BY_ID = Object.fromEntries(
  PRONUNCIATIONS.filter((p) => p.id).map((p) => [p.id, p.respelling])
);

// Exposed stretches with no shelter. Offsets are hours after the depart-by time.
// These are marked so the numbers for that window can be surfaced; the app makes
// no judgement about whether the conditions are acceptable.
const EXPOSED = {
  conic:      { name: 'Conic Hill',        from: 1.5, to: 3.0,  at: 'balmaha' },
  rannoch:    { name: 'Rannoch Moor',      from: 0.5, to: 5.0,  at: 'kingshouse' },
  staircase:  { name: "Devil's Staircase", from: 7.0, to: 9.5,  at: 'kingshouse' },
  lairigmor:  { name: 'Lairig Mor',        from: 1.0, to: 6.0,  at: 'sleubhaich' },
};

// One entry per day. `mid` is where the group actually stops, taken from the
// doc rather than a geometric midpoint of the stage.
export const DAYS = [
  {
    date: '2026-07-31', label: 'Arrival',
    from: 'glasgow', mid: null, to: 'milngavie',
    arrive: '16:15',
    note: 'Land GLA 4:15 PM, transfer to Milngavie. Dinner 6:45 PM.',
    lodging: 'Premier Inn, Milngavie',
    travelDay: true,
    // Travel days have no walking window, so they name their stops explicitly
    // with the hours that actually matter at each.
    stops: [
      { role: 'End', loc: 'milngavie', from: 16, to: 23 },
    ],
  },
  {
    date: '2026-08-01', label: 'Day 1',
    from: 'milngavie', mid: 'dumgoyne', to: 'drymen',
    miles: 12.5, ascent: 961, departBy: '09:00', estLow: 5.5, estHigh: 6.5,
    lunch: { kind: 'inn', place: 'Dumgoyne', note: 'no reservation' },
    lodging: 'Kip in the Kirk, Drymen',
    note: 'Bags out 8:00 AM. Gentle farmland and forest.',
    exposed: [],
  },
  {
    date: '2026-08-02', label: 'Day 2',
    from: 'drymen', mid: 'balmaha', to: 'rowardennan',
    miles: 15, ascent: 1578, departBy: '08:00', estLow: 7, estHigh: 8,
    lunch: { kind: 'booked', place: 'Oak Tree Inn, Balmaha', time: '13:00' },
    lodging: 'Rowardennan Youth Hostel',
    note: 'Over Conic Hill, descend to Balmaha.',
    exposed: [EXPOSED.conic],
  },
  {
    date: '2026-08-03', label: 'Day 3',
    from: 'rowardennan', mid: 'inversnaid', to: 'inverarnan',
    miles: 13.9, ascent: 1886, departBy: '07:45', estLow: 7.5, estHigh: 8.5,
    lunch: { kind: 'packed', place: 'Inversnaid', note: '30-min stop' },
    lodging: 'Beinglas Campsite huts',
    note: 'Slowest terrain of the trip — rough, rooty loch shore. Decide on high route.',
    exposed: [],
  },
  {
    date: '2026-08-04', label: 'Day 4',
    from: 'inverarnan', mid: 'crianlarich', to: 'tyndrum',
    miles: 11.9, ascent: 1739, departBy: '09:00', estLow: 6, estHigh: 7,
    lunch: { kind: 'packed', place: 'Crianlarich high point' },
    lodging: 'By The Way, Tyndrum',
    note: 'Up Glen Falloch. Real Food Cafe 5:00–5:15 PM.',
    exposed: [],
  },
  {
    date: '2026-08-05', label: 'Day 5',
    from: 'tyndrum', mid: 'orchy', to: 'inveroran',
    miles: 9.1, ascent: 1020, departBy: '09:30', estLow: 4.5, estHigh: 5,
    lunch: { kind: 'booked', place: 'Bridge of Orchy Hotel', time: '13:00' },
    lodging: 'Inveroran Hotel',
    note: 'Short day; the 1 PM lunch at mile 7 sets the pace. Last dinner seating 6:15 PM.',
    exposed: [],
  },
  {
    date: '2026-08-06', label: 'Day 6',
    from: 'inveroran', mid: 'kingshouse', to: 'kinlochleven',
    miles: 19.3, ascent: 2398, departBy: '07:00', estLow: 12, estHigh: 12,
    lunch: { kind: 'packed', place: 'Kingshouse', note: '45–60 min max' },
    lodging: 'Blackwater Pods, Kinlochleven',
    note: 'No bail-out or mobile signal on Rannoch Moor. First exit is Kingshouse, mile 9.',
    exposed: [EXPOSED.rannoch, EXPOSED.staircase],
    crux: true,
  },
  {
    date: '2026-08-07', label: 'Day 7',
    from: 'kinlochleven', mid: 'sleubhaich', to: 'fortwilliam',
    miles: 15.7, ascent: 2059, departBy: '07:00', estLow: 8, estHigh: 9,
    lunch: { kind: 'packed', place: 'Tigh-na-Sleubhaich ruins' },
    lodging: 'Travelodge, Fort William',
    note: 'Long exposed glen. Fill water before the Lairig Mor — nothing for 12+ miles.',
    exposed: [EXPOSED.lairigmor],
  },
  {
    date: '2026-08-08', label: 'Day 8',
    from: 'fortwilliam', mid: null, to: 'glasgow',
    note: 'Seal Island cruise 10:30 AM. Bus to Glasgow 3:30 PM.',
    lodging: 'Premier Inn, Glasgow Airport',
    travelDay: true,
    stops: [
      {
        role: 'Cruise', loc: 'fortwilliam', from: 8, to: 15,
        note: 'Board 10:00 AM, departs 10:30 AM · Fort William harbour',
      },
      {
        role: 'End', loc: 'glasgow', from: 16, to: 23,
        note: 'Bus leaves Fort William 3:30 PM, ~4 hours',
      },
    ],
    // Open water: wind is what cancels a boat trip, so surface it on its own.
    marine: { name: 'Loch Linnhe', at: 'fortwilliam', from: 10, to: 12.5 },
  },
];

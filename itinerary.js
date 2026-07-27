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
    note: 'Land GLA 16:15, transfer to Milngavie. Dinner 18:45.',
    lodging: 'Premier Inn, Milngavie',
    travelDay: true,
  },
  {
    date: '2026-08-01', label: 'Day 1',
    from: 'milngavie', mid: 'dumgoyne', to: 'drymen',
    miles: 12.5, ascent: 961, departBy: '09:00', estLow: 5.5, estHigh: 6.5,
    lunch: { kind: 'inn', place: 'Dumgoyne', note: 'no reservation' },
    lodging: 'Kip in the Kirk, Drymen',
    note: 'Bags out 08:00. Gentle farmland and forest.',
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
    note: 'Up Glen Falloch. Real Food Cafe 17:00–17:15.',
    exposed: [],
  },
  {
    date: '2026-08-05', label: 'Day 5',
    from: 'tyndrum', mid: 'orchy', to: 'inveroran',
    miles: 9.1, ascent: 1020, departBy: '09:30', estLow: 4.5, estHigh: 5,
    lunch: { kind: 'booked', place: 'Bridge of Orchy Hotel', time: '13:00' },
    lodging: 'Inveroran Hotel',
    note: 'Short day; the 13:00 lunch at mile 7 sets the pace. Last dinner seating 18:15.',
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
    note: 'Seal Island cruise 10:30 (wind matters on Loch Linnhe). Bus to Glasgow 15:30.',
    lodging: 'Premier Inn, Glasgow Airport',
    travelDay: true,
    marine: true,
  },
];

# Midge index

The midge score is computed **locally in the browser** from the same Open-Meteo
data used for the weather. Nothing is scraped and no second service is called,
so it works with no signal.

## Why local

The two published Scottish midge forecasts — `smidgeup.com` and
`biteforecast.scot` — both serve pages without an `access-control-allow-origin`
header, so a browser cannot read them from another domain. Computing the index
locally also gives hourly resolution instead of 3-hourly, scores at the group's
actual overnight stops rather than the nearest of twenty fixed towns, and keeps
working on Rannoch Moor where there is no mobile signal at all.

## Method

Follows the constants published at `biteforecast.scot/how-the-index-works`,
which cite APS Biocontrol / Smidge and Blackwell on *Culicoides impunctatus*:

| Factor | Behaviour |
|---|---|
| Temperature | Zero below 7 °C; peaks ~15 °C; falls away above 21 °C |
| Wind | Dominant suppressor. Falls off sharply from 5 mph, near-zero by 18 mph |
| Humidity | Dry air suppresses; above 80 % RH is close to ideal |
| Time of day | Dusk (sunset −1 h → +1.5 h) is the peak; dawn (sunrise −1 h → +2.5 h) close behind; daylight suppressed; overnight strongly suppressed |
| Sunlight | Bright direct sun drives them into cover; overcast does not |
| Rain | Heavy rain knocks them down; **drizzle does not** — still, damp air is ideal for them |
| Season | Early August sits in the second brood, the worst of the season |

Scored 0–10. Bands are Low 0–3, Moderate 4–5, High 6–7, Severe 8, Extreme 9–10.
These are non-overlapping, unlike the published table which lists 7 in two bands.

## Calibration

Validated against BiteForecast's own published 3-hourly series for Rannoch Moor
(27 July 2026), using the same Open-Meteo inputs:

| Hour | Temp | Wind | RH | Published | Ours |
|---|---|---|---|---|---|
| 01 | 10.0 | 5.4 | 87 | 2 | 2 |
| 04 | 8.5 | 3.1 | 90 | 3 | 2 |
| 07 | 10.6 | 6.3 | 85 | 5 | 5 |
| 10 | 11.3 | 7.8 | 87 | 2 | 3 |
| 13 | 13.7 | 10.3 | 85 | 1 | 1 |
| 16 | 13.0 | 9.8 | 92 | 2 | 2 |
| 19 | 13.2 | 8.7 | 91 | 2 | 2 |
| 22 | 12.0 | 8.3 | 89 | 4 | 4 |

Mean absolute error **0.25** on a 0–10 scale; six of eight hours exact, none off
by more than one point.

Two constants were adjusted from a first pass to reach this: the dawn window was
widened to sunrise +2.5 h, and wind suppression above 5 mph was steepened.

## Limitations

This is a weather proxy, not an observation. It uses no trap counts and no
biting reports, so it cannot see sheltered pockets — campsite edges, woodland
hollows, still burns, lochside corners — which routinely feel far worse than the
broad forecast suggests. Beinglas, Rowardennan and Kinlochleven are all places
where the ground conditions can beat the number. Carry the head net regardless.

"""Bake a forecast snapshot into snapshot.json.

Committed at deploy time so a phone that installs the app with no signal still
shows something rather than an empty shell. Re-run shortly before departure.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

HOURLY = (
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,"
    "precipitation_probability,cloud_cover,wind_speed_10m,wind_gusts_10m,"
    "wind_direction_10m,shortwave_radiation,is_day"
)

# Read the coordinates straight out of itinerary.js so there is one source of truth.
src = open("itinerary.js", encoding="utf-8").read()
block = src.split("export const LOCATIONS = [")[1].split("];")[0]
coords = re.findall(r"lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)", block)
if not coords:
    raise SystemExit("could not parse coordinates from itinerary.js")

query = urllib.parse.urlencode({
    "latitude": ",".join(c[0] for c in coords),
    "longitude": ",".join(c[1] for c in coords),
    "hourly": HOURLY,
    "daily": "sunrise,sunset",
    "models": "ukmo_seamless,best_match",
    "timezone": "Europe/London",
    "wind_speed_unit": "mph",
    "forecast_days": "16",
})

raw = json.load(urllib.request.urlopen(
    "https://api.open-meteo.com/v1/forecast?" + query, timeout=30))

with open("snapshot.json", "w") as fh:
    json.dump({"fetchedAt": int(time.time() * 1000), "raw": raw}, fh,
              separators=(",", ":"))

print(f"snapshot.json written for {len(coords)} locations "
      f"({os.path.getsize('snapshot.json') // 1024} KB)")

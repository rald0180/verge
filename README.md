# Verge

**Climate adaptation that starts at your front door.**

Climate reports tell you the planet is in trouble. Verge tells you what to do
about your house.

Built for **NextStep Hacks 2026**, track: *Earth Forward*.

---

## What it does

You type in an address. Verge builds a hyperlocal climate risk profile for that
exact coordinate out of real observational and projection data, turns it into a
ranked, costed plan of things you can do this month, and grades your street from
a photo.

Three features, and only three:

1. **Risk Lens** — four dimensions scored 0 to 100 for your coordinate: heat,
   flood, air, and drought and fire weather, each with a plain-language verdict
   and the numbers behind it.
2. **Adaptation Planner** — five to seven ranked actions with estimated cost,
   effort and payback. Renters only ever see actions they are allowed to take.
   Exports to a one-page PDF.
3. **Street Audit** — drop in a photo of your street and get a cooling score,
   the surfaces detected in the frame, and three specific interventions.

## Status

**Phase 5 of 6 — polish.** All three features work end to end against live data
and are deployed. Address lookup, four scored risk dimensions, the
observed-versus-projected chart, the Claude-generated adaptation plan with PDF
export, and the vision-based street audit are all working at the live URL.

Remaining: the pitch video and the Devpost write-up.

The build is logged honestly, including the mistakes, in
[DECISIONS.md](DECISIONS.md) — two fabricated citations caught before release,
a flood score that moved 50 points because a street-level query resolved 570 m
away, a lazy import that tripled the bundle because one static import defeated
it, and an air-quality dial that claimed to be "Measured" when it never was.

## Screenshots

| | |
|---|---|
| ![Risk Lens](docs/screenshots/02-risk-lens-desktop.png) | ![Adaptation Planner](docs/screenshots/03-plan-desktop.png) |
| **Risk Lens** — four dimensions scored for one coordinate, each with its plain-language verdict and the numbers behind it | **Adaptation Planner** — ranked, costed actions for this specific profile, renter-filtered server-side |

![Street Audit](docs/screenshots/04-street-audit-desktop.png)

**Street Audit** — surfaces read from a photograph, a cooling score, and three
interventions whose temperature ranges come from cited literature rather than
from the model.

![Mobile](docs/screenshots/05-risk-lens-mobile.png)

Regenerate these with `node scripts/screenshots.mjs` while the dev server is
running.

## Running it

```bash
npm install
npx vercel dev
```

**Use `vercel dev`, not `npm run dev`.** The `/api` routes are Vercel serverless
functions; the plain Vite dev server does not serve them, so geocoding, the
planner and the street audit all fail silently under `npm run dev`. That
dev/prod divergence is what caused the Phase 1 deployment bug.

```bash
npm run build   # tsc across three projects, then vite build
npm test        # unit tests for the pure scoring maths
``` `ANTHROPIC_API_KEY` is
read only inside `/api` and never reaches the client bundle — see
[.env.example](.env.example).

## Stack

Vite, React 18, TypeScript (strict, zero `any`), Tailwind CSS v3, recharts,
framer-motion, lucide-react, @react-pdf/renderer. Deployed on Vercel.

## Data sources

All free, keyless and CORS-enabled.

| Purpose | Source |
|---|---|
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org) / OpenStreetMap |
| Current conditions | [Open-Meteo forecast](https://api.open-meteo.com) |
| Air quality | [Open-Meteo air quality](https://air-quality-api.open-meteo.com) |
| Historical observations | [Open-Meteo ERA5 archive](https://archive-api.open-meteo.com) |
| Downscaled CMIP6 projections | [Open-Meteo climate](https://climate-api.open-meteo.com) |
| Elevation | [Open-Meteo elevation](https://api.open-meteo.com) |

Published references used in the scoring maths, all named in
[`src/lib/scoring.ts`](src/lib/scoring.ts) next to the code that uses them:

- European Air Quality Index band structure (European Environment Agency).
  Applied to CAMS model output via Open-Meteo — an 11 km grid over Europe and
  45 km elsewhere, so this is a modelled concentration for a grid cell, not a
  sensor reading. The UI labels it modelled for that reason.
- WHO 2021 global air quality guidelines, 24-hour means: PM2.5 15 µg/m³,
  PM10 45 µg/m³.
- Chandler Burning Index (Chandler et al., 1983), a temperature and
  relative-humidity fire-weather index. Note it is defined over *monthly mean
  afternoon* values and we feed it the current hour, as live weather stations
  generally do; its band edges are therefore approximate here.

### Urban heat island cooling ranges

Every temperature the Street Audit prints comes from this list, attached
server-side in [`api/audit.ts`](api/audit.ts). Ranges are conservative: where
sources disagree, the low end is taken from the more pessimistic study rather
than the headline figure.

| Intervention | Range | Measures | Source |
|---|---|---|---|
| Plant shade trees | 0.3 – 1.5 °C | air temperature | [Increasing tree canopy lowers urban air temperature by up to 1.5 °C in heat-prone areas](https://www.nature.com/articles/s42949-025-00277-x), npj Urban Sustainability (2025) — 0.8 °C for a 10% canopy increase, 1.5 °C for 30% |
| Lighten the roof | 1.2 – 3.3 °C | indoor peak temperature | [US EPA, Using Cool Roofs to Reduce Heat Islands](https://www.epa.gov/heatislands/using-cool-roofs-reduce-heat-islands) — maximum indoor temperature in non-air-conditioned homes. The EPA notes an outdoor effect but publishes no figure, so we quote none |
| Planting on the roof | 0.6 – 3.0 °C | roof surface temperature | [Environmental Research Letters 11:064004 (2016)](https://iopscience.iop.org/article/10.1088/1748-9326/11/6/064004) — under 1 °C at 25% coverage, ~3 °C at 100%; near-surface air fell only ~0.6 °C |
| Lighten or shade paving | 0.5 – 3.5 °C | air temperature | [Cool Pavements for the Mitigation of Urban Heat Island: A Global Perspective](https://www.intechopen.com/online-first/1217999) (IntechOpen, 2025) — reflective pavements lower urban-canyon air temperature by 0.5–3.5 °C |
| Swap hard surface for planting | about 0.9 °C | air temperature | Bowler, Buyung-Ali, Knight & Pullin, [Urban greening to cool towns and cities: a systematic review](https://www.sciencedirect.com/science/article/abs/pii/S0169204610001234), Landscape and Urban Planning 97(3):147–155 (2010) — meta-analysis: a park averaged 0.94 °C cooler by day. A point estimate, not a range, because that is what the review reports |

**Every figure above was re-checked against its source on 30 Aug 2026.** Two
did not survive. A "swap hard surface for planting" range of 1.18–1.26 °C had
no attributable source at all, and has been replaced with the Bowler
systematic review's actual finding. A "shade the walls" entry claiming up to
1.87 °C likewise had no source, and was removed rather than re-sourced — the
vertical-greenery literature reports anything from 0.66 °C to 7.14 °C
depending on the study, and picking a number out of that spread would have
been invention. Two smaller corrections: the paving range was 0.5–4 °C where
the chapter says 0.5–3.5 °C, and the cool-roof entry claimed a 0.3 °C outdoor
effect that the EPA page does not state.

**Two separate uncertainties stack here, and the UI says so.** These ranges were
measured in other cities under other conditions and are properties of the
*intervention type*, not predictions for your address. They are applied to a
vision model's estimate of what is in one photograph, which is itself an
estimate. A cool roof lowering roof surface temperature by ~30 °C, indoor peak
by 1–3 °C, and street air by close to nothing are all true at once; the column
above says which one each figure is.

## What we will not fake

This section is the point, not boilerplate.

- **Flood figures are indicative only.** They are a composite of the address's
  elevation relative to a sampled 1 km ring and the heaviest 24-hour rainfall in
  the archive for that cell. They ignore drainage, rivers, storm surge, soil and
  every piece of stormwater infrastructure — which is most of what a real flood
  study models. Every flood number in the UI carries that label. This is not a
  substitute for an official flood map.
- **Where no published index exists, the scale is ours and it is documented.**
  The heat and dryness ramps are our own, spelled out in full in `scoring.ts`,
  and the UI labels those scores `indicative` or `modelled` rather than
  `measured`.
- **The four risk dimensions are weighted equally in the composite**, because
  there is no published basis for weighting them differently. That is a stated
  assumption, not a finding.
- **Wind is not in the fire-weather score.** The published index we use takes
  temperature and humidity only. Wind is displayed as context and labelled as
  not scored, rather than folded in via a multiplier we invented.
- **No emissions scenario is claimed** until the exact SSP served by the
  Open-Meteo climate API has been confirmed against its documentation.
- **Costs are estimates in USD**, labelled as estimates everywhere they appear.
  They are not quotes.
- **Cooling effect ranges are published figures, not model output.** The Street
  Audit's vision model estimates surface composition and chooses which
  interventions apply; it never produces a temperature. Its response schema has
  no field for one. The °C ranges are attached server-side from the cited
  library below, and every figure is displayed with **what it measures** — air,
  surface, or indoor peak temperature — because those differ by an order of
  magnitude and quoting the largest without saying which would be the most
  misleading number this project could print.
- **This project was built with heavy AI assistance.** The commit history says
  so and so do we. It seemed better to own it than to be caught at it.

## Repo map

```
api/            serverless functions; the Anthropic key lives here and nowhere else
src/lib/        types.ts is the contract; scoring.ts is pure and testable
src/components/ ui/ holds the only button, input, card, badge, skeleton and error state
DECISIONS.md    the honest build log
BACKLOG.md      where scope creep goes to die
CLAUDE.md       the spec this project is built against
```

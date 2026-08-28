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

**Phase 1 of 6 — skeleton.** The toolchain, the type contract, the design
system, the four data wrappers and the scoring maths are in place, and address
lookup works end to end against live OpenStreetMap data. The risk dials, the
planner and the audit render their real empty states and are wired to their
contracts; the two serverless routes validate input and return a typed
`not-implemented` rather than placeholder data. Build progress is logged
honestly in [DECISIONS.md](DECISIONS.md).

## Running it

```bash
npm install
npm run dev
```

```bash
npm run build
```

The `/api` routes are Vercel serverless functions and are not served by the Vite
dev server. Use `vercel dev` to exercise them locally. `ANTHROPIC_API_KEY` is
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
- WHO 2021 global air quality guidelines, 24-hour means: PM2.5 15 µg/m³,
  PM10 45 µg/m³.
- Chandler Burning Index (Chandler et al., 1983), a temperature and
  relative-humidity fire-weather index.

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
- **Costs are estimates in AUD**, labelled as estimates everywhere they appear.
  They are not quotes.
- **Cooling effect ranges will be cited here** from published urban heat island
  literature before any cooling figure ships in the UI (Phase 4). They are
  applied to a vision model's estimate of surface composition, and both sources
  of uncertainty are stated on screen.
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

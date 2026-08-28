# BACKLOG

Where scope creep goes to die.

Scope is locked at three features in CLAUDE.md section 2. Anything that arrives
mid-build lands here and stays here until the three locked features are finished
end to end. Nothing is promoted off this list without a deliberate decision
written into DECISIONS.md.

---

## Real work, deferred to a named phase

These are not scope creep. They are known gaps with a home already.

- **Proxy Nominatim through a serverless function** so a compliant, descriptive
  `User-Agent` can actually be sent. Browsers refuse to set that header. First
  task of Phase 2. See DECISIONS.md, 2026-08-28.
- **Confirm the CMIP6 emissions scenario** served by the Open-Meteo climate API
  and put the exact string in the UI. Nothing may claim an SSP scenario until
  this is checked. Phase 2.
- **Wind in the fire-weather score.** Needs a drought factor with a real keyless
  source before the McArthur FFDI wind term can be used honestly. Phase 2 if a
  source turns up, otherwise it stays out and stays documented.
- **Downscale photos client-side before upload** so the Street Audit stops
  refusing files over 4 MB and instead resizes them. Phase 4.
- **Unit tests for `scoring.ts`.** The file is written to be pure precisely so
  this is easy. Phase 5.
- **Bundle size.** 681 kB raw / 202 kB gzipped, mostly `recharts` and
  `framer-motion`. Lazy-load the chart. Phase 5, not before.
- **Cite the urban heat island cooling ranges in README.md** with real sources,
  before any cooling figure appears in the UI. Phase 4.

## Ideas that are out of scope

Recorded so they stop taking up room in anyone's head.

- Comparing two addresses side by side.
- Saving or sharing a risk profile by URL.
- A suburb-level or council-level view.
- Seasonal breakdown of the heat projection.
- Native notifications on heatwave forecasts.
- Anything involving an account, a database, or a map of the world. These are
  explicit non-goals in CLAUDE.md section 2, not merely deprioritised.

## Added 2026-08-28, after the first deploy

- **Point Vercel's build command at `npm run build`** instead of the
  auto-detected `vite build`, so `tsc -b` runs in CI and a type error cannot
  ship silently. Phase 5. See DECISIONS.md, deployment entry.

## Added 2026-08-28, Phase 2

- **Server-side rate limiting for the geocode proxy.** The edge cache and
  one-lookup-per-press keep us well inside Nominatim's limit at demo traffic,
  but there is no token bucket. If this ever saw real traffic it would need one.
- **Represent an unavailable dimension distinctly** instead of failing the whole
  profile. `RiskScore` has no "unknown" variant, so a missing air reading
  currently fails everything rather than showing three dials and one marked
  unavailable. Needs a type change that ripples into Badge, RiskDial and Verdict.
- **The dryness ramp saturates too easily.** 0–30 consecutive dry days hits 100
  for any Mediterranean climate; Perth's record run is 109 days. The score is
  not wrong, but it does not discriminate between "dry" and "extraordinarily
  dry". Revisit the ramp with a wider top end.
- **A proper visual design pass on the deployed site**, since the browser pane
  could not paint during Phase 2 and layout was verified geometrically instead.

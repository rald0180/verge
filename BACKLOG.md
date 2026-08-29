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
- ~~**Downscale photos client-side before upload** so the Street Audit stops
  refusing files over 4 MB and instead resizes them.~~ **Done 2026-08-30.**
  The browser now resizes to 1600 px on the long edge and re-encodes as JPEG
  before upload — a 7.2 MB photo became 0.46 MB. Also fixed a real bug found
  while measuring: Vercel rejects a request body over ~4.5 MB, which base64
  reaches at about 3.4 MB of image, so files between 3.4 and 4 MB passed the
  old client check and then died at the platform edge with an HTML 413 the
  client could not parse.
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

- ~~**Point Vercel's build command at `npm run build`** instead of the
  auto-detected `vite build`, so `tsc -b` runs in CI and a type error cannot
  ship silently.~~ **Done 2026-08-28**, pinned in `vercel.json` and confirmed in
  a real build log. Pulled forward from Phase 5 because connecting the repo made
  deploys automatic, which turned it from untidy into load-bearing.

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

## Added 2026-08-28, after wiring the repo to Vercel

- **Nothing tests the typecheck gate.** `tsc -b` is now confirmed to *run* on
  every deploy, but we have never confirmed it *blocks* one. Proving it would
  mean pushing a deliberate type error to a public repo and reverting it. Worth
  doing once, in a throwaway branch rather than on `main`, before the submission
  window closes.
- **`vercel dev` is the documented local workflow but nothing enforces it.**
  Running `npm run dev` still works and silently omits `/api`, which is the
  dev/prod divergence that caused the Phase 1 bug in the first place. A note in
  README.md would be cheap.

## Added 2026-08-28, Phase 3

- **A street-only query resolves to an arbitrary point on that street**, and the
  flood term is extremely sensitive to it. "Rokeby Rd, Subiaco" resolved to
  -31.9511 one day and -31.9460 the next — 570 m apart on the same road — and
  the flood score moved 28 → 78, flipping the dominant risk and producing an
  entirely different plan. Mitigated for now by asking for a street number in
  the field hint. The real fixes are to show the user which point was chosen on
  a small map, or to sample a short run of the street and present a range
  instead of a point. Phase 5 at the earliest.
- **The impact-per-dollar sort favours cheap trivia.** Cost is floored at $1, so
  a $0 action ranks on raw impact while a $250 action is divided by 250. It has
  not misbehaved badly yet, but "check your insurance policy" outranking
  "top up ceiling insulation" is a plausible failure. Consider ranking within
  budget bands, or a dampened denominator.
- **The renter gate has never fired.** Instrumented and logging
  `{returned, dropped}`; `dropped` was 0 across every renter run including a
  deliberately tempting over-$2,000 budget at heat 88. The filter is correct
  defensive code but its behaviour on a model that *does* return unsafe actions
  is unverified. Worth a deliberate test with a weakened prompt.

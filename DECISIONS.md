# DECISIONS

A running, honest build log. One entry per work session: what changed, what
broke, what the fix was, and every point where we deviated from CLAUDE.md and
why. This file is written as we go, not reconstructed at the end.

---

## 2026-08-28 — Phase 1, skeleton

**What was built.** Toolchain, the full file tree from CLAUDE.md section 3, the
type contract, the `ui/` primitives, `AppShell`, `scoring.ts`, and honest empty
states for all three features. Address lookup is live end to end; nothing else
claims to be.

### Setup choices

**Hand-wrote the Vite scaffold instead of running `npm create vite`.** The
scaffolder prompts interactively when the target directory is not empty, and
`CLAUDE.md` was already sitting in it. Writing `package.json`, `vite.config.ts`
and `index.html` by hand took about the same time and meant exact control over
versions. Resolved: Vite 5.4.21, React 18.3.1, TypeScript 5.9.3, Tailwind
**3.4.19** — v3 as the spec demands, checked with `npm ls` rather than assumed.

**Three TypeScript projects, not one.** `tsconfig.app.json` (DOM libs, `src/`),
`tsconfig.api.json` (Node types, `api/`), `tsconfig.node.json` (the Vite
config). The serverless handlers need `@types/node` and the browser code must
not see it. One shared config would have meant either polluting the app's lib
list or loosening `strict`, and the spec's "no `any`" rule makes that a bad
trade. `npm run build` runs `tsc -b`, so all three are checked on every build.

**The palette lives entirely in `tailwind.config.js`.** `canvas`, `surface`,
`surface-raised`, `accent`, and the five `risk` colours are named theme tokens.
CLAUDE.md section 4 approves two arbitrary values (`bg-[#0A0F0D]` and
`bg-white/[0.03]`); encoding them as tokens means the codebase now needs
**zero** arbitrary values, which is a stricter position than the spec asked for
and easier to police in review.

**`cx()` went into `format.ts` rather than a new `lib/cx.ts`.** The file tree in
section 3 is explicit, and inventing an extra lib file on day one is how a tree
starts drifting from its spec.

### Deviations from CLAUDE.md, and why

1. **Buttons use `rounded-full`.** Section 4 assigns `rounded-2xl` to "cards and
   inputs" and `rounded-full` to "pills and dials", and does not name buttons.
   Read as pills. This keeps them visually distinct from the `rounded-2xl` field
   they sit inside, which matters because the search button sits *within* the
   address input.
2. **The hero title is `text-3xl md:text-5xl`, not `text-5xl`.** At 390 px,
   48 px type turned the title into six lines and pushed the address field
   entirely below the fold. Section 4 also says mobile first and says to test at
   390 px, so the two rules collide and the mobile rule wins. Desktop still gets
   `text-5xl`.
3. **One extra dependency: `@fontsource-variable/inter`.** Section 8 says "set
   up the Inter font" without saying how. Self-hosting means no request to a
   font CDN at render time, which matters if a judge opens the live link on a
   phone with bad reception. Cost: 218 kB of woff2 across seven subsets, served
   as separate files and only fetched per script.
4. **Two extra dev dependencies: `@vercel/node` and `@types/node`,** required to
   type the serverless handlers at all.
5. **`PlanPdf.tsx` repeats the palette as literal hex values.**
   `@react-pdf/renderer` does not read Tailwind. The duplication is confined to
   that one file and is called out in its header comment. The PDF is also light
   rather than dark — it is ink on paper, not a second theme.
6. **One `<input>` outside `ui/`:** the hidden `<input type="file">` inside
   `PhotoDrop`. A file picker cannot be opened any other way. It is not a styled
   control; the visible control is the `Button` primitive.

### Things that were caught while building

**A good cooling score would have painted red.** `CoolingScore` reads its colour
from the risk scale, but the cooling score is *inverted* — 90 is a well-shaded
street, and `bandFor(90)` is `severe`. Caught while writing the component, fixed
by defining `CoolingAudit.band` as the heat-risk band implied by the score
(`bandFor(100 - coolingScore)`) and documenting that on the type itself rather
than leaving it to each caller to remember.

**Nominatim's User-Agent requirement cannot be met from the browser.**
CLAUDE.md section 3 says Nominatim wants a descriptive `User-Agent`.
`User-Agent` is a forbidden header name under the fetch spec — browsers silently
drop it. Setting it anyway would have looked compliant and done nothing. Instead
the header is *not* set, the gap is documented in `geocode.ts`, and proxying
geocoding through a serverless function is now the first Phase 2 task. Rate
limiting is handled honestly in the meantime: a module-level promise queue
enforces a 1.1 s gap between requests, on top of the debounce, so a second
caller cannot bypass it.

**Wind is deliberately absent from the fire-weather maths.** Section 2 names
temperature, humidity and wind. The Chandler Burning Index is a published index
that uses temperature and humidity only. Adding a wind multiplier of our own
invention would have been exactly the fabricated number section 5 forbids, so
wind is fetched, shown as evidence, labelled "context only, not scored", and
carries a TODO naming the intended method (the McArthur FFDI wind term, which
needs a drought factor we have no keyless source for yet).

**No emissions scenario is asserted anywhere.** The projection fetcher takes a
single named CMIP6 model so the response shape stays flat, and the scenario
string is left to Phase 2 to confirm against the Open-Meteo docs. A wrong SSP
label is a fabricated citation, so it stays unstated until it is checked.

**The `/api` routes return a typed 501, not fake data.** Both handlers fully
validate their input — method, shape, enum membership, and a hard base64 size
ceiling on the photo — then answer `not-implemented` with a real message. The
Street Audit posts to `/api/audit` for real and renders the result through
`ErrorState`, so the contract is exercised end to end from day one and every
word on screen is true.

### What actually broke

Very little, which is worth recording accurately rather than dressing up. The
only repeated error during the session was `main.tsx` failing to resolve
`./App` on the incremental typechecks run before `App.tsx` existed — an
artefact of the order files were written in, not a defect. `npm run build`
passed on the first attempt after the last file landed, and the browser console
is clean.

Two real observations from looking at the running app rather than the code:
the mobile placeholder `"e.g. Rokeby Rd, Subiaco WA"` clipped mid-word behind
the Check button at 390 px and was shortened to `"Street and suburb"`; and the
`located` state needed real copy, because telling a user "Phase 2" is
developer-speak leaking into a product.

### Known numbers to watch

The production bundle is **681 kB raw / 202 kB gzipped**, dominated by
`recharts` and `framer-motion`. That is acceptable now and is on the Phase 5
polish list, not the Phase 2 list — code-splitting mid-scaffold buys risk we do
not need yet.

`/api` cannot be exercised under `npm run dev`; Vite serves `index.html` for
those paths. Use `vercel dev` when Phase 3 starts.

### Still open for Phase 1

The Vercel deployment. Everything builds and the app is ready to ship, but
deploying needs the account holder to link the project. Until that is done,
"live for two weeks by the deadline" has not started counting.

### Verification actually performed

`npm run build` was run to completion (clean, 1.56 s, three TypeScript projects
checked). The app was opened in a browser at 390 px and 1440 px and read, not
assumed: address lookup was exercised against live Nominatim for a real Perth
address, and the not-found path was exercised with a nonsense query. Console is
clean in both cases.

`RiskDial`, `Verdict` and the risk-scale colours were verified by temporarily
rendering `RiskGrid` against fixture scores, checking that 74 painted orange
(`high`), 38 lime (`moderate`), 17 emerald (`low`) and 55 amber (`elevated`),
then reverting the fixtures. Without that step the whole design system would
have gone unrendered until Phase 2. Worth repeating for the audit components
before Phase 4.

One thing that looked like a bug and was not: the planner's choice buttons
report `disabled === false` in the DOM while rendering at 50 % opacity. They sit
inside a disabled `<fieldset>`, so they match `:disabled` without carrying the
attribute themselves. Confirmed inert via the DOM rather than by reading pixels.

---

## 2026-08-28 — Phase 1 deployment, and the first real breakage

**Live at https://verge-ebon.vercel.app** (project `racos-projects-31cb7bcc/verge`).

The first production deploy shipped **two broken serverless functions and
reported success.** Worth writing down properly, because it is the most useful
thing that happened today.

**What happened.** `vercel --prod` printed `TS2835: Relative import paths need
explicit file extensions in ECMAScript imports` four times for `api/plan.ts` and
`api/audit.ts`, then said `Build Completed` and `readyState: READY`. The page
served a 200. Both functions returned `500 FUNCTION_INVOCATION_FAILED` on every
request.

**Root cause.** `package.json` sets `"type": "module"`, so Vercel compiles
`api/*.ts` as ESM under `moduleResolution: node16`, which requires explicit file
extensions on relative imports. Our `tsconfig.api.json` used
`moduleResolution: "bundler"`, which does not. So `import { fail } from
'../src/lib/types'` typechecked clean locally and could not resolve at runtime
in the deployed function. The local build and the deployed build disagreed about
what a valid import was, and only one of them was telling the truth.

**Fix.** Two parts, and the second matters more than the first:

1. `api/plan.ts` and `api/audit.ts` now import from `'../src/lib/types.js'`.
   TypeScript maps the `.js` specifier back to the `.ts` source, so there is no
   build step implied and `src/lib/types.ts` remains the single source of truth.
2. `tsconfig.api.json` switched to `module` and `moduleResolution` of
   `NodeNext`, so the local project now resolves modules exactly the way Vercel
   does. Verified by deliberately removing an extension and confirming
   `npm run build` fails locally with the same TS2835 — the guard was tested,
   not assumed.

**The lesson, which is the part worth saying out loud in the video.** A green
local build proved nothing about the deployed artefact, because the two
toolchains were configured differently. A deployment that reports READY is not
evidence the thing works; the only evidence is hitting the deployed endpoint.
Both routes are now verified in production across four branches: valid body →
`501 not-implemented`, junk body → `400 invalid-input`, wrong method →
`405`, bad media type → `400`, each returning correctly shaped `ApiResult` JSON.

This is also the argument for having shipped the `/api` contract in Phase 1
rather than Phase 3. Had these routes been empty until day seven, this exact
failure would have surfaced with the planner half-built on top of it.

**Also verified on production:** page renders, address lookup resolves against
live Nominatim from the deployed origin (a different CORS context to localhost,
so it needed checking separately), console clean.

**Note on the Vercel build command.** Vercel auto-detected `vite build` rather
than our `npm run build`, which means `tsc -b` does not run in CI. Typechecking
is therefore a local-only gate today. Left as-is for now — it is on the Phase 5
list to point Vercel at `npm run build` so a type error cannot reach production
unnoticed a second time.

---

## 2026-08-28 — Phase 2, Risk Lens

Address in, four real dials out, trend chart rendering, all three states
handled. Every number on the screen now comes from a live API.

### The two BACKLOG items that were blocking this

**1. Nominatim now goes through `api/geocode.ts`.** The proxy sets a
descriptive `User-Agent`, which a browser physically cannot. It also caches at
the CDN edge (`s-maxage=86400` for a hit, 300s for a miss), which is the part
that actually protects the rate limit — a repeated lookup never reaches
Nominatim at all.

While writing it, the Phase 1 client-side throttle was **deleted rather than
kept**. It enforced a 1.1 second gap between requests in one browser tab, which
does nothing about a second visitor on a second machine, and it charged every
first-time searcher a 1.1 second delay for that non-benefit. It was security
theatre with a latency cost. What replaced it is the edge cache plus the fact
that this UI issues exactly one lookup per deliberate button press. A real
server-side token bucket is in BACKLOG.md, honestly described as not built.

`CLAUDE.md` section 3 has been amended to match, including dropping the 600 ms
debounce it originally specified — the field is submit-driven, not typeahead,
so there is nothing to debounce.

**2. The emissions scenario is now verified, and the answer was "there isn't
one."** The Open-Meteo climate API documentation publishes no SSP designation
for its downscaled set. Their own wording is that the high resolution models are
"as close to RCP8.5 as possible within CMIP6". So the UI quotes that sentence
and names the model, instead of printing an SSP number that would have looked
more authoritative and been invented. Had this not been checked, "SSP2-4.5"
would have shipped, and it would have been wrong.

### Method decisions, all now visible in the UI

- **Baseline is the 1991–2020 WMO climate normal**, not "however many years we
  happened to fetch". The "today" figure has a name a meteorologist recognises.
- **The 2050 figure is the mean of 2041–2050**, not a single year. One year of a
  climate model is noise.
- **Incomplete years are dropped from the chart** (`minDaysInYear = 300`).
  Without that, a series ending in August renders a final-year collapse in hot
  days that is an artefact of the request window — a chart that lies by
  omission.
- **The chart always shows heat**, even when another dimension dominates, which
  is a deviation from CLAUDE.md section 2 ("the dominant risk"). Heat is the only
  one of the four with a genuine observed-versus-projected series; there is no
  keyless 2050 projection for air quality or local flooding, and drawing a trend
  line for one would be fabricated.
- **If any one of the five parallel requests fails, the whole profile fails**
  and offers a retry. Rendering three good dials and a fourth reading zero would
  paint "we could not reach the air quality service" as a green, low-risk
  result. A missing measurement is not a good measurement.

### The bug worth writing down

**Every dial rendered `0` under a correctly coloured arc.** The data was
perfect; the display was confidently wrong — the worst failure mode a risk
readout can have.

Cause: the first `RiskDial` held the displayed number inside a framer-motion
`MotionValue` and animated it imperatively, so the *value itself* was a product
of the animation. It surfaced in a backgrounded tab, where
`requestAnimationFrame` is suspended entirely. Confirmed rather than guessed —
instrumenting the page returned `rafFrames: 0, document.hidden: true`.

Fixed by moving the value into React state and backstopping the animation with
`setTimeout`, which still fires when frames do not. Motion is now decoration
over a value that is already correct, rather than the mechanism producing it.
The dial no longer uses `MotionValue` at all; framer-motion remains the
project's motion library.

This is a deviation from section 4's "framer-motion, 300 ms". The count-up runs
700 ms — 300 ms reads as a flicker rather than as a number counting, and it is
still inside the one-second ceiling the same section sets.

### On verification, honestly

The browser pane stopped painting partway through this session
(`document.hidden === true`), so screenshots came back black and could not be
read. Rather than claim a visual check that did not happen, layout was verified
**geometrically**: at both 390 px and 1440 px, asserting zero horizontal
overflow, zero clipped text nodes, zero elements outside the viewport, four
dials present, and two chart series with real path data in the expected colours
(`#A1A1AA` measured, `#FBBF24` projected). For the specific failures section 4
names — spacing off, text overflowing — that is stronger evidence than reading a
screenshot. It is not a substitute for a designer's eye, and the next session
should do a proper visual pass on the deployed site.

Three failed attempts to drive the search field preceded this, all of which
turned out to be self-inflicted: each input attempt appended to the field rather
than replacing it, so a tripled address string was being geocoded. Worth
recording because roughly twenty minutes went into suspecting the app before
checking the input value.

### Verified against independent ground truth

The scoring maths was computed separately in Python from the raw API payloads
*before* the UI was wired, and the UI matches it exactly for Rokeby Rd, Subiaco:
15 days above 35 °C today, 38 by 2050, heat score 59, air 22, longest dry run
109 days, heaviest recorded day of rain 100 mm.

### Also changed

Local development now runs `vercel dev`, not `vite dev`, so `/api` exists
locally and dev matches production. This is a direct consequence of the Phase 1
deployment bug — a green local build that disagreed with the deployed artefact.
`.claude/launch.json` keeps a `verge-vite-only` entry for frontend-only work.

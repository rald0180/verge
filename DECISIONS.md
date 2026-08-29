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

---

## 2026-08-28 — Repository, and closing the CI gap

Two submission deliverables now exist and are public:
**https://github.com/rald0180/verge** and **https://verge-ebon.vercel.app**.

### One commit, not a reconstructed history

The repository was initialised after Phases 1 and 2 were already built, so it
holds a single honest initial commit that says exactly that. Manufacturing a
plausible-looking sequence of per-phase commits would have been inventing
history — the same category of dishonesty as inventing a data source, and
trivially detectable by anyone reading timestamps. `DECISIONS.md` carries the
real chronology instead, which is what this file is for.

`CLAUDE.md` is deliberately public. It is the most interesting artefact in the
repo and removing it would leave this log referring to a document nobody can
read. It does mean the project is now committed in public to the standard it
sets: every flood figure labelled indicative, no invented numbers, an honest
build log. Those are checkable claims now rather than private intentions.
Phases 3 and 4 are where that bites, because that is where a language model
starts producing dollar costs and cooling estimates that would be easy to let
stand unlabelled.

### Caught during the push

`.env.example` was silently untracked. When Vercel linked the project it
appended a broad `.env*` rule to `.gitignore`, which swallowed the template
documenting `ANTHROPIC_API_KEY` — a file README.md links to. Fixed with a
`!.env.example` negation. Found by auditing what was actually staged rather
than trusting the ignore file, which is the same habit that caught the api
import bug: check the artefact, not the intention.

The remote was then audited directly through the GitHub API rather than
locally: no `.env`, no `.env.local`, no `.vercel/`, no `node_modules`, no
`dist` among the 63 published paths.

### Push-to-deploy, and why the build command had to be fixed first

Connecting the repo to Vercel changes the risk profile of the Phase 1 bug.
Deploys were deliberate — run `vercel --prod`, watch it. They are now automatic,
so a type error would ship while nobody is looking. Vercel's auto-detected Vite
preset does not necessarily run `tsc -b`, which is how the broken `api/` imports
reached production in the first place while the deployment reported READY.

`vercel.json` now pins `buildCommand` to `npm run build`, kept in the repo
rather than as a dashboard setting so the choice is visible and travels with a
clone. Confirmed in a real build log, not assumed:

    > tsc -b && vite build
    Build Completed in /vercel/output [14s]

The connection itself was verified the same way. A push at 16:27:00 produced a
production deployment at 16:27:02 with no CLI command, Vercel created the
`verge-git-main-…` branch alias that only exists on a connected repo, and the
alias table confirmed `verge-ebon.vercel.app` had moved to the git-triggered
build.

### A verification that was wrong, and how

The first attempt to prove the live URL had moved compared the hashed JS asset
filename served by the alias against the new deployment. They matched the old
build, and the conclusion drawn was "the live URL is still on the old build".

That was wrong. The only change in the commit was adding `vercel.json`, which
does not affect the JS bundle, so both builds emit an identical content hash.
The test could not distinguish the two deployments and never could have. The
alias-to-deployment mapping was the correct check and showed the opposite.

Worth recording because it is the same failure as trusting `readyState: READY`:
a check that returns a confident answer while measuring the wrong thing is more
dangerous than no check. A content hash is evidence of *what* was built, never
of *which deployment is serving*.

### Still not proven

`tsc -b` is confirmed to run on every deploy. It has never been confirmed to
*block* one. That test requires deliberately pushing a broken commit, and it is
in BACKLOG.md rather than quietly assumed.

---

## 2026-08-28 — Phase 3, Adaptation Planner

The first feature where Claude produces the numbers rather than reading them
off an API. Everything below is built and verified except the model call
itself, which is blocked on `ANTHROPIC_API_KEY` — see "Not yet verified".

### Read the API reference instead of working from memory

Loaded the `claude-api` skill before writing `api/plan.ts` rather than writing
from recall, and it changed three decisions:

- **Structured outputs, not tool use.** `output_config.format` with a JSON
  schema constrains the response shape directly. It also has real limits that
  would have cost an hour of debugging: the schema validator rejects
  `minimum`/`maximum`/`minLength`, so every range in `PLAN_SCHEMA` is
  unconstrained and clamped in `toAction` instead.
- **Thinking is ON by default on Claude Opus 5**, and shares `max_tokens` with
  the response text. A budget sized for the answer alone would have truncated
  mid-plan. Set to 12,000.
- **`temperature` would have returned a 400.** It is removed on this model.
  The instinct to reach for it to vary output is now simply wrong.

Effort is set to `medium` rather than the `high` default. This is structured
generation behind a 60-second function timeout with a person watching a
spinner, and effort is the honest latency lever — the guidance is explicitly to
sweep down from the default rather than inherit it. Worth re-testing against
real output once there is output to compare.

`maxDuration = 60` is exported from the function because Vercel's default is 10
seconds, which a thinking model will exceed.

### The renter gate is code, not a prompt

CLAUDE.md section 2 says renters get renter-legal actions only, and calls it a
detail judges notice. It is enforced twice, and the second one is the real one:

1. The prompt states the constraint and defines what renter-safe means.
2. `api/plan.ts` **filters `renterSafe === false` out of the response** before
   anything is returned.

A model asked nicely for renter-safe actions will occasionally suggest
replacing a roof. Asking is not enforcing. The `renterSafe` field has existed
on `AdaptationAction` since Phase 1 for exactly this.

Every field of every action is also validated against the type before it
reaches React — structured outputs make malformed JSON unlikely, not
impossible, and one bad action is dropped rather than failing the whole plan.
An action returning `high` cost below `low` is reordered rather than rejected;
that is a fumble, not a lie.

### The bundle nearly tripled, and the first fix did not work

Wiring the PDF export took the bundle from **202 kB gzipped to 643 kB** — a
3.2× increase for a button most visitors never press.

The first fix was to `await import('@react-pdf/renderer')` inside the click
handler. It changed nothing, because `PlanList` still had a *static*
`import { PlanPdf }` at the top, and `PlanPdf` imports the library at module
scope. One static import anywhere in the chain anchors the whole dependency
into the main bundle no matter how lazily the call site loads it.

Both imports are now dynamic and resolved together. The library is a separate
1.3 MB chunk (436 kB gzipped) fetched only on click, and the main bundle is
back to **205 kB gzipped** — 3 kB above Phase 2 for a whole feature.

The lesson generalises: lazy-loading is a property of the *import graph*, not
of the call site. Checking the built output caught this; reading the code did
not, because the code looked correct.

### Also decided

- **The plan resets when a new address is searched.** A plan is about one risk
  profile, and leaving a stale one under a new profile would be quietly wrong.
- **Only four numbers and a suburb name go to the API.** Not the full profile:
  the coordinates, the street address and the evidence arrays stay in the
  browser. The planner does not need to know exactly where someone lives to
  tell them their roof is dark.
- **`usePlan.ts` added to `src/hooks/`**, and CLAUDE.md's tree amended to
  match — same pattern as `api/geocode.ts` in Phase 2.

### Verified

Validation paths, locally through `vercel dev`: wrong method → 405, junk body →
400, invalid enum (`tenure: "squatting"`) → 400, missing key → typed 503.

The whole client chain end to end: address search → risk profile → the
"Build my plan" button unlocking on a real profile → POST → typed error
surfaced through `ErrorState` with the server's own wording.

### Verified against the live model

The key landed and the first call failed with a 400: *"Your credit balance is
too low."* The key was fine; the account was empty. Worth recording because the
first fix was not to the code — it was **adding a `console.error` to the catch
block**. The handler returns deliberately generic messages so upstream detail
never leaks to users, and it logged nothing, so the failure was an
undiagnosable 502. With one log line the cause was obvious in a single attempt.
Generic user-facing errors and silent server-side failures are not the same
trade-off, and shipping the first without the second is a mistake.

That failure also exposed a real bug: every `APIError` was marked
`retryable: true`, including 400s. A 400 fails identically forever, so the UI
would have offered a Try Again button that could never work. Now only 5xx is
retryable.

**Cost, measured rather than estimated.** Three runs: 1,288–1,303 input tokens
and 1,668–2,097 output tokens, which at $5/$25 per million is **$0.048–$0.059
per plan**. The earlier 5–10 cent estimate was right, at the low end. Thinking
tokens are roughly two thirds of the output and therefore of the cost.

**Effort, swept rather than assumed.** `low` returns in ~23s against ~29s for
`medium`, but drops the ceiling-insulation top-up — the highest-impact
intervention available to a Perth house — in favour of filler scoring 35. Six
seconds is not worth that on the feature carrying Originality. Kept `medium`;
observed range 28–35s against the 60s function ceiling.

The honest fix for a 30-second wait was not a faster model but **saying so**:
the loading copy now tells the user it takes about half a minute and why.

**Output quality is genuinely specific.** The plans reference the actual scores
and know the place — older Subiaco homes, thin ceiling insulation, unshaded
west-facing glass, water restrictions, 40-degree days. Not generic
sustainability advice, which was the risk.

**Sorting works.** Impact per dollar, descending, verified across a full plan.

**PDF export works.** A 7,586-byte `application/pdf` blob, produced from the
lazily-loaded chunk, no errors.

### The renter gate has never fired

`{returned: 7, dropped: 0}` on every renter run, including a deliberately
tempting case — renting, budget over $2,000, heat at 88, where structural work
is most attractive. The model respects the constraint unprompted.

So the filter is correct defensive code that has never actually caught
anything. That is worth stating plainly rather than reporting as a passing
test: the prompt is doing the work, and the backstop's behaviour against a
model that *does* return unsafe actions remains unverified. It is instrumented
now, so if it ever fires in production the logs will show it.

### The flood score moved 50 points at the same address

Phase 2 measured flood 28 at "Rokeby Rd, Subiaco". Phase 3 measured **78** for
the same query — dominant risk flipping from heat to flood, and a completely
different plan.

Not a bug. Nominatim resolved the query to -31.9460 rather than -31.9511: a
different point on the same street, 570 m north, where the ground sits 12.5 m
*below* its surroundings instead of 7.5 m above. The terrain term saturates and
the score is legitimately high there. The maths did exactly what it says.

The real problem is the product's own copy. The address field said "Street and
suburb is enough", which is false for flood in a way that matters — a
street-only query lands on an arbitrary point, and this app claims to be about
*your exact spot*. The hint now asks for a street number and says why.

This is the most useful thing the whole phase turned up, and it argues the
"indicative" label on flood is doing real work rather than covering us.

---

## 2026-08-29 — Phase 4, Street Audit

Section 7 sets the constraint that determined the whole design: cooling
estimates must be *published ranges cited in README.md*, applied to an AI
estimate of surface composition. So this phase began with research, not code.

### The model cannot state a temperature, by construction

The vision model estimates surface composition and chooses **which** of six
interventions apply. It never supplies a °C figure — and this is not enforced
by asking it nicely in the prompt. **The response schema has no field for a
temperature at all.** The model returns an id from a fixed enum plus a
one-sentence rationale; the server looks up the published range from
`COOLING_LIBRARY` and attaches it.

A number a model cannot express is a number it cannot invent. This is the same
shape as the Phase 3 renter gate but strictly stronger: the renter filter
removes bad output after the fact, whereas here the bad output is
unrepresentable.

### What each figure measures is now part of the type

`Intervention` gained a `measures` field — `air temperature`, `surface
temperature`, or `indoor peak temperature` — plus a `scaleNote`.

This is the honesty crux of the feature. A cool roof lowers roof *surface*
temperature by around 30 °C, indoor *peak* temperature by 1–3 °C, and
neighbourhood *air* temperature by close to nothing. All three are true. Quoting
the largest without saying which one it is would be the most misleading number
this project could print, and it would have been the easy thing to do.

Making it a required field rather than prose in the citation means the UI
cannot render a figure without rendering what it measures.

### I nearly shipped two fabricated citations

Writing the library, I attributed the canopy figure to "Wang et al." and the
green roof figure to "Sharma et al.". **I had verified neither.** The searches
returned titles, journals and DOIs — never authorship. I had invented two
plausible-looking author names, which is precisely the failure CLAUDE.md
section 5 exists to prevent, in the one feature most explicitly about not
doing that.

Caught while writing the README, because putting a citation in front of a
reader forces you to check it in a way that writing a code comment does not.
Both now cite title and venue only. There are no author names anywhere in the
codebase except the Chandler index — which I then went and verified rather than
assuming, since I had just demonstrated my own unreliability on exactly this.

### That verification found a real methodology mismatch

The Chandler Burning Index is defined over **monthly mean afternoon**
temperature and humidity. We feed it the current hour. Live weather stations
publishing a CBI generally do the same, so it is defensible practice, but it is
not what the published definition specifies — which means the band edges (50 /
75 / 90 / 97.5) are approximate in our usage rather than exact. Now documented
in `scoring.ts` beside the formula.

### Also corrected: air quality was labelled "Measured"

Prompted by a direct question about whether Verge's data is real. It was not a
measurement. Open-Meteo's air quality is CAMS *model* output at 11 km over
Europe and 45 km elsewhere — for Perth, a single grid cell covering most of the
metropolitan area. The dial said "Measured".

Now labelled modelled, attributed to CAMS rather than the reseller, with the
resolution stated in the evidence line. After this change **no dial in the app
claims to be a direct measurement**, which is accurate: every input is model
output or reanalysis.

### Verified

- Synthetic test scene (a hand-built PNG of asphalt, grass, one tree canopy and
  a roofline): 200 in 10.4s. Read back dark asphalt 37%, lawn 31%, canopy 14%,
  dark roof 8%, sky 10% — close to what was drawn. Cooling score 45, band
  `elevated`, which is the correct inversion of 100 − 45.
- The `sceneIsOutdoor` guard: a document-like image returns a typed 422 in 3.6s
  telling the user to try a photo of their street, rather than scoring a page.
- Browser drag-and-drop end to end: image renders, five surface rows, all three
  interventions with range, measures, scale and full citation.
- 390 px: no overflow, no clipping.

### Not verified

**Quality against a real photograph.** Everything above used a synthetic image
of flat colour blocks. That proves the pipeline, not the perception. Surface
percentages, canopy estimates and intervention choice on a real street photo
with texture, shadow and mixed materials are untested.

**RESOLVED 2026-08-30.** Run against a real inner-suburban street: asphalt
32%, brick facade 25%, street trees 20%, concrete footpath 15%, shrubs 5%,
grassy verge 3% — summing to 100, with 72% impervious and a cooling score of
38. It also picked the three interventions that actually suit a sealed
shopping street. Perception holds outside the test image.

### One shared-code fix

`api/audit.ts` needed `bandFor` from `scoring.ts`, which meant adding it to the
api TypeScript project and giving its import an explicit `.js` extension —
the same NodeNext requirement that broke the Phase 1 deployment. Caught locally
this time by `tsc -b`, because the build command was pinned in Phase 2 to run
it. The band scale now has one definition shared by client and server rather
than a duplicated copy.

---

## 2026-08-29 — Phase 5, polish

Reading the rendered page rather than the source found two genuine defects that
code review had missed for two phases.

### The best action was painted red and announced as danger

`ActionCard` rendered `impactScore` through the `Badge` primitive. Badge picks
its colour from the risk scale, so the top-ranked action — the single most
useful thing on the page — displayed as **"SEVERE · 90" in red**, and announced
itself to screen readers as *"risk, 90 out of 100"*.

Exactly inverted: high impact is good. It also broke section 4's rule that the
five risk colours may only ever mean a risk level.

I had flagged this in an earlier answer and not fixed it. It only became
undeniable when the page was read as a user reads it. Impact is now a neutral
pill with honest screen-reader text naming it as the model's own estimate.

### Impact per dollar was degenerate

The spec said "sorted by impact per dollar". Implemented literally, dividing
impact by cost made cost the *only* variable that mattered: on real output a $0
admin task scoring 45 outranked ceiling insulation scoring 85 by two hundred to
one, and the two most effective actions in every plan sorted last. "Cheapest
first" is not "best value first".

Two alternatives were rejected on inspection. Ranking by impact alone ignores
cost. A comparator treating near-equal impacts as ties and preferring the
cheaper is **non-transitive** — with impacts 88, 85 and 78 and an 8-point
window, 88 ties 85 and 85 ties 78 but 88 does not tie 78, which is undefined
behaviour for `Array.sort` and a latent crash.

Now a single scalar: impact minus `15 × cost/(cost + 200)`. The penalty is
bounded below 15 points by construction, so impact stays dominant and a cheap
action overtakes a dearer one only when their impacts are genuinely close.
CLAUDE.md section 2 amended, since the spec's own rule was the problem.

### scoring.ts is finally tested

Hard rule 2 has committed since Phase 1 that the scoring maths "must be
unit-testable and it will be tested". It had not been. Twenty tests now cover
the ramps, the band boundaries at every edge, the null-handling in the archive
helpers, and the partial-year guard.

The valuable ones lock in real verified values rather than restating the code:
the Subiaco heat score of 59 derived independently in Python from ERA5 and
CMIP6 before any UI existed, and flood scores of 28 and 78 for the two
coordinates that one street query resolved to on different days. If someone
edits a ramp, those fail.

### Copy that had gone stale, and one more overstatement

Changing the ranking made three pieces of user-facing copy wrong, all still
promising "cheapest real impact first". Fixed in the section description, the
plan footer and the empty state.

`CONFIDENCE_LABELS.modelled` read "Modelled projection", which is right for the
2050 heat figure and wrong for a current air-quality estimate — a projection is
about the future. Now just "Modelled".

The trend chart said "Measured history in grey". ERA5 is a reanalysis, which
blends observations with a model; this is the same overstatement as the air
dial claiming to be "Measured", caught in the same spirit. Now "Historical
reanalysis".

### Screenshots

`scripts/screenshots.mjs` drives Playwright to capture five states at 1440 and
390 px. Worth automating rather than doing by hand because the UI will change
again before submission and the README should not drift.

One detail: a full-page capture renders `position: sticky` at its scrolled
offset, so the header appeared a second time halfway down the image and read as
a rendering bug. The script pins it to static for the capture only.

---

## 2026-08-29 — Design pass

Three changes, all inside the existing visual system — no new colours, radii or
primitives, so section 4 is untouched.

### Evidence moved behind a disclosure

Every dial carried three or four lines of small grey source text, permanently
on screen. That is the honesty rule working, and it was costing the design far
more than it had to: four dials of it turned the Risk Lens into a spreadsheet
and buried the actual verdicts.

It is now one "How we got this" control per dial. The confidence label —
`Measured` / `Modelled` / `Indicative estimate` — stays visible either way, so
nothing that *qualifies* a number has moved out of sight. One click is not
hiding it. This was by far the biggest visual win available and it cost
nothing in substance.

### The dominant risk leads

Four identically weighted cards made the reader do the comparison themselves,
when the profile already knows which dimension is the problem. The dominant
risk is now sorted first, raised onto `surface-raised` with an accent ring, and
labelled "Biggest driver here".

At the test address this puts Flood at 78 in front of Heat at 62, which is the
correct story and was previously the third card down.

### The chart leads with its two numbers

"12 days a year today, 36 by 2050" is the fact people repeat after seeing this
app, and it was rendered only as the shape of a line and some axis ticks. The
chart now opens with both figures at 4xl, the projected one in its risk band
colour, each with the window it was averaged over. Chart height went 64 to 80.

`ClimateProjection` gained `baselineMean`, `projectedMean` and the two window
labels rather than having the chart re-derive them. If the chart computed its
own means it could silently disagree with the heat dial about what "today"
means; passing them through makes that impossible.

---

## 2026-08-30 — The photo limit was hiding a platform bug

Asked to raise the Street Audit's 4 MB cap, measured first rather than picking
a bigger number, and found the cap was the smaller problem.

Vercel rejects a serverless request body over roughly 4.5 MB. Base64 inflates
an image by a third, so that ceiling arrives at about **3.4 MB of photo** —
below the 4 MB the client was happily accepting. Probing production directly:
3 MB of image reached the function, 4 MB and 5 MB both came back
`413 FUNCTION_PAYLOAD_TOO_LARGE`.

So files between roughly 3.4 and 4 MB passed our own check and then died at
the platform edge, returning HTML that `response.json()` could not parse. The
user saw "the audit service returned unreadable data" — true, unhelpful, and
pointing at entirely the wrong thing.

Raising the limit would have widened that window rather than closing it.

**The fix is to resize, not to refuse.** The browser now downscales to 1600 px
on the long edge and re-encodes as JPEG before upload. A 7.2 MB photo becomes
0.46 MB — a 94% reduction — so the platform cap stops being reachable through
normal use at all. EXIF orientation is applied during the resize, because
phone photos are routinely stored sideways with a rotation flag and analysing
a rotated street is analysing a different picture.

The input gate is now a 30 MB sanity check rather than a hard 4 MB refusal,
the server backstop moved from 5.5 MB to 4.2 MB of base64 so it sits *under*
the platform cap and can answer in our own error shape, and a 413 that does
get through is now reported as too-large rather than unreadable.

**It also closed the oldest open question in the project.** The audit had only
ever seen a synthetic image of flat colour blocks. Testing the resize with a
real street photo finally answered whether the perception works, and it does.

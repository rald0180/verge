# CLAUDE.md — Project "Verge"

> Working spec and operating manual for the build agent.
> Read this file top to bottom before writing or changing any code. Re-read the **Thinking Loop** section before every output.

---

## 0. Ground truth about the competition

Re-verified against the live Devpost page and its rules and dates pages on
29 Aug 2026. If any of them changed, stop and re-check before acting.

| Item | Value |
|---|---|
| Event | NextStep Hacks 2026 |
| Theme (actual) | **"Earth Forward"** — environmental impact, explicitly including **climate resilience**, renewable energy, conservation, sustainable agriculture, waste reduction. It is NOT "AI & Social Good". |
| Hacking window | Opens 21 Aug 2026 12:00am EDT, closes 13 Sep 2026 5:00pm EDT |
| Deadline | 13 Sep 2026, 5:00pm EDT (14 Sep 2026, 5:00am Perth time) |
| Judging | 14–17 Sep. Winners announced 18 Sep, 9:00am EDT |
| Required deliverables | Video demo **3 to 5 minutes**, public repo link, live app link, completed Devpost project page |
| Judging criteria | Originality, Adherence to Track, Completion, Learning, Design, Technology |
| Weightings | Not published. Assume equal. |
| Eligibility | Ages **13 to 24 as of 21 Aug 2026**. Students only; companies and professional organisations excluded. Groups up to 5. |
| Disqualification | Plagiarised projects, or projects not completed within the time frame |
| Continuing prior work | If continuing an old project you MUST state on Devpost what was built before the hackathon and what was built during it |

**CORRECTION, 29 Aug 2026.** The video has a **minimum length of three minutes**,
not merely a five-minute cap — the rules page says "a video (3-5 minutes)".
An earlier reading of this file recorded only the maximum. A ninety-second
demo would be non-compliant. Feature 3 is still the ninety-second *moment*
within a three-to-five minute cut, not the whole video.

**No AI policy is published.** The rules disqualify plagiarism and late work,
and say nothing about AI-assisted development either way. Our position is
unchanged and stated in README.md: we disclose it plainly rather than hide it.

### What the criteria actually mean for our build

* **Adherence to Track** is the cheapest points on the board and the easiest to lose. Every screen must visibly be about the environment. No generic dashboard energy.
* **Completion** beats scope every time. A three-feature app where all three work end to end outranks a six-feature app with two broken. Scope is locked in section 2. Do not add features.
* **Design** is where most hackathon projects bleed points. The visual system in section 4 is non-negotiable.
* **Learning** is a scoring category, and it is the one a fully AI-generated project is weakest on. This does not change how we build, but it changes the submission: the Devpost write-up and the video must include a genuine, specific account of what was hard, what broke, and what was figured out. Keep a running `DECISIONS.md` from day one so that account is real and not invented at the end.
* **Originality** comes from the framing, not the tech. Plenty of teams will submit a carbon calculator. Almost nobody will submit an app that tells you what to do about your own street.

---

## 1. The product

**Verge** — climate adaptation that starts at your front door.

Alternative names if "Verge" reads wrong to you: Groundline, Thresholds, Streetwise, Nearby.

**The problem.** Climate information exists at the scale of nations and decades. People live at the scale of one address and one summer. A homeowner or renter who wants to know "is my place going to get dangerous, and what do I actually do about it" has nowhere to go. Government risk portals are technical, static, and stop at telling you the risk.

**The product in one sentence.** You type in an address, Verge builds a hyperlocal climate risk profile for that exact spot out of real observational and projection data, then turns it into a ranked, costed plan of things you can do this month, and grades your street from a photo.

**Why this wins the track.** It is unambiguously environmental, it uses genuine climate science data rather than made-up numbers, it produces action rather than guilt, and it demos in ninety seconds.

**Positioning line for the video and Devpost:** "Climate reports tell you the planet is in trouble. Verge tells you what to do about your house."

---

## 2. Core architecture: the locked three-feature stack

Three features. Not four. If an idea arrives mid-build, it goes in `BACKLOG.md` and stays there.

### Feature 1 — Risk Lens (the hook)

One input, an address. Output, a live risk profile for that coordinate.

* Geocode the address to lat/lon.
* Pull four risk dimensions and score each 0 to 100:
  * **Heat** — days over 35C historically, versus days over 35C projected for 2050, from downscaled CMIP6.
  * **Flood** — a composite of local elevation relative to the surrounding 1km grid, plus the heaviest 24h rainfall on record for that cell. Label this clearly as **indicative**. See section 7 on honesty.
  * **Air** — current PM2.5, PM10, ozone, and the European AQI for that coordinate.
  * **Drought and fire weather** — consecutive dry days plus a simple fire weather proxy from temperature, humidity, and wind.
* Present as four animated radial dials with a plain-language verdict under each. "Your street will see roughly 31 days a year above 35C by 2050. Today it sees 9."
* Below the dials, one hero chart: observed versus projected trend to 2050 for the dominant risk.

This is the screen the judges will see first. It carries Design and Technology.

### Feature 2 — Adaptation Planner (the payoff)

The risk profile plus a few answers about the dwelling go to Claude, which returns a ranked plan.

* Three quick inputs, nothing more: dwelling type (house, apartment, sharehouse), own or rent, budget band.
* Claude returns exactly 5 actions as strict JSON (amended 2026-08-30: was 5 to 7. Seven actions cost about 28% more generated tokens and roughly the same share of the wait, and a list that gets read beats a longer one that does not), each with: title, what it does, which risk it reduces, estimated cost in USD, effort in hours, an impact score, and a payback note.
* Actions are ranked by impact with a bounded penalty for cost, and rendered as cards. (Amended 2026-08-29, Phase 5: a literal impact-per-dollar ratio was degenerate — dividing by cost made cost the only variable, so a $0 admin task outranked ceiling insulation 200 to 1 and the two most effective actions sorted last. The penalty is now capped at 15 points, so impact stays dominant. Reasoning in api/plan.ts.) Renters get renter-legal actions only. This detail matters and judges notice it.
* The whole plan exports to a single-page PDF. This is what makes it feel like a real product rather than a demo.

This carries Originality and Adherence to Track.

### Feature 3 — Street Audit (the wow)

Upload or drag in a photo of your street, yard, or balcony. Claude vision analyses it and returns a **cooling score**.

* It identifies surfaces (dark asphalt, concrete, roof colour, bare soil, lawn, canopy), estimates canopy cover and impervious fraction, and returns a 0 to 100 cooling score with three specific interventions.
* Each intervention carries an estimated local temperature effect with an explicit uncertainty range, sourced from published urban heat island ranges that we cite in the repo.
* Render as a before/after style split: the photo on the left with detected surfaces labelled, the score and interventions on the right.

This is the ninety-second video moment. It carries Technology and Originality.

### Presentation: four pages, still three features

Amended 2026-08-30. The three features are presented as a four-page flow —
Risk, Plan, Street, Summary — rather than one long scroll. Each step renders on
its own, and the current step is mirrored into the URL hash so the browser back
button works and a refresh keeps your place.

**The summary is a view, not a fourth feature.** It recomputes nothing; every
number on it was already produced by the step that owns it, so it cannot
disagree with the flow that built it. Scope is still locked at three.

Two rules the flow has to keep:

* Steps after the first need a resolved address, because the plan and the
  summary are both about one coordinate. Arriving at a locked step by URL,
  refresh or back button bounces to the first step rather than rendering an
  empty page.
* The progress rail ticks a step only when that step actually produced
  something, never merely because the user walked past it. Both middle steps
  are skippable, and a tick on a skipped step would have the rail claim work
  that was never done.

### Explicit non-goals

No accounts. No login. No database. No user data leaves the browser except the API calls. No map of the whole world. No leaderboard. No social feed. No mobile app. No blockchain, ever.

---

## 3. Technical shape

### Stack

* Vite + React 18 + TypeScript
* Tailwind CSS v3 (not v4, the ecosystem is still catching up and we cannot afford a config rabbit hole)
* `recharts` for the trend chart, `framer-motion` for the dials and transitions, `lucide-react` for icons
* `@react-pdf/renderer` for the plan export
* Deployed to Vercel. Two serverless functions in `/api` so the Anthropic key never touches the client.

### Data sources, all free and keyless with CORS enabled

| Purpose | Endpoint |
|---|---|
| Geocoding | `https://nominatim.openstreetmap.org/search` |
| Current and forecast weather | `https://api.open-meteo.com/v1/forecast` |
| Air quality | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| Historical observations (1940 to now) | `https://archive-api.open-meteo.com/v1/archive` |
| CMIP6 downscaled projections to 2050 | `https://climate-api.open-meteo.com/v1/climate` |
| Elevation | `https://api.open-meteo.com/v1/elevation` |

Nominatim requires a descriptive `User-Agent` and rate limits to one request per second. **`User-Agent` is a forbidden header in browsers**, so geocoding goes through `api/geocode.ts`, which sets it server-side and caches at the CDN edge. Results are cached in memory client-side. The address field is submit-driven rather than typeahead, so the 600ms debounce originally specified here is not needed — one deliberate press, one lookup. (Amended 2026-08-28, Phase 2.)

### File tree

```
verge/
├── CLAUDE.md
├── DECISIONS.md          # running build log, feeds the Learning criterion
├── BACKLOG.md            # where scope creep goes to die
├── README.md
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── api/
│   ├── geocode.ts        # serverless: Nominatim proxy, sets a compliant User-Agent
│   ├── plan.ts           # serverless: risk profile -> adaptation plan JSON
│   └── audit.ts          # serverless: image -> cooling score JSON
└── src/
    ├── main.tsx
    ├── App.tsx            # the four-page flow; each step renders alone
    ├── index.css
    ├── lib/
    │   ├── geocode.ts
    │   ├── climate.ts        # all Open-Meteo fetches, typed
    │   ├── scoring.ts        # PURE functions, risk maths, no fetch calls
    │   ├── format.ts
    │   └── types.ts          # single source of truth for every shape
    ├── hooks/
    │   ├── useRiskProfile.ts
    │   ├── usePlan.ts         # added Phase 3: /api/plan state machine
    │   ├── useStep.ts         # added Phase 6: which page, mirrored to the URL hash
    │   └── useStreetAudit.ts
    └── components/
        ├── layout/       AppShell, Header, SectionHeading, StepNav, StepFooter, StepPage
        ├── summary/      SummaryPage
        ├── ui/           Card, Button, Field, Badge, Skeleton, ErrorState
        ├── lens/         AddressSearch, RiskDial, RiskGrid, TrendChart, Verdict
        ├── planner/      DwellingForm, ActionCard, PlanList, PlanPdf
        └── audit/        PhotoDrop, SurfaceOverlay, CoolingScore, Interventions
```

### Hard rules

1. `src/lib/types.ts` is the single source of truth. Every API response gets a named type. No `any`. No implicit `any`.
2. `src/lib/scoring.ts` contains pure functions only. Given the same inputs it returns the same outputs, no fetch calls, no dates read from `Date.now()` inside it. It must be unit-testable and it will be tested.
3. Every component that fetches has three visual states built at the same time as the happy path: loading skeleton, error state with a retry, and empty state. Never ship a component with only the happy path.
4. Both `/api` functions validate their input, and parse Claude's response inside a try/catch that falls back to a typed error rather than crashing the UI.
5. Ask Claude for JSON using a tool definition or a strict schema instruction, then validate the parsed object against the expected shape before it reaches React. Assume the model will occasionally wrap JSON in prose and handle it.
6. No secrets in client code. `ANTHROPIC_API_KEY` lives in Vercel env vars and is read only inside `/api`.

---

## 4. The visual system

One system, applied everywhere. Inconsistent spacing and six different button styles is what makes a hackathon project look like a hackathon project.

### Palette

Dark by default. Do not build a light mode, it is scope we do not have.

```
background      bg-[#0A0F0D]
surface         bg-white/[0.03] with ring-1 ring-white/10
surface raised  bg-white/[0.06]
text primary    text-zinc-100
text secondary  text-zinc-400
text muted      text-zinc-500
accent          emerald-400   (#34D399)
accent quiet    emerald-400/10 backgrounds, emerald-300 text
```

Risk scale, used consistently across dials, badges, and chart fills. Never use these five colours for anything that is not a risk level.

```
0-20   low        emerald-400
21-40  moderate   lime-400
41-60  elevated   amber-400
61-80  high       orange-500
81-100 severe     red-500
```

### Rules

* Radius: `rounded-2xl` for cards and inputs, `rounded-full` for pills and dials. Nothing else.
* Spacing: multiples of 4 only. Section padding `p-6` on mobile, `p-8` from `md:`. Vertical rhythm between sections `space-y-8`.
* Type: Inter. `text-5xl font-semibold tracking-tight` for page titles, `text-2xl font-semibold` for section headings, `text-sm text-zinc-400` for body support, `text-xs uppercase tracking-widest text-zinc-500` for labels.
* Borders are `ring-1 ring-white/10`, never `border-gray-200`.
* Motion: `framer-motion`, 300ms, `ease-out`. Dials count up from zero on mount. Cards stagger in at 40ms intervals. Nothing bounces, nothing spins for longer than a second.
* Every number on screen has a unit and a plain-language sentence next to it. A bare "68" is a design failure.
* Mobile first. The judges may open the live link on a phone. Test at 390px width before calling anything done.

### Component contract

Never write a raw `<button>` or a raw `<input>` in a feature component. If you need one, it comes from `src/components/ui/`. If the primitive does not exist yet, build it in `ui/` first, then use it. This one rule is what keeps the UI coherent across a fast build.

---

## 5. The Thinking Loop

Run this loop before every code output. Not sometimes. Every time.

### Before writing

1. **Restate the change.** In one line, what am I changing and which files does it touch. If it touches more than three files, break it into smaller steps.
2. **Check the contracts.** Open `src/lib/types.ts` and the relevant `ui/` primitives. Am I about to invent a shape or a style that already exists. Reuse beats invent.
3. **Name the failure modes.** What does this code do when the API returns 429, when the address is not found, when Claude returns malformed JSON, when the photo is 12MB. Handle all four before writing the happy path, not after.

### While writing

4. **Full files, never fragments.** Output complete file contents. Never write "// ... rest of the file unchanged". That is the single largest source of broken builds in an AI-driven project.
5. **Imports last.** After the file is written, walk every identifier used in it and confirm there is a matching import at the top. Confirm every import path actually exists in the file tree.
6. **Types before logic.** If a new shape appears, add it to `types.ts` in the same output.

### After writing, before claiming done

Run this checklist explicitly and out loud. Do not skip a line even when confident.

7. **Syntax sweep.** Balanced braces, brackets, and parens. Every JSX tag closed. No stray commas in object literals. Every `useEffect` has a dependency array. Every `map` has a stable `key`.
8. **Type sweep.** Does anything rely on a property that is not on the declared type. Are all optional fields guarded before access. Zero `any`.
9. **Tailwind sweep.** Every class used exists in the palette and rules in section 4. No arbitrary values outside the two approved (`bg-[#0A0F0D]`, `bg-white/[0.03]`). No colour outside the palette. No radius outside `rounded-2xl` and `rounded-full`. No hardcoded pixel spacing.
10. **State sweep.** Does this component have loading, error, and empty states.
11. **Build it.** Actually run `npm run build`. Do not report success on a build you have not run. If it fails, fix and run again. Repeat until clean. A passing `tsc` is not a passing build.
12. **Look at it.** Run the dev server and take a screenshot at 390px and at 1440px. Read the screenshot. If the spacing is off or text overflows, fix it before moving on. Never declare a UI task complete on the basis of the code alone.
13. **Log it.** Append one honest line to `DECISIONS.md`: what changed, what broke, what the fix was. This file is what makes the Learning criterion answerable.

### When something fails twice

Do not try a third variation of the same approach. Stop, state the actual root cause in one sentence, and propose two different approaches with the trade-off between them. Escalate to the human rather than burning context on repeated near-misses.

### Honesty rule

Never invent a number, a data source, an API field, or a citation. If real data for something is unavailable, either drop the feature or label the value clearly as an estimate with its method shown. A judge who catches one fabricated figure discounts the entire project. This applies especially to flood risk and the cooling effect estimates in Feature 3.

---

## 6. Build order and schedule

Sixteen days to deadline. Front-load the risky parts.

| Phase | Target | Done when |
|---|---|---|
| 1. Skeleton | Days 1-2 | Vite + TS + Tailwind running, `ui/` primitives built, `AppShell` renders, deployed to Vercel with a live URL |
| 2. Risk Lens | Days 3-6 | Address in, four real dials out, trend chart rendering, all three states handled |
| 3. Planner | Days 7-9 | `/api/plan` returns validated JSON, cards render, PDF exports |
| 4. Street Audit | Days 10-12 | `/api/audit` handles an image, score and interventions render |
| 5. Polish | Days 13-14 | Motion, mobile pass, empty and error states, copy edit, README with screenshots |
| 6. Submission | Days 15-16 | Video recorded and cut to **between 3 and 5 minutes**, Devpost write-up, repo cleaned and public |

Ship a deployed URL at the end of Phase 1 and keep it deployed. A project that has been live for two weeks looks completed. A project deployed an hour before the deadline looks like one.

The video is worth as much as a feature. Budget a full day for it, not an hour.

---

## 7. What we will not fake

* Flood risk from elevation and rainfall history is **indicative only**. Every flood figure carries that label in the UI, and the README says the same. It is not a substitute for an official flood map.
* Cooling effect estimates are ranges from published urban heat island literature, cited in `README.md`, applied to an AI estimate of surface composition. Both sources of uncertainty are stated in the UI.
* Costs are USD estimates and are labelled as estimates. (Amended 2026-08-30: were AUD. The prompt asks for US dollars too — relabelling Australian estimates as USD would have been a fabricated number under section 5.)
* We say plainly in the README that the app was built with heavy AI assistance. It is the truth, judges can read a commit history, and owning it reads far better than being caught.

---

## 8. Master Setup Prompt

Paste this as the first message of the build session, in the project folder, with this `CLAUDE.md` already in place.

---

```
Read CLAUDE.md in full before doing anything. It is the spec for this project and it overrides your defaults.

Scaffold Phase 1 of Verge. Do exactly this and nothing beyond it.

1. Initialise a Vite + React + TypeScript project in the current directory. Install and configure Tailwind CSS v3 (not v4), plus recharts, framer-motion, lucide-react, and @react-pdf/renderer. Set up the Inter font.

2. Configure tailwind.config.js to encode the visual system in section 4 of CLAUDE.md: extend the theme with the background and surface colours, the five risk-scale colours under a `risk` key, and Inter as the sans stack. The palette must live in config, not scattered through class strings.

3. Create the full file and folder structure from section 3 of CLAUDE.md. Every folder gets its real files, no placeholders that only contain a comment.

4. Write src/lib/types.ts completely. Define: Coordinates, GeocodeResult, RiskDimension, RiskScore, RiskProfile, ClimateProjection, DwellingProfile, AdaptationAction, AdaptationPlan, SurfaceFinding, CoolingAudit, and a discriminated ApiResult<T> union with success and error variants. This file is the contract for everything else.

5. Build every primitive in src/components/ui/: Card, Button (variants primary, ghost, danger, sizes sm and md), Field, Badge (which takes a risk score and picks its own colour from the risk scale), Skeleton, and ErrorState. These are the only buttons, inputs, and cards that will exist in this project.

6. Build src/components/layout/AppShell.tsx with the header, the Verge wordmark, a one-line tagline, and a centred max-w-5xl content column. Wire it into App.tsx with a placeholder hero that states the product in one sentence.

7. Write src/lib/scoring.ts with pure, fully typed, documented function signatures for heatScore, floodScore, airScore, dryFireScore, and compositeRisk. Implement the maths where the method is clear from CLAUDE.md, and leave a clearly marked TODO with the intended method where it is not. No fetch calls in this file.

8. Create DECISIONS.md and BACKLOG.md with their headers, and write a first DECISIONS.md entry covering the setup choices you just made and why.

Then, before you report back:
- run npm run build and fix anything that fails, repeating until it passes clean
- run the dev server and screenshot it at 390px and 1440px, look at both, and fix any spacing or overflow problems you can see
- walk the Thinking Loop checklist in section 5 out loud, item by item

Report back with: the final file tree, the build output, the two screenshots, and any point where you deviated from CLAUDE.md and why. Do not start Phase 2.
```

---

## 9. Session hygiene

* Start each new session with "read CLAUDE.md and DECISIONS.md, then tell me the current phase and the next task". Context does not carry between sessions, this file does.
* One phase per session where possible. Long sessions drift.
* Update this file when a decision changes. A stale spec is worse than no spec.
* Commit after every green build, with a message that says what actually changed.

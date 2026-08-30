# Devpost submission — draft copy

Paste each section into the matching field. Written in first person; edit the
voice until it sounds like you, because a judge who reads this and then talks
to you should hear the same person.

---

## Project name

**Verge**

## Elevator pitch (Devpost tagline, ~200 characters)

> Climate reports tell you the planet is in trouble. Verge tells you what to do
> about your house — a hyperlocal risk profile for one address, turned into a
> ranked, costed plan you can start this month.

## Built With

`react` · `typescript` · `vite` · `tailwindcss` · `vercel` · `claude` ·
`anthropic-api` · `open-meteo` · `openstreetmap` · `nominatim` · `era5` ·
`cmip6` · `recharts` · `framer-motion` · `react-pdf` · `vitest` · `playwright`

## Try it out

- Live app: https://verge-ebon.vercel.app
- Source: https://github.com/rald0180/verge

---

## Inspiration

Climate information exists at the scale of nations and decades. People live at
the scale of one address and one summer.

If you want to know whether your place is going to get dangerous, and what you
should actually do about it, there's nowhere good to go. Government risk portals
are technical, static, and they stop at telling you the risk — never at what to
do next. Everything else is a carbon calculator that makes you feel guilty about
a problem you can't personally solve.

I wanted the opposite of guilt. Something that takes one address and hands you a
short list of things you could do this month.

## What it does

**Risk Lens.** You type in an address. Verge geocodes it, then pulls thirty-five
years of recorded climate history for that coordinate and downscaled CMIP6
projections out to 2050, and scores four dimensions 0–100: heat, flood, air, and
drought and fire weather. Each dial carries a plain-language verdict and will
show you exactly where its numbers came from.

**Adaptation Planner.** Three questions — what you live in, whether you own it,
what you can spend — and Claude returns five ranked, costed actions built from
your specific risk profile. If you rent, you only get actions a tenant is
legally allowed to take. The plan exports to a one-page PDF.

**Street Audit.** Drop in a photo of your street. Claude's vision model reads the
surfaces — asphalt, lawn, canopy, roof colour — estimates coverage, scores how
well the spot handles heat, and names three interventions that would cool it
down.

**And a summary.** The three features run as four pages, with the current step
in the URL hash so the back button works and a refresh keeps your place. The
last page collects everything. It recomputes nothing — every figure came from
the step that produced it — and it names the steps you skipped rather than
leaving a gap that could be screenshotted as a finished report.

## How I built it

Vite, React 18 and TypeScript in strict mode with zero `any`, Tailwind for a
design system defined once in config, deployed on Vercel with three serverless
functions so the Anthropic key never touches the browser.

Six live data sources, all free and keyless: OpenStreetMap for geocoding, and
Open-Meteo for the ERA5 historical archive, downscaled CMIP6 projections,
elevation, air quality and current conditions. There is no mock data anywhere in
the project — every number on screen came from a live request.

The risk maths lives in one pure module with no network calls and no clock
reads, which is why it can be unit tested. Where a published index exists I used
it and named it: the European Air Quality Index, the WHO 2021 guidelines, the
Chandler Burning Index. Where one doesn't, the scale is mine, it's documented in
full, and the UI labels the result as an estimate rather than a measurement.

**On AI assistance:** this project was built with heavy use of Claude as a coding
assistant, and I'd rather say that plainly than have anyone work it out from the
commit history. I directed the build, made the architectural and product calls,
and verified the output — including catching things the model got wrong, which
I've documented rather than quietly fixed.

## Challenges I ran into

**A flood score that moved fifty points overnight.** The same address returned
28 one day and 78 the next. It turned out the geocoder had resolved "Rokeby Rd,
Subiaco" to a point 570 metres further up the road, sitting twelve metres below
its surroundings instead of seven above. The maths was right both times — the
*question* was misleading, because a street-level query lands on an arbitrary
point on that street. The fix was in the copy, not the code: the address field
now asks for a street number and explains why.

**A dial that claimed to be "Measured" when it never was.** Someone asked me a
simple question — is the data in this app real? Checking it properly, I found
that Open-Meteo's air quality is CAMS *model* output, not a sensor reading, and
my UI had been calling it "Measured" for three phases. It now says modelled and
credits CAMS. After that fix, no dial in the app claims to be a direct
measurement, which is the honest position.

The sequel is better. Someone asked why an address read 62 when Google showed
30–40. My number was right: it is the European AQI, and CAMS returns exactly
that. The same call returns **US AQI 86** from the same concentrations — one set
of air, two indices, twenty-four points apart, because the scales are built
differently. But checking it turned up a claim of *mine* that failed: the
disclosure said "45 km grid cell", and probing five coordinates around Sydney
showed the service snapping to a 0.1° grid, with points 7 km apart returning the
same cell. I could not stand behind 45 km, so it now states what was observed —
and shows both indices, so nobody else has to ask.

**Two fabricated citations, caught before release.** Building the Street Audit I
attributed two cooling figures to "Wang et al." and "Sharma et al." I had
verified neither — my sources gave titles and journals, never authorship. I'd
invented two plausible-looking author names in the one feature specifically
about not doing that. They're now cited by title and venue, and there is no
unverified author name anywhere in the codebase.

**Re-reading every source, and finding four numbers wrong.** Late on, I went
back and opened every cooling figure's source rather than trusting the citation
attached to it. Three were exactly right. Four were not. One range — 1.18–1.26 °C
for replacing paving with planting — traced to nothing at all; a two-decimal
range with no author is a fabrication signature, and it was the same one I had
already been caught by once. A second, "up to 1.87 °C" for shading walls, was
equally unattributable; I deleted that intervention rather than hunt for a
number to fit, because the vertical-greenery literature spans 0.66 °C to
7.14 °C and picking from that spread is invention with extra steps. A third
range was wider than the paper it cited. A fourth was a figure sitting inside an
EPA citation that the EPA page does not contain. The planting entry is now the
Bowler et al. (2010) systematic review's actual finding — a park averaged
0.94 °C cooler by day — and because that review reports a mean rather than a
range, the UI now renders a point estimate as "about −0.9 °C" instead of forcing
an invented spread around it.

**A ranking rule that was exactly backwards.** The spec said "sort by impact per
dollar." Implemented literally, dividing impact by cost made cost the only thing
that mattered: a free admin task scoring 45 outranked ceiling insulation scoring
85 by two hundred to one, so the two most useful actions in every plan sorted
last. Fixing it properly also meant rejecting an obvious-looking alternative — a
comparator that treats near-equal impacts as ties is non-transitive, and that's
undefined behaviour for `Array.sort`.

## Accomplishments that I'm proud of

**Making a fabricated number structurally impossible.** In the Street Audit, the
vision model estimates surfaces and picks which interventions apply — but it
never states a temperature, and not because the prompt asks it not to. The
response schema has no field for one. It returns an ID from a fixed list, and
the server attaches the published range from cited literature. A number a model
cannot express is a number it cannot invent.

**Enforcing the renter rule instead of requesting it.** The prompt asks for
renter-safe actions, and then the server filters out anything marked otherwise
before it reaches the browser. A model asked politely for renter-safe advice will
still occasionally suggest replacing a roof.

**Saying what each number measures.** A cool roof lowers roof *surface*
temperature by about 30 °C, indoor *peak* temperature by 1–3 °C, and street *air*
temperature by almost nothing. All three are true. Quoting the largest without
saying which one it is would be the most misleading figure this project could
print, so every cooling estimate displays what it measures and at what scale.

**Shipping early and keeping it live.** The app was deployed on day one and has
been live and working every day since, with every phase pushed as it landed.

## What I learned

The most useful thing I learned is how much work the word "measured" is doing,
and how easily it's wrong. Reanalysis is not measurement. A model grid cell is
not a sensor on your street. A downscaled projection is not an observation. Getting those labels right turned out to matter more to whether I'd
trust this app than any feature in it.

I also learned that a check can be confidently wrong. At one point I compared
hashed asset filenames to decide whether a deployment had gone live, concluded
it hadn't, and was flatly incorrect — the change didn't affect the bundle, so
both builds produced identical hashes and the test could never have
distinguished them. A test that returns a confident answer while measuring the
wrong thing is more dangerous than no test.

And I learned the difference between asking a model for a constraint and
enforcing one. Every honesty guarantee in this project that actually holds is a
guarantee in code — a filter, a schema without a field, a validator — not a
sentence in a prompt.

That lesson cost me a third time, right at the end. I cut the plan from seven
actions to five by writing "Exactly 5 actions" in the response schema and again
in the prompt. It returned five locally and **six** on production, from
identical code. A JSON-schema `description` is advisory: the model reads it as
guidance and complies most of the time, which is the worst possible failure mode
because it passes whichever test you happen to run. The count is now enforced
after ranking and after the renter filter. Asking is a preference; only code is
a contract.

## What's next for Verge

- **Widen the Street Audit's testing.** It now works on real street
  photographs — on an inner-suburban street it read asphalt 32%, brick facade
  25%, street trees 20%, footpath 15% and a grassy verge 3% — but that is one
  street in one city. Suburban, rural and apartment-balcony scenes are all
  untested.
- **Show which point on the street was chosen**, on a small map, so the flood
  sensitivity is visible rather than surprising.
- **Server-side rate limiting on the geocode proxy.** The edge cache keeps it
  well inside Nominatim's limit at demo traffic, but there's no token bucket.
- **Represent an unavailable dimension distinctly** rather than failing the
  whole profile when one data source is down.
- **Confirm the emissions scenario.** Open-Meteo publish no SSP for their
  downscaled set, so Verge quotes their wording rather than asserting a
  scenario. If they publish one, it should be stated exactly.

All of these are already written up in `BACKLOG.md` in the repo, alongside the
build log.

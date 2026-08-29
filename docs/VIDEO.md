# Pitch video — script and shot list

**Target length 3:50.** NextStep Hacks requires **3 to 5 minutes**; anything
under three is non-compliant. This script runs comfortably inside the window
with room for pauses.

Raw footage is in `docs/footage/`, recorded with `node scripts/record.mjs`
against the live app. Every frame is the real product — nothing is mocked.

---

## Before you record

**Re-record shot 05 with a photo of your actual street.** The committed footage
uses a synthetic test image of flat colour blocks. It proves the pipeline but it
looks like a diagram, and it is the single weakest frame in the cut. A real
photo of a Perth street — bitumen, a verge, a jacaranda — makes the Street Audit
land, and it is the shot judges will remember.

Drop the photo into `public/`, point the recorder at it, and re-run just that
shot.

---

## Script

### 0:00 – 0:22 · Cold open

> **Footage:** `01-hero` — the landing page, slow scroll.

**VO:**
> Every climate report tells you the same thing. The planet is in trouble.
> Degrees of warming. Emissions by 2050.
>
> None of it tells you what to do about *your house*.
>
> This is Verge.

*On screen: hold on the line "Climate reports tell you the planet is in trouble.
Verge tells you what to do about your house."*

---

### 0:22 – 1:10 · Risk Lens

> **Footage:** `02-risk-lens` — typing the address, skeletons, dials counting up,
> scrolling through the verdicts.

**VO:**
> It starts with one address.
>
> Verge pulls thirty-five years of recorded climate history for that exact
> coordinate, and downscaled CMIP6 projections out to 2050, and scores four
> things: heat, flood, air, and drought and fire weather.
>
> This street sees about fifteen days a year over thirty-five degrees today.
> By 2050 that's thirty-eight.
>
> Every number shows its working. Where it came from. Whether it's measured,
> modelled, or an estimate — because a number you can't check is a number you
> shouldn't trust.

*Hold on the evidence lines under a dial — the ERA5 and CMIP6 attributions.*

---

### 1:10 – 1:28 · The trend

> **Footage:** `03-trend-chart`

**VO:**
> Grey is the historical record. Colour is the projection. They're drawn as two
> separate lines, on purpose — so it's never ambiguous which half already
> happened.

---

### 1:28 – 2:20 · Adaptation Planner

> **Footage:** `04-planner` — selecting Sharehouse, then "I rent it", then the
> plan generating and scrolling.

**VO:**
> Knowing your risk doesn't help if nobody tells you what to do about it.
>
> Three questions. What you live in. Whether you own it. What you can spend.
>
> Claude reads your actual risk profile and returns a ranked, costed plan — most
> effective first.
>
> And this bit matters: say you rent.

*Beat. Hold on the tenure toggle.*

> Now every action is one a tenant can legally take. Not because the model was
> asked nicely — because the server filters anything that isn't, after the
> model answers.
>
> The whole plan exports to a one-page PDF.

---

### 2:20 – 3:00 · Street Audit

> **Footage:** `05-street-audit` — the drop, the analysis, scrolling the
> interventions. **Re-record with a real photo.**

**VO:**
> Then there's this.
>
> Drop in a photo of your street. Verge reads the surfaces — the bitumen, the
> lawn, the canopy, the dark roof — estimates how much of the frame each covers,
> and scores how well this spot handles heat.
>
> And it names three things that would cool it down.
>
> Look at the numbers. Minus zero point three to one point five degrees. Air
> temperature. Neighbourhood scale.
>
> The model didn't write those. It *can't*. The response schema has no field for
> a temperature. It picks which intervention fits; the degrees come from
> published urban heat island research, cited on screen.

*Hold on a citation line.*

---

### 3:00 – 3:35 · How it's built, and what broke

> **Footage:** `06-mobile`, then a screen recording of `DECISIONS.md` scrolling.

**VO:**
> Six live data sources. No mock data anywhere.
>
> It's not been a clean run. The flood score for one street moved fifty points
> between two days — the geocoder had resolved to a point five hundred metres
> away, sitting in a hollow. Real result, misleading question.
>
> An air quality dial said "Measured" for three phases. It never was — it's a
> forty-five kilometre model grid cell. That's fixed, and it's written down.
>
> Two citations got caught being fabricated before release. Also written down.
>
> Every one of those is in the build log, in the repo.

---

### 3:35 – 3:50 · Close

> **Footage:** `01-hero` again, or a still.

**VO:**
> Climate adaptation that starts at your front door.
>
> It's live, it's open source, and it works on your street.

*On screen: the live URL and the repo URL, held for four seconds.*

---

## Production notes

What still needs a human:

- **Voiceover.** Read it at a measured pace — the script is written for about
  150 words a minute. Don't rush the Street Audit section.
- **Music.** Something restrained. The subject is heat risk, not a product
  launch; triumphant synth will undercut it.
- **Titles.** Minimum: the product name at 0:15, section titles, and the two
  URLs at the end.
- **Captions.** Worth it. Judges may watch muted.

The footage is `.webm`. Most editors take it directly; convert with
`ffmpeg -i in.webm -c:v libx264 out.mp4` if yours doesn't.

## Shot inventory

| Clip | Use | Notes |
|---|---|---|
| `01-hero` | Open and close | Slow scroll over the hero |
| `02-risk-lens` | 0:22–1:10 | Typing, skeletons, dials counting up, verdicts |
| `03-trend-chart` | 1:10–1:28 | Observed against projected |
| `04-planner` | 1:28–2:20 | Includes the renter toggle beat |
| `05-street-audit` | 2:20–3:00 | **Re-record with a real photo** |
| `06-mobile` | 3:00–3:35 | 390 px, proves it works on a phone |

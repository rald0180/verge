# Voiceover script — to read yourself

**Target 4:00.** The window is 3–5 minutes, so this sits comfortably inside it
with room to breathe. Roughly 480 words of speech across four minutes — that is
a relaxed pace, not a rush. If you finish at 3:20 you went too fast; slow down
and run it again.

Written in first person because you are reading it. Judges score **Learning**
— "did the team stretch themselves?" — and a person explaining their own
decisions lands very differently from a narrator reading ad copy. Where the AI
voiceover said "Verge does X", this says "I built X, and here is what went
wrong."

**Delivery notes**
- Read it out loud once before recording. Anything you stumble on, change — it
  is your script, and your phrasing beats mine.
- The **bold** words are where the emphasis falls. Don't push the rest.
- `[BEAT]` is a real pause. One second. They feel long and they are not.
- Record in one take per section, not one take for the whole thing.
- Sit forward. Sounding interested is most of it.

---

## 0:00 – 0:25 · The problem

> **Footage:** `01-hero`

Every climate report tells you the same thing.

The planet's in trouble. Two degrees. Emissions by twenty-fifty.

`[BEAT]`

And none of it tells you what to do about **your house**.

That's the gap I wanted to close. So I built Verge.

---

## 0:25 – 1:20 · Risk Lens

> **Footage:** `02-risk-lens`

It starts with one address.

Verge turns that into a coordinate, then pulls thirty-five years of recorded
climate history for that exact spot, plus downscaled model projections running
out to twenty-fifty.

It scores four things. Heat. Flood. Air. Drought and fire weather.

`[BEAT]`

This street sees about **twelve** days a year over thirty-five degrees today.
By twenty-fifty, that's **thirty-six**.

I didn't make that up, and neither did the AI. It's counted out of the real
temperature record and the real projection.

And every figure here shows its working — where it came from, and whether it's
measured, modelled, or an estimate.

---

## 1:20 – 1:40 · The chart

> **Footage:** `03-trend-chart`

Grey is what's already happened. Colour is what the models expect.

I drew them as two separate lines on purpose — so it's never ambiguous which
half is history and which half is a forecast.

---

## 1:40 – 2:30 · Adaptation Planner

> **Footage:** `04-planner`

Knowing your risk doesn't help if nobody tells you what to do about it.

So: three questions. What you live in. Whether you own it. What you can spend.

That goes to Claude, which reads your actual risk profile and comes back with a
ranked, costed plan.

`[BEAT]`

And here's the bit I care about most. Watch what happens when I say I **rent**.

`[BEAT — let the toggle land]`

Every action is now one a tenant is actually allowed to take.

That's not the model being asked politely. The server **filters** anything that
isn't renter-safe after the model answers — because a model asked nicely for
renter-safe advice will still occasionally tell you to replace your roof.

---

## 2:30 – 3:15 · Street Audit

> **Footage:** `05-street-audit` — your own street photo

This is the part I'm proudest of.

Drop in a photo of your street.

Verge reads the surfaces — bitumen, lawn, canopy, dark roof — estimates how
much of the frame each covers, and scores how well the spot handles heat.

Then it names three things that would cool it down.

`[BEAT]`

Now look at the temperatures.

Minus **nought point three** to **one point five** degrees. Air temperature.
Neighbourhood scale.

The model didn't write those. It **can't** — the response format has no field
for a temperature. It only picks which intervention fits. The degrees come from
published urban heat island research, cited on screen.

---

## 3:15 – 3:50 · What went wrong

> **Footage:** `06-mobile`, then scroll `DECISIONS.md`

I kept a build log the whole way, including the mistakes. Two worth telling you.

The flood score for one street moved **fifty points** between two days. Same
query — the geocoder had resolved five hundred metres up the road, into a
hollow. The maths was right; the question was misleading. So the address box
now asks for a street number, and says why.

And an air quality dial said "**Measured**" for three phases of this build. It
never was — it's a forty-five kilometre model grid cell. Someone asked me
whether the data was real, I checked, and it wasn't.

`[BEAT]`

Both are written down, in the repo, with the fixes.

---

## 3:50 – 4:00 · Close

> **Footage:** `01-hero`, hold on the URL

Six live data sources. No mock data anywhere. It's open source, it's live right
now, and it works on your street.

Verge. Climate adaptation that starts at your front door.

---

## If you run long

Cut in this order:
1. The chart section at 1:20 — those numbers already appear in Risk Lens.
2. The air-quality mistake at 3:15 — keep the flood one, it's the better story.
3. Trim Risk Lens to just the twelve-to-thirty-six line.

Do **not** cut the renter toggle or the "the model can't write these numbers"
beat. Those two are what make this project different from every other climate
dashboard in the competition.

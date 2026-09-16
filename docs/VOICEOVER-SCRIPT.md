# Voiceover script — to read yourself

**Target 4:00.** The window is **3–5 minutes** and the minimum is real: a
two-minute cut is non-compliant however good it is.

This is about 555 spoken words. At a normal conversational pace — 130 words a
minute — that is **4:25 with the pauses**, sitting inside the window with room
at both ends. It stays under five minutes at any normal speaking pace; only a
deliberately slow read would breach it. If you land short of three minutes, the
"If you run short" section at the bottom has the beats to add.

Written in first person because you are reading it. Judges score **Learning** —
"did the team stretch themselves?" — and a person explaining their own decisions
lands very differently from a narrator reading ad copy. So this says "I built
this, and here is what went wrong", not "Verge does X".

**Delivery notes**

- Read it out loud once before recording. Anything you stumble on, change — it
  is your script and your phrasing beats mine.
- The **bold** words are where the emphasis falls. Don't push the rest.
- `[BEAT]` is a real pause. One second. They feel long and they are not.
- Record one take per section, not one take for the whole thing.
- Sit forward. Sounding interested is most of it.

**One rule about numbers.** Anywhere this script quotes a figure, say what is
actually on *your* screen when you record. The live data moves — the heat
numbers for Subiaco shifted once already during this build. A number in the
voiceover that disagrees with the number on screen is the one thing in this
video a judge is certain to catch.

---

## Shot list

Capture these against the **current** build at `verge-ebon.vercel.app`.

**Do not reuse anything in `docs/footage/`.** Those clips are from 29–30 August
and show an app that no longer exists: different layout, different currency,
seven actions instead of five, and a header that behaves differently.

| # | Shot | What to capture |
|---|---|---|
| 1 | Home | The front door. Cursor into the address field, type an address. |
| 2 | Risk | The four dials counting up, then one "How we got this" opened. |
| 3 | Chart | The observed-versus-projected trend, grey into colour. |
| 4 | Plan | The three questions, **tapping "I rent it"**, then the cards. |
| 5 | Street | Dropping your own photo in, the surfaces and score landing. |
| 6 | Summary | The final page, scrolled through once. |
| 7 | Mobile | Any of the above at phone width, a few seconds. |

Use a real address you know. Shot 5 needs a street photo **you took yourself** —
not a Street View capture, which is someone else's copyright.

---

## 0:00 – 0:20 · The problem

> **Shot 1** — home page, before you type

Every climate report tells you the same thing.

The planet is in trouble. Two degrees. Emissions by twenty-fifty.

`[BEAT]`

And not one of them tells you what to do about **your house**.

That is the gap I wanted to close. So I built Verge.

---

## 0:20 – 1:05 · Risk Lens

> **Shot 1 into Shot 2** — type the address, let the dials run

It starts with one address.

Verge turns that into a coordinate, pulls thirty-five years of recorded climate
history for that exact spot plus downscaled projections out to twenty-fifty, and
scores four things. Heat. Flood. Air. Drought and fire weather.

`[BEAT]`

This street sees about **[the number on screen]** days a year over thirty-five
degrees today. By twenty-fifty, **[the second number]**.

I did not make that up, and neither did the AI. It is counted out of the real
record and the real projection.

> **Open "How we got this" here**

Every figure shows its working, and whether it is measured, modelled or an
estimate. Those three words mean different things, and this app never blurs
them.

---

## 1:05 – 1:20 · The chart

> **Shot 3**

Grey is what has already happened. Colour is what the models expect. Two
separate lines on purpose, so it is never ambiguous which half is a forecast.

---

## 1:20 – 2:10 · Adaptation Planner

> **Shot 4** — land on "I rent it" and let it sit

Knowing your risk does not help if nobody tells you what to do about it.

Three questions. What you live in, whether you own it, what you can spend. That
goes to Claude, which reads your actual risk profile and returns five ranked,
costed actions.

`[BEAT]`

Here is the part I care about most. Watch what happens when I say I **rent**.

`[BEAT — let the toggle land]`

Every action is now one a tenant is actually allowed to take.

That is not the model being asked politely. The server **filters out** anything
not renter-safe after the model answers — because a model asked nicely for
renter-safe advice will still occasionally tell you to replace your roof.

---

## 2:10 – 2:55 · Street Audit

> **Shot 5** — your own street photo

This is the part I am proudest of. Drop in a photo of your street.

Verge reads the surfaces — bitumen, lawn, canopy, dark roof — estimates how much
of the frame each covers, scores how well the spot handles heat, and names three
things that would cool it down.

`[BEAT]`

Now look at the temperatures.

**[read the range on screen]** degrees. Air temperature. Neighbourhood scale.

The model did not write those. It **cannot** — the response format has no field
for a temperature. It only picks which intervention fits, and the degrees come
from published research, cited on screen.

A number a model cannot express is a number it cannot invent.

---

## 3:00 – 3:35 · What went wrong

> **Shot 7**, then scroll `DECISIONS.md` on screen

I kept a build log the whole way, including the mistakes. Two worth telling.

A flood score moved **fifty points** overnight. Same street — the geocoder had
resolved five hundred metres up the road, into a hollow. The maths was right
both times. The **question** was misleading.

`[BEAT]`

And late on I opened every cooling figure's source instead of trusting the
citation next to it. Four were wrong. One had **no source at all** — a range
quoted to two decimal places that traced back to nothing. In the one feature
specifically about not inventing numbers.

`[BEAT]`

I replaced it with a real systematic review, deleted the one I could not source
rather than find a figure that fit, and wrote all of it down.

---

## 3:35 – 3:45 · Close

> **Shot 1** — hold on the URL

Six live data sources. No mock data anywhere. Open source, live right now, and
it works on your street.

Verge. Climate adaptation that starts at your front door.

---

## If you run long

The floor is three minutes — only cut if you are over five.

1. The chart at 1:05. Those numbers already appear in Risk Lens.
2. Trim Risk Lens to just the two heat numbers.

Do **not** cut the renter toggle, the "the model cannot write these numbers"
beat, or the fabricated-citation story. The first two are what separate this
from every other climate dashboard in the competition, and the third is the
Learning criterion answering itself.

## If you run short

Add these, in order:

1. **The summary page.** Shot 6, scrolled once: "everything lands on one page
   you can keep. It recalculates nothing, and if you skipped a step it says so,
   rather than leaving a gap you could screenshot as a finished report."
2. **The one that nearly shipped.** A scoring change would have printed "zero
   out of a hundred — depleted" over some of the least disturbed country in
   Australia, because nobody has ever filed a wildlife record there. Absence of
   data is not absence of life. It refuses to score instead.
3. **Asking is not enforcing.** I asked for exactly five actions in the schema
   and again in the prompt. It returned five locally and six in production, from
   identical code. The count is enforced in code now, after the ranking. Every
   guarantee in this project that actually holds is a guarantee in code, not a
   sentence in a prompt.

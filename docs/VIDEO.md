# Pitch video — production guide

**The words and the shot list live in [VOICEOVER-SCRIPT.md](VOICEOVER-SCRIPT.md).**
This file is everything else: how to capture, how to cut, how to export, and
what has to be true before you submit.

This used to carry a second copy of the script. It does not any more — two
scripts drift apart, and then the one you read is not the one you edited to.

---

## The hard requirement

**3 to 5 minutes.** The minimum is as real as the maximum: a two-minute cut is
non-compliant no matter how good it is. Deadline **20 Sep 2026, 5:00pm EDT** —
21 Sep, 5:00am Perth.

---

## Before you record

- **Ignore `docs/footage/`.** Every clip in it is from 29–30 August and shows an
  app that no longer exists — single scrolling page, Australian dollars, seven
  actions, a sticky translucent header. Re-shoot everything.
- Use the live site, `https://verge-ebon.vercel.app`, not localhost. The URL bar
  is evidence that it is deployed, and judges score Completion.
- Hide bookmarks, close other tabs, and use a clean browser profile. A personal
  bookmarks bar in the corner of a submission reads as careless.
- Have the street photo ready — **one you took yourself.** The photo in
  `test-photos/` is a Google Street View capture and is not yours to publish.
- Do one full dry run of the app before recording. The plan call takes about
  sixteen seconds and you want to know that, not discover it mid-take.

## Capture settings

| Setting | Value |
|---|---|
| Resolution | 1920×1080, or 1440×900 scaled up |
| Frame rate | 30 fps is plenty; 60 if your recorder defaults to it |
| Browser zoom | 100%. Do not zoom to make text bigger — capture at a smaller window size instead |
| Cursor | Visible. It shows a person driving the app |
| Audio | Record separately from the screen. Never rely on capture-time audio |

For the mobile shot, use the browser's device emulation at 390px wide rather
than filming a phone. It reads cleaner and matches the screenshots.

## Recording the voiceover

- Quietest room you have, soft furnishings, microphone close.
- One take per section, not one take for the whole thing. The script is already
  split at the timestamps.
- Record thirty seconds of room silence before you start. Your editor can use it
  to subtract background hiss.
- Leave a breath either side of every `[BEAT]`. You can always tighten a pause
  in the edit; you cannot invent one.

## Assembly

1. Lay the voiceover down first, in one track, and cut the silences.
2. Drop the shots against it. The script's timestamps are the intended pacing,
   not a rule — if a shot needs an extra second, take it.
3. Where the app is thinking — the ~16s plan call, the audit — **cut it short**.
   Nobody needs to watch a spinner. Trim to two seconds and let the result land.
4. No music under the voiceover, or very low. The script carries the video.
5. Do not add a title card longer than three seconds. The clock is tight.

## Export and upload

- H.264 MP4, 1080p.
- Upload to YouTube **unlisted** (not private — judges must be able to open it
  without an invite) or Vimeo.
- Put the link in the Devpost project's video field. Check it plays in a logged
  -out browser window before you submit.

---

## Submission checklist

Work down this list on the day. Everything above the line is already done.

- [x] App deployed and live at `https://verge-ebon.vercel.app`
- [x] Repo public at `https://github.com/rald0180/verge`
- [x] `README.md` current, with screenshots and cited sources
- [x] `DECISIONS.md` — the honest build log, which is the Learning evidence
- [x] Devpost copy drafted in [DEVPOST.md](DEVPOST.md)
- [ ] Footage re-shot against the current build
- [ ] Voiceover recorded
- [ ] Video cut to **between 3:00 and 5:00**
- [ ] Video uploaded, unlisted, link tested logged-out
- [ ] Devpost page filled from `DEVPOST.md`
- [ ] Devpost: video link, repo link, live link all present
- [ ] **Submitted** — a filled-in Devpost draft is not a submission

### Two things on the Devpost form that are easy to miss

- **"Built With"** — the tag list is in `DEVPOST.md` under that heading. Judges
  filter on it.
- **Prior work.** The rules require you to state what existed before the
  hackathon. Nothing did; this was built entirely inside the window, starting
  21 August. Say so explicitly rather than leaving the field empty.

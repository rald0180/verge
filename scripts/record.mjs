/**
 * Records real screen footage of Verge for the pitch video.
 *
 * Each shot is a separate browser context so it becomes its own clip, at
 * 1920x1080, ready to cut. Typing is deliberately slowed and there are holds
 * on the moments that matter — a demo that races through its own results is
 * unwatchable.
 *
 *   node scripts/record.mjs        (needs the dev server running)
 *
 * Output: docs/footage/<shot>/*.webm
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'

/**
 * Defaults to the deployed site: the URL bar is evidence the thing is live, and
 * judges score Completion. Override with VERGE_URL=http://localhost:3000.
 */
const BASE = process.env.VERGE_URL ?? 'https://verge-ebon.vercel.app'
const OUT = 'docs/footage'
const ADDRESS = process.env.VERGE_ADDRESS ?? 'Rokeby Rd, Subiaco WA'

/**
 * A street photo for the audit shot, e.g. AUDIT_PHOTO=~/Pictures/my-street.jpg
 *
 * Opt-in, and it must be a photo you took. The shot is skipped without it
 * rather than falling back to whatever is lying in test-photos/, which is a
 * Street View capture and not ours to put in a submission video.
 */
const AUDIT_PHOTO = process.env.AUDIT_PHOTO ?? ''
const hold = (ms) => new Promise((r) => setTimeout(r, ms))

const shot = async (name, { width = 1920, height = 1080 } = {}, fn) => {
  const dir = `${OUT}/${name}`
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir, size: { width, height } },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await hold(600)
  await fn(page)
  await context.close()
  await browser.close()
  // Playwright names videos with a random hash; give it the shot name.
  const file = readdirSync(dir).find((f) => f.endsWith('.webm') && !f.startsWith(name))
  if (file) renameSync(`${dir}/${file}`, `${dir}/${name}.webm`)
  console.log(`  ${dir}/${name}.webm`)
}

const typeAddress = async (page) => {
  const input = page.locator('input[type=search]')
  await input.click()
  await input.pressSequentially(ADDRESS, { delay: 90 })   // human-paced
  await hold(700)
}

const waitForDials = (page) =>
  page.waitForSelector('svg[viewBox="0 0 100 100"]', { timeout: 90000 })

/* --------------------------------------------------------------------------
 * Navigation helpers for the four-page flow.
 *
 * The app is no longer one long scroll: each step is its own page and the
 * current one lives in the URL hash. These walk it the way a person would —
 * clicking the footer buttons — rather than jumping the hash, because the page
 * transition is part of what the video is showing.
 * ------------------------------------------------------------------------ */

const searchFromHome = async (page) => {
  await typeAddress(page)
  await page.getByRole('button', { name: /Check/ }).click()
  await waitForDials(page)
}

const toPlan = async (page) => {
  await page.getByRole('button', { name: /Build a plan/ }).click()
  await hold(900)
}

/* 1. HOME — the front door. ~8s */
await shot('01-home', {}, async (page) => {
  await hold(2500)
  await page.locator('input[type=search]').click()
  await hold(800)
  await page.locator('input[type=search]').pressSequentially(ADDRESS, { delay: 90 })
  await hold(2000)
})

/* 2. RISK LENS — address in, four real dials out, then the working. ~28s */
await shot('02-risk-lens', {}, async (page) => {
  await searchFromHome(page)
  await hold(3000)                          // dials count up
  await page.mouse.wheel(0, 380)
  await hold(3000)
  // Open one disclosure — the "measured / modelled / estimate" beat needs it.
  const how = page.getByRole('button', { name: /How we got this/i }).first()
  if (await how.isVisible().catch(() => false)) {
    await how.click()
    await hold(4500)
  }
})

/* 3. THE CHART — observed against projected. ~12s */
await shot('03-trend-chart', {}, async (page) => {
  await searchFromHome(page)
  await hold(1200)
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 200)
    await hold(200)
  }
  await hold(5000)
})

/* 4. PLANNER — three questions, the renter beat, a costed plan. ~40s */
await shot('04-planner', {}, async (page) => {
  await searchFromHome(page)
  await toPlan(page)
  await hold(1200)
  await page.getByRole('button', { name: 'Sharehouse', exact: true }).click()
  await hold(700)
  await page.getByRole('button', { name: 'I rent it', exact: true }).click()
  await hold(1600)                          // let the renter toggle land
  await page.getByRole('button', { name: 'Build my plan', exact: true }).click()
  await hold(4000)                          // the elapsed counter ticking
  await page.waitForSelector('text=/Save as PDF/i', { timeout: 150000 })
  await hold(2500)
  await page.mouse.wheel(0, 500)
  await hold(4000)
  await page.mouse.wheel(0, 500)
  await hold(4000)
})

/* 5. STREET AUDIT — the moment. Needs your own photo. ~28s */
if (AUDIT_PHOTO) {
  await shot('05-street-audit', {}, async (page) => {
    await searchFromHome(page)
    await toPlan(page)
    await page.getByRole('button', { name: /Audit my street/ }).click()
    await hold(1800)
    await page.setInputFiles('input[type=file]', AUDIT_PHOTO)
    await hold(2500)                        // the resize, then the upload
    await page.waitForSelector('text=/Cooling score/i', { timeout: 150000 })
    await hold(3500)
    await page.mouse.wheel(0, 420)
    await hold(5000)                        // the cited ranges, on screen
  })
} else {
  console.log('  skipped 05-street-audit — set AUDIT_PHOTO=<a photo you took>')
}

/* 6. SUMMARY — everything on one page. ~18s */
await shot('06-summary', {}, async (page) => {
  await searchFromHome(page)
  await toPlan(page)
  await page.getByRole('button', { name: 'Sharehouse', exact: true }).click()
  await page.getByRole('button', { name: 'I rent it', exact: true }).click()
  await page.getByRole('button', { name: 'Build my plan', exact: true }).click()
  await page.waitForSelector('text=/Save as PDF/i', { timeout: 150000 })
  await hold(800)
  await page.getByRole('button', { name: /Audit my street/ }).click()
  await hold(700)
  await page.getByRole('button', { name: /See the summary/ }).click()
  await hold(2500)
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 260)
    await hold(700)
  }
  await hold(2500)
})

/* 7. MOBILE — judges may open the link on a phone. ~18s */
await shot('07-mobile', { width: 390, height: 844 }, async (page) => {
  await searchFromHome(page)
  await hold(2500)
  await page.mouse.wheel(0, 500)
  await hold(3000)
  await page.mouse.wheel(0, 500)
  await hold(3000)
})

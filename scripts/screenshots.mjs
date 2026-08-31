import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const OUT = 'docs/screenshots'
const ADDRESS = 'Rokeby Rd, Subiaco WA'

/**
 * A photograph for the Street Audit shot.
 *
 * OPT-IN ON PURPOSE, via `AUDIT_PHOTO=path node scripts/screenshots.mjs`.
 *
 * This screenshot ends up in a public README, so the photograph has to be one
 * whose licence allows publishing. Defaulting to whatever happens to sit in
 * `test-photos/` once regenerated the shot from a Google Street View capture,
 * watermark and all, which had to be caught and reverted before commit. Making
 * it explicit means that cannot happen by accident.
 */
const AUDIT_PHOTO = process.env.AUDIT_PHOTO ?? ''

const setInput = async (page, value) => {
  await page.evaluate((v) => {
    const i = document.querySelector('input[type=search]')
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(i, v)
    i.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
  // The Check button is disabled until React re-renders with >= 3 characters.
  // Clicking before that is a silent no-op, which is what made this time out.
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Check'))
    return b && !b.disabled
  })
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

/** Step one: resolve an address and wait for the dials to render. */
const search = async (page, address) => {
  await setInput(page, address)
  await page.getByRole('button', { name: /Check/ }).click()
  await page.waitForSelector('svg[viewBox="0 0 100 100"]', { timeout: 90000 })
  await pause(2500)
}

/** Step two: walk to the planner and build a plan. */
const buildPlan = async (page) => {
  await page.getByRole('button', { name: /Build a plan/ }).click()
  await pause(800)
  await page.getByRole('button', { name: 'House', exact: true }).click()
  await page.getByRole('button', { name: 'I own it', exact: true }).click()
  await page.getByRole('button', { name: '$100 – $500', exact: true }).click()
  await page.getByRole('button', { name: 'Build my plan', exact: true }).click()
  await page.waitForSelector('text=/Save as PDF/', { timeout: 150000 })
  await pause(1500)
}

const run = async (name, width, height, fn) => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await fn(page)
  await pause(300)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  await browser.close()
  console.log(`  ${OUT}/${name}.png  (${width}x${height})`)
}

// 1. Landing, desktop
await run('01-landing-desktop', 1440, 900, async () => {
  await pause(1200)
})

// 2. Risk Lens populated, desktop
await run('02-risk-lens-desktop', 1440, 1100, async (page) => {
  await search(page, ADDRESS)
})

// 3. Full plan, desktop
await run('03-plan-desktop', 1440, 1100, async (page) => {
  await search(page, ADDRESS)
  await buildPlan(page)
})

// 5. Summary, desktop — the fourth page, with a real plan on it
await run('06-summary-desktop', 1440, 1100, async (page) => {
  await search(page, ADDRESS)
  await buildPlan(page)
  await page.evaluate(() => {
    window.location.hash = 'summary'
  })
  await pause(1800)
})

// 6. Mobile, risk lens
await run('05-risk-lens-mobile', 390, 844, async (page) => {
  await search(page, ADDRESS)
})

// 4. Street audit, desktop — only when a publishable photo is available.
if (AUDIT_PHOTO && existsSync(AUDIT_PHOTO)) {
  await run('04-street-audit-desktop', 1440, 1100, async (page) => {
    await search(page, ADDRESS)
    await page.getByRole('button', { name: /Build a plan/ }).click()
    await pause(600)
    await page.getByRole('button', { name: /Audit my street/ }).click()
    await pause(600)
    await page.setInputFiles('input[type=file]', AUDIT_PHOTO)
    await page.waitForSelector('text=/Cooling score/', { timeout: 150000 })
    await pause(1500)
  })
} else {
  console.log('  skipped 04-street-audit-desktop — set AUDIT_PHOTO=<publishable photo> to capture it')
}

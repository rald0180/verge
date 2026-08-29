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

const BASE = process.env.VERGE_URL ?? 'http://localhost:3000'
const OUT = 'docs/footage'
const ADDRESS = 'Rokeby Rd, Subiaco WA'
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

/* 1. HERO — the landing page and the promise. ~8s */
await shot('01-hero', {}, async (page) => {
  await hold(3000)
  await page.mouse.wheel(0, 260)
  await hold(2500)
})

/* 2. RISK LENS — address in, four real dials out. ~30s */
await shot('02-risk-lens', {}, async (page) => {
  await typeAddress(page)
  await page.getByRole('button', { name: /Check/ }).click()
  await hold(1200)                         // the loading skeletons
  await waitForDials(page)
  await hold(2500)                         // dials count up
  await page.mouse.wheel(0, 420)
  await hold(3500)                         // read the verdicts
  await page.mouse.wheel(0, 420)
  await hold(3500)
})

/* 3. THE CHART — observed against projected. ~12s */
await shot('03-trend-chart', {}, async (page) => {
  await typeAddress(page)
  await page.getByRole('button', { name: /Check/ }).click()
  await waitForDials(page)
  await hold(1500)
  // Wheel rather than scrollIntoView: smoother on camera, and it does not
  // depend on a text selector matching CSS-uppercased copy.
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 180)
    await hold(220)
  }
  await hold(5000)
})

/* 4. PLANNER — three questions, a costed plan. ~45s */
await shot('04-planner', {}, async (page) => {
  await typeAddress(page)
  await page.getByRole('button', { name: /Check/ }).click()
  await waitForDials(page)
  for (let i = 0; i < 10; i += 1) {
    await page.mouse.wheel(0, 200)
    await hold(180)
  }
  await hold(900)
  await page.getByRole('button', { name: 'Sharehouse' }).click()
  await hold(700)
  await page.getByRole('button', { name: 'I rent it' }).click()   // the renter beat
  await hold(1400)
  await page.getByRole('button', { name: /Build my plan/ }).click()
  await hold(4000)                         // the honest "about half a minute"
  await page.waitForSelector('text=/Save as PDF/', { timeout: 90000 })
  await hold(2000)
  await page.mouse.wheel(0, 500)
  await hold(4000)
  await page.mouse.wheel(0, 500)
  await hold(4000)
})

/* 5. STREET AUDIT — the ninety-second moment. ~25s */
await shot('05-street-audit', {}, async (page) => {
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 200)
    await hold(200)
  }
  await hold(1500)
  await page.evaluate(async () => {
    const zone = [...document.querySelectorAll('div')]
      .filter((d) => d.className?.includes?.('transition-colors') && d.className.includes('text-center'))
      .pop()
    const blob = await (await fetch('/__audit-test.png')).blob()
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'street.png', { type: 'image/png' }))
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  await hold(2000)
  await page.waitForSelector('text=/Cooling score/i', { timeout: 90000 })
  await hold(3000)
  await page.mouse.wheel(0, 400)
  await hold(5000)                         // the cited ranges, on screen
})

/* 6. MOBILE — judges may open the link on a phone. ~20s */
await shot('06-mobile', { width: 390, height: 844 }, async (page) => {
  await typeAddress(page)
  await page.getByRole('button', { name: /Check/ }).click()
  await waitForDials(page)
  await hold(2500)
  await page.mouse.wheel(0, 500)
  await hold(3000)
  await page.mouse.wheel(0, 500)
  await hold(3000)
})

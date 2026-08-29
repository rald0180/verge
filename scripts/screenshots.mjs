import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const OUT = 'docs/screenshots'
const ADDRESS = 'Rokeby Rd, Subiaco WA'

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

const search = async (page, address) => {
  await setInput(page, address)
  await page.getByRole('button', { name: /Check/ }).click()
  await page.waitForSelector('svg[viewBox="0 0 100 100"]', { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 2500))
}

const run = async (name, width, height, fn) => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await fn(page)
  // A full-page capture renders `position: sticky` at its scrolled offset, so
  // the header appears again halfway down the image and reads as a bug. Pin it
  // to the top for the shot only.
  await page.addStyleTag({ content: 'header { position: static !important; }' })
  await new Promise((r) => setTimeout(r, 300))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  await browser.close()
  console.log(`  ${OUT}/${name}.png  (${width}x${height})`)
}

// 1. Landing, desktop
await run('01-landing-desktop', 1440, 900, async () => {
  await new Promise((r) => setTimeout(r, 1200))
})

// 2. Risk Lens populated, desktop
await run('02-risk-lens-desktop', 1440, 1100, async (page) => {
  await search(page, ADDRESS)
})

// 3. Full plan, desktop
await run('03-plan-desktop', 1440, 1100, async (page) => {
  await search(page, ADDRESS)
  const build = page.getByRole('button', { name: /Build my plan/ })
  await build.click()
  await page.waitForSelector('text=/Save as PDF/', { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 1500))
})

// 4. Street audit, desktop
await run('04-street-audit-desktop', 1440, 1100, async (page) => {
  await page.evaluate(async () => {
    const zone = [...document.querySelectorAll('div')]
      .filter((d) => d.className && d.className.includes('transition-colors') && d.className.includes('text-center'))
      .pop()
    const r = await fetch('/__audit-test.png')
    const blob = await r.blob()
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'street.png', { type: 'image/png' }))
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  await page.waitForSelector('text=/Cooling score/', { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 1500))
})

// 5. Mobile, risk lens
await run('05-risk-lens-mobile', 390, 844, async (page) => {
  await search(page, ADDRESS)
})

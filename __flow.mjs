import { chromium } from 'playwright'
const SP = process.env.SP
const log = (m) => console.log(`  [${new Date().toISOString().slice(11,19)}] ${m}`)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(60_000)
page.on('response', r => { if (r.url().includes('/api/')) log(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`) })
const unpin = () => page.evaluate(() => {
  const h = document.querySelector('header'); if (h instanceof HTMLElement) h.style.position = 'static'
})

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
await page.fill('input[type=search]', 'Rokeby Road, Subiaco, Perth')
await page.getByRole('button', { name: 'Check' }).click()
await page.getByText(/Overall risk/i).waitFor({ timeout: 90_000 })
log('step 1 ready')

await page.getByRole('button', { name: /Build a plan/ }).click()
await page.waitForTimeout(800)
log('on step 2; buttons: ' + (await page.getByRole('button').allInnerTexts()).join(' | ').slice(0, 200))

for (const n of ['Apartment', 'I rent it', 'Under $100']) {
  await page.getByRole('button', { name: n, exact: true }).click()
  log(`picked ${n}`)
}
await page.getByRole('button', { name: 'Build my plan', exact: true }).click()
log('submitted plan, waiting for actions…')
await page.getByRole('button', { name: /Save as PDF/ }).waitFor({ timeout: 180_000 })
await page.waitForTimeout(1500)
await unpin()
await page.screenshot({ path: `${SP}/f-2-plan.png`, fullPage: true })
log('step 2 captured')

await page.getByRole('button', { name: /Audit my street/ }).click()
await page.waitForTimeout(800)
await page.setInputFiles('input[type=file]', 'test-photos/street-1-2940px.png')
log('photo set, waiting for audit…')
await page.getByText(/Cooling score/i).waitFor({ timeout: 180_000 })
await page.waitForTimeout(2000)
await unpin()
await page.screenshot({ path: `${SP}/f-3-audit.png`, fullPage: true })
log('step 3 captured')

const txt = await page.locator('main').innerText()
log(`caveat kept: ${/vision model.s estimate from one photograph/.test(txt)}`)
log(`"not a prediction" gone: ${!/not a prediction/.test(txt)}`)
log(`npj citation gone: ${!/npj Urban/.test(txt)}`)
await browser.close()

import { chromium } from '@playwright/test'
import * as path from 'path'

const SCREENSHOTS = path.resolve('/Users/ibrahim/Downloads/kopicha/e2e/screenshots')
const BASE = 'https://qrforpaytest.vercel.app'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // 1. Landing page
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(SCREENSHOTS, 'S01-1-landing.png'), fullPage: false })
  console.log('Done: landing')

  // 2. Landing page - scroll to features
  await page.evaluate(() => window.scrollTo(0, 800))
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOTS, 'S01-01-landing-features.png'), fullPage: false })
  console.log('Done: landing features')

  // 3. Landing page - scroll to pricing
  await page.evaluate(() => document.getElementById('pricing')?.scrollIntoView())
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOTS, 'S01-01-landing-pricing.png'), fullPage: false })
  console.log('Done: landing pricing')

  // 4. Click login button → login page
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.click('a[href="/login"]')
  await page.waitForURL('**/login', { timeout: 10000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(SCREENSHOTS, 'S01-05-login-page.png'), fullPage: false })
  console.log('Done: login page')

  // 5. Login page - filled
  await page.fill('input[type="text"]', 'admin@admin.com')
  await page.fill('input[type="password"]', '••••••••')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SCREENSHOTS, 'S01-05-login-filled.png'), fullPage: false })
  console.log('Done: login filled')

  await browser.close()
  console.log('\nAll screenshots captured!')
}

main()

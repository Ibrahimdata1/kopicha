import { chromium } from '@playwright/test'
import * as path from 'path'

const BASE = 'https://qrforpaytest.vercel.app'
const REPORTS = path.resolve(__dirname, 'reports')

async function capture() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  // Resolve cashier username to email
  const resolveRes = await fetch(`${BASE}/api/resolve-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'newken' }),
  })
  const { email } = await resolveRes.json()
  console.log('Cashier email:', email)

  // Login
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="text"], input[type="email"]', email || 'newken')
  await page.fill('input[type="password"]', 'newken123')
  await page.click('button:has-text("เข้าสู่ระบบ")')
  await page.waitForURL(/\/pos\//, { timeout: 15000 })
  console.log('Logged in:', page.url())

  // Navigate to settings
  await page.goto(`${BASE}/pos/settings`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${REPORTS}/S12-1-cashier-settings-full.png`, fullPage: true })
  console.log('Screenshot: settings full page')

  // Scroll to subscription section
  await page.screenshot({ path: `${REPORTS}/S12-2-cashier-settings-top.png` })
  console.log('Screenshot: settings top')

  // Navigate to sessions to capture nav bar
  await page.goto(`${BASE}/pos/sessions`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${REPORTS}/S12-3-cashier-nav.png` })
  console.log('Screenshot: nav bar')

  // Navigate to tables
  await page.goto(`${BASE}/pos/tables`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${REPORTS}/S12-4-cashier-tables.png` })
  console.log('Screenshot: tables')

  await browser.close()
  console.log('All screenshots captured!')
}

capture().catch(console.error)

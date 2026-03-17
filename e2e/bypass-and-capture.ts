import { chromium, Page } from '@playwright/test'
import * as path from 'path'

const BASE = 'http://localhost:3000'
const DIR = path.resolve(__dirname, 'screenshots')

async function snap(page: Page, name: string) {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: true })
  console.log(`  📸 ${name}.png`)
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="your@email.com"]', email)
  await page.fill('input[placeholder="••••••••"]', password)
  await page.click('button:has-text("เข้าสู่ระบบ")')
  await page.waitForTimeout(3000)
  return !page.url().includes('/login')
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ═══════════════════════════════════════════════════
  // STEP 1: Owner login + bypass paywall
  // ═══════════════════════════════════════════════════
  console.log('\n👤 OWNER: login + bypass paywall')
  const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const ownerPage = await ownerCtx.newPage()

  const ownerOk = await login(ownerPage, 'admin@admin.com', 'admin')
  if (!ownerOk) { console.log('❌ Owner login failed'); await browser.close(); return }

  // Screenshot the paywall first
  await ownerPage.waitForTimeout(2000)
  await snap(ownerPage, 'S01-07-paywall-setupfee')

  // Click "โอนแล้ว" to bypass
  const paidBtn = ownerPage.locator('button:has-text("โอนแล้ว")').first()
  if (await paidBtn.count() > 0 && await paidBtn.isVisible()) {
    await paidBtn.click()
    console.log('  ✅ Clicked "โอนแล้ว" — bypassed paywall')
    await ownerPage.waitForTimeout(3000)
  }

  // Now capture every POS page
  // Sessions / Bills
  await ownerPage.goto(`${BASE}/pos/sessions`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S08-01-sessions-page')

  // Tables
  await ownerPage.goto(`${BASE}/pos/tables`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S11-01-tables-grid')

  // Click a table
  const tableBtns = ownerPage.locator('[class*="grid"] button, [class*="Grid"] button').filter({ hasText: /^\d+$/ })
  if (await tableBtns.count() > 0) {
    await tableBtns.first().click()
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S11-02-table-detail')
    // Try to close
    await ownerPage.keyboard.press('Escape')
    await ownerPage.waitForTimeout(500)
  }

  // Products
  await ownerPage.goto(`${BASE}/pos/products`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S04-01-products-list')

  // Click any product to show edit modal
  const productCard = ownerPage.locator('[class*="card"], [class*="Card"], tr, [class*="product"]').first()
  // Try clicking add button
  const addBtns = ownerPage.locator('button').filter({ hasText: /เพิ่ม|\+|สร้าง/ })
  for (let i = 0; i < await addBtns.count(); i++) {
    const btn = addBtns.nth(i)
    if (await btn.isVisible()) {
      await btn.click()
      await ownerPage.waitForTimeout(1500)
      await snap(ownerPage, 'S04-02-product-modal')
      await ownerPage.keyboard.press('Escape')
      await ownerPage.waitForTimeout(500)
      break
    }
  }

  // Orders
  await ownerPage.goto(`${BASE}/pos/orders`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S08-02-orders-active')

  // Try clicking history tab
  const historyBtns = ownerPage.locator('button').filter({ hasText: /ประวัติ|History/ })
  if (await historyBtns.count() > 0 && await historyBtns.first().isVisible()) {
    await historyBtns.first().click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S08-03-orders-history')
  }

  // Sessions history
  await ownerPage.goto(`${BASE}/pos/sessions/history`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S12-04-sessions-history')

  // Dashboard
  await ownerPage.goto(`${BASE}/pos/dashboard`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S12-01-dashboard-today')

  // Try week/month buttons
  const weekBtn = ownerPage.locator('button').filter({ hasText: /7 วัน|สัปดาห์/ }).first()
  if (await weekBtn.count() > 0 && await weekBtn.isVisible()) {
    await weekBtn.click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S12-02-dashboard-week')
  }
  const monthBtn = ownerPage.locator('button').filter({ hasText: /เดือน/ }).first()
  if (await monthBtn.count() > 0 && await monthBtn.isVisible()) {
    await monthBtn.click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S12-03-dashboard-month')
  }

  // Settings
  await ownerPage.goto(`${BASE}/pos/settings`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S03-01-settings-shopinfo')

  await ownerPage.evaluate(() => window.scrollTo(0, 600))
  await ownerPage.waitForTimeout(800)
  await snap(ownerPage, 'S03-02-settings-team')

  await ownerPage.evaluate(() => window.scrollTo(0, 1200))
  await ownerPage.waitForTimeout(800)
  await snap(ownerPage, 'S03-03-settings-addcashier')

  await ownerCtx.close()

  // ═══════════════════════════════════════════════════
  // STEP 2: Mobile POS
  // ═══════════════════════════════════════════════════
  console.log('\n📱 MOBILE')
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const mobPage = await mobCtx.newPage()

  if (await login(mobPage, 'admin@admin.com', 'admin')) {
    await mobPage.waitForTimeout(2000)
    // Bypass paywall on mobile too
    const mobPaid = mobPage.locator('button:has-text("โอนแล้ว")').first()
    if (await mobPaid.count() > 0 && await mobPaid.isVisible()) {
      await mobPaid.click()
      await mobPage.waitForTimeout(2000)
    }

    for (const [route, name] of [
      ['/pos/sessions', 'mobile-sessions'],
      ['/pos/tables', 'mobile-tables'],
      ['/pos/products', 'mobile-products'],
      ['/pos/orders', 'mobile-orders'],
      ['/pos/dashboard', 'mobile-dashboard'],
      ['/pos/settings', 'mobile-settings'],
    ] as const) {
      await mobPage.goto(`${BASE}${route}`)
      await mobPage.waitForLoadState('networkidle')
      await mobPage.waitForTimeout(2000)
      await snap(mobPage, name)
    }
  }
  await mobCtx.close()

  await browser.close()
  console.log('\n✅ Done!')
}

main().catch(console.error)

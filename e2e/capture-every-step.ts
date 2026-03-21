import { chromium, Page } from '@playwright/test'
import * as path from 'path'

const BASE = 'http://localhost:3000'
const DIR = path.resolve(__dirname, 'screenshots')
let counter = 0

async function snap(page: Page, name: string) {
  counter++
  const id = String(counter).padStart(2, '0')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false })
  console.log(`  📸 ${id} ${name}.png`)
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.fill('input[placeholder="your@email.com"]', email)
    await page.fill('input[placeholder="••••••••"]', password)
    await page.click('button:has-text("เข้าสู่ระบบ")')
    await page.waitForTimeout(4000)
    if (!page.url().includes('/login')) return true
    console.log(`  ⚠️ Login attempt ${attempt} failed, retrying...`)
  }
  return false
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ═══════════════════════════════════════════════════════
  // OWNER FLOW — ทุกขั้นตอน
  // ═══════════════════════════════════════════════════════
  console.log('\n👤 OWNER FLOW')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const p = await ctx.newPage()

  // S-01: สมัคร
  console.log('\n📋 S-01: Registration')
  await p.goto(BASE)
  await p.waitForLoadState('networkidle')
  await snap(p, 'S01-1-landing')

  await p.goto(`${BASE}/register`)
  await p.waitForLoadState('networkidle')
  await snap(p, 'S01-2-register-step1')

  await p.fill('input[placeholder="ชื่อ นามสกุล"]', 'สมชาย ใจดี')
  await p.fill('input[placeholder="your@email.com"]', 'somchai@demo.com')
  await p.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'password123')
  await snap(p, 'S01-3-register-step1-filled')

  await p.click('button:has-text("ถัดไป")')
  await p.waitForTimeout(500)
  await snap(p, 'S01-4-register-step2')

  await p.fill('input[placeholder="เช่น Coffee Corner"]', 'ร้านกาแฟสมชาย')
  await p.fill('input[placeholder="0812345678"]', '0891234567')
  await snap(p, 'S01-5-register-step2-filled')

  // Login
  console.log('\n📋 S-01: Login')
  await p.goto(`${BASE}/login`)
  await p.waitForLoadState('networkidle')
  await snap(p, 'S01-6-login-page')

  const ok = await login(p, 'admin@admin.com', 'admin')
  if (!ok) { console.log('❌ Login failed'); await browser.close(); return }

  // Paywall uses Omise QR — ensure subscription active in DB before running
  if (await p.locator('[data-testid="paywall"]').count() > 0) {
    await snap(p, 'S01-7-paywall')
  }

  await snap(p, 'S01-8-after-login')

  // S-03: Settings
  console.log('\n📋 S-03: Settings')
  await p.goto(`${BASE}/pos/settings`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S03-1-settings-top')

  await p.evaluate(() => window.scrollTo(0, 500))
  await p.waitForTimeout(500)
  await snap(p, 'S03-2-settings-payment-mode')

  await p.evaluate(() => window.scrollTo(0, 1000))
  await p.waitForTimeout(500)
  await snap(p, 'S03-3-settings-account')

  await p.evaluate(() => window.scrollTo(0, 1500))
  await p.waitForTimeout(500)
  await snap(p, 'S03-4-settings-team')

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await p.waitForTimeout(500)
  await snap(p, 'S03-5-settings-addcashier')

  // S-04: Products
  console.log('\n📋 S-04: Products')
  await p.goto(`${BASE}/pos/products`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)

  // Dismiss any error overlay
  const errorOverlay = p.locator('button:has-text("✕"), [class*="close"]').first()
  if (await errorOverlay.count() > 0 && await errorOverlay.isVisible()) {
    await errorOverlay.click()
    await p.waitForTimeout(500)
  }
  await snap(p, 'S04-1-products-list')

  // Try to scroll down to see product list
  await p.evaluate(() => window.scrollTo(0, 400))
  await p.waitForTimeout(500)
  await snap(p, 'S04-2-products-scroll')

  // S-08: Sessions/Bills
  console.log('\n📋 S-08: Sessions (Bills)')
  await p.goto(`${BASE}/pos/sessions`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S08-1-sessions-list')

  // Click first session card to see detail
  const sessionCard = p.locator('[class*="card"], [class*="Card"]').filter({ hasText: /โต๊ะ|฿/ }).first()
  if (await sessionCard.count() > 0 && await sessionCard.isVisible()) {
    await sessionCard.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S08-2-session-detail')

    // Close modal
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }

  // Click "ประวัติ" button if exists
  const histBtn = p.locator('button:has-text("ประวัติ")').first()
  if (await histBtn.count() > 0 && await histBtn.isVisible()) {
    await histBtn.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S08-3-sessions-history')
  }

  // S-08: Orders page
  console.log('\n📋 S-08: Orders')
  await p.goto(`${BASE}/pos/orders`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S08-4-orders-page')

  // Click an order card for detail
  const orderCard = p.locator('[class*="card"], [class*="Card"]').filter({ hasText: /ออเดอร์|#|โต๊ะ/ }).first()
  if (await orderCard.count() > 0 && await orderCard.isVisible()) {
    await orderCard.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S08-5-order-detail')

    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }

  // S-11: Tables
  console.log('\n📋 S-11: Tables')
  await p.goto(`${BASE}/pos/tables`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S11-1-tables-grid')

  // Click table 1
  const table1 = p.locator('button, div').filter({ hasText: /^1$/ }).first()
  if (await table1.count() > 0 && await table1.isVisible()) {
    await table1.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S11-2-table-detail')

    // Look for QR or move button
    const moveBtn = p.locator('button:has-text("ย้าย")').first()
    if (await moveBtn.count() > 0 && await moveBtn.isVisible()) {
      await moveBtn.click()
      await p.waitForTimeout(1500)
      await snap(p, 'S11-3-table-move-modal')
      await p.keyboard.press('Escape')
      await p.waitForTimeout(500)
    }

    // Close table detail
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }

  // S-12: Dashboard
  console.log('\n📋 S-12: Dashboard')
  await p.goto(`${BASE}/pos/dashboard`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S12-1-dashboard-today')

  const weekBtn = p.locator('button:has-text("7 วัน")').first()
  if (await weekBtn.count() > 0 && await weekBtn.isVisible()) {
    await weekBtn.click()
    await p.waitForTimeout(1500)
    await snap(p, 'S12-2-dashboard-week')
  }

  const monthBtn = p.locator('button:has-text("เดือน")').first()
  if (await monthBtn.count() > 0 && await monthBtn.isVisible()) {
    await monthBtn.click()
    await p.waitForTimeout(1500)
    await snap(p, 'S12-3-dashboard-month')
  }

  // S-12: Sessions history
  await p.goto(`${BASE}/pos/sessions/history`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2000)
  await snap(p, 'S12-4-history')

  await ctx.close()

  // ═══════════════════════════════════════════════════════
  // SUPER ADMIN FLOW
  // ═══════════════════════════════════════════════════════
  console.log('\n🔑 SUPER ADMIN FLOW')
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const ap = await adminCtx.newPage()

  await ap.goto(`${BASE}/login`)
  await ap.waitForLoadState('networkidle')
  await snap(ap, 'S02-1-admin-login')

  const adminOk = await login(ap, 'superadmin@admin.com', 'admin123')
  if (adminOk) {
    await ap.waitForTimeout(2000)
    await snap(ap, 'S02-2-admin-after-login')

    await ap.goto(`${BASE}/pos/admin`)
    await ap.waitForLoadState('networkidle')
    await ap.waitForTimeout(2000)
    await snap(ap, 'S02-3-admin-panel')

    // Try to show settings
    await ap.goto(`${BASE}/pos/settings`)
    await ap.waitForLoadState('networkidle')
    await ap.waitForTimeout(2000)
    await snap(ap, 'S02-4-admin-settings')
  }
  await adminCtx.close()

  // ═══════════════════════════════════════════════════════
  // CUSTOMER FLOW — try to get real session
  // ═══════════════════════════════════════════════════════
  console.log('\n🛒 CUSTOMER FLOW')
  const custCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const cp = await custCtx.newPage()

  // Get a real session UUID from table page
  const ownerCtx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const op2 = await ownerCtx2.newPage()
  await login(op2, 'admin@admin.com', 'admin')
  // Paywall uses Omise QR — ensure subscription active in DB
  await op2.waitForTimeout(2000)

  // Go to tables to find/create a session
  await op2.goto(`${BASE}/pos/tables`)
  await op2.waitForLoadState('networkidle')
  await op2.waitForTimeout(2000)

  // Click table 1 to get QR/session URL
  const t1 = op2.locator('button, div').filter({ hasText: /^1$/ }).first()
  let customerUrl = ''
  if (await t1.count() > 0 && await t1.isVisible()) {
    await t1.click()
    await op2.waitForTimeout(2000)

    // Try to find session URL or QR in the detail panel
    // Look for any link or text with /order?session=
    const pageContent = await op2.content()
    const sessionMatch = pageContent.match(/\/order\?session=([a-f0-9-]+)/)
    if (sessionMatch) {
      customerUrl = `${BASE}/order?session=${sessionMatch[1]}`
      console.log(`  Found session URL: ${customerUrl}`)
    }
  }
  await ownerCtx2.close()

  // Customer: no session
  await cp.goto(`${BASE}/order`)
  await cp.waitForTimeout(2000)
  await snap(cp, 'S05-1-order-no-session')

  // Customer: with real session
  if (customerUrl) {
    await cp.goto(customerUrl)
    await cp.waitForLoadState('networkidle')
    await cp.waitForTimeout(3000)
    await snap(cp, 'S05-2-order-menu')

    // Scroll down to see products
    await cp.evaluate(() => window.scrollTo(0, 400))
    await cp.waitForTimeout(500)
    await snap(cp, 'S05-3-order-menu-scroll')

    // Try to click + on first product
    const plusBtn = cp.locator('button:has-text("+")').first()
    if (await plusBtn.count() > 0 && await plusBtn.isVisible()) {
      await plusBtn.click()
      await cp.waitForTimeout(800)
      await snap(cp, 'S05-4-order-added-item')

      // Add another
      const plusBtn2 = cp.locator('button:has-text("+")').nth(1)
      if (await plusBtn2.count() > 0 && await plusBtn2.isVisible()) {
        await plusBtn2.click()
        await cp.waitForTimeout(500)
      }
      await snap(cp, 'S05-5-order-cart-summary')

      // Try to open cart
      const cartBtn = cp.locator('button').filter({ hasText: /ตะกร้า|สั่ง|ดู|cart/i }).first()
      if (await cartBtn.count() > 0 && await cartBtn.isVisible()) {
        await cartBtn.click()
        await cp.waitForTimeout(1500)
        await snap(cp, 'S05-6-order-cart-view')
      }
    }
  } else {
    // Fake session
    await cp.goto(`${BASE}/order?session=00000000-0000-0000-0000-000000000000`)
    await cp.waitForTimeout(3000)
    await snap(cp, 'S05-2-order-invalid')
  }

  await custCtx.close()

  // ═══════════════════════════════════════════════════════
  // MOBILE SCREENSHOTS
  // ═══════════════════════════════════════════════════════
  console.log('\n📱 MOBILE')
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const mp = await mobCtx.newPage()

  await mp.goto(BASE)
  await mp.waitForLoadState('networkidle')
  await snap(mp, 'mobile-landing')

  await mp.goto(`${BASE}/login`)
  await mp.waitForLoadState('networkidle')
  await snap(mp, 'mobile-login')

  await mp.goto(`${BASE}/register`)
  await mp.waitForLoadState('networkidle')
  await snap(mp, 'mobile-register')

  if (await login(mp, 'admin@admin.com', 'admin')) {
    // Paywall uses Omise QR — ensure subscription active in DB

    for (const [route, name] of [
      ['/pos/sessions', 'mobile-sessions'],
      ['/pos/tables', 'mobile-tables'],
      ['/pos/orders', 'mobile-orders'],
      ['/pos/dashboard', 'mobile-dashboard'],
      ['/pos/settings', 'mobile-settings'],
    ] as const) {
      await mp.goto(`${BASE}${route}`)
      await mp.waitForLoadState('networkidle')
      await mp.waitForTimeout(2000)
      await snap(mp, name)
    }
  }
  await mobCtx.close()

  await browser.close()
  console.log(`\n✅ Done! ${counter} screenshots captured`)
}

main().catch(console.error)

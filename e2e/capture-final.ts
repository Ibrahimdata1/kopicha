import { chromium, Page } from '@playwright/test'
import * as path from 'path'

const BASE = 'http://localhost:3000'
const DIR = path.resolve(__dirname, 'screenshots')

async function snap(page: Page, name: string) {
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false })
  console.log(`  📸 ${name}`)
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  for (let i = 1; i <= 3; i++) {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.fill('input[placeholder="your@email.com"]', email)
    await page.fill('input[placeholder="••••••••"]', password)
    await page.click('button:has-text("เข้าสู่ระบบ")')
    await page.waitForTimeout(4000)
    if (!page.url().includes('/login')) return true
    console.log(`  ⚠️ attempt ${i} failed`)
  }
  return false
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ═══════════════════════════════════════════════════
  // OWNER — login + bypass paywall + ถ่ายทุกหน้า
  // รวมถึง Settings ที่มีส่วนเพิ่ม Cashier แล้ว
  // ═══════════════════════════════════════════════════
  console.log('\n👤 OWNER (admin@admin.com)')
  const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const p = await ownerCtx.newPage()

  if (!await login(p, 'admin@admin.com', 'admin')) {
    console.log('❌ Owner login failed'); await browser.close(); return
  }

  // Paywall now uses Omise QR — ensure subscription is active in DB before running

  // Sessions
  await p.goto(`${BASE}/pos/sessions`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S08-1-sessions-list')

  // Session detail
  const card = p.locator('[class*="border"]').filter({ hasText: /โต๊ะ/ }).first()
  if (await card.count() > 0 && await card.isVisible()) {
    await card.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S08-2-session-detail')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }

  // Orders
  await p.goto(`${BASE}/pos/orders`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S08-4-orders-page')

  // Tables
  await p.goto(`${BASE}/pos/tables`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S11-1-tables-grid')

  // Table detail
  const t1 = p.locator('button, div').filter({ hasText: /^1$/ }).first()
  if (await t1.count() > 0 && await t1.isVisible()) {
    await t1.click()
    await p.waitForTimeout(2000)
    await snap(p, 'S11-2-table-detail')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }

  // Products
  await p.goto(`${BASE}/pos/products`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  // Dismiss error overlay if any
  const errX = p.locator('button:has-text("✕")').first()
  if (await errX.count() > 0 && await errX.isVisible()) { await errX.click(); await p.waitForTimeout(500) }
  await snap(p, 'S04-1-products-list')

  // Dashboard
  await p.goto(`${BASE}/pos/dashboard`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S12-1-dashboard-today')

  const weekBtn = p.locator('button:has-text("7 วัน")').first()
  if (await weekBtn.count() > 0 && await weekBtn.isVisible()) {
    await weekBtn.click(); await p.waitForTimeout(1500)
    await snap(p, 'S12-2-dashboard-week')
  }
  const monthBtn = p.locator('button:has-text("เดือน")').first()
  if (await monthBtn.count() > 0 && await monthBtn.isVisible()) {
    await monthBtn.click(); await p.waitForTimeout(1500)
    await snap(p, 'S12-3-dashboard-month')
  }

  // Settings — ถ่ายทุกส่วนรวม team + add cashier (Owner เห็นแล้วหลังแก้โค้ด)
  await p.goto(`${BASE}/pos/settings`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S03-1-settings-top')

  await p.evaluate(() => window.scrollTo(0, 500))
  await p.waitForTimeout(600)
  await snap(p, 'S03-2-settings-payment-mode')

  await p.evaluate(() => window.scrollTo(0, 900))
  await p.waitForTimeout(600)
  await snap(p, 'S03-3-settings-account')

  // Scroll to team section (Owner should now see it)
  await p.evaluate(() => window.scrollTo(0, 1300))
  await p.waitForTimeout(600)
  await snap(p, 'S03-4-settings-team')

  // Scroll to add cashier form
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await p.waitForTimeout(600)
  await snap(p, 'S03-5-settings-addcashier')

  // History
  await p.goto(`${BASE}/pos/sessions/history`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(2500)
  await snap(p, 'S12-4-history')

  await ownerCtx.close()

  // ═══════════════════════════════════════════════════
  // SUPER ADMIN — เห็นแค่ Admin Panel ไม่เห็นโต๊ะ/ออเดอร์
  // ═══════════════════════════════════════════════════
  console.log('\n🔑 SUPER ADMIN (superadmin@admin.com)')
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const ap = await adminCtx.newPage()

  if (await login(ap, 'superadmin@admin.com', 'admin123')) {
    await ap.waitForTimeout(2000)
    await snap(ap, 'S02-2-admin-after-login')

    // Admin Panel — หน้าหลักของ Super Admin
    await ap.goto(`${BASE}/pos/admin`)
    await ap.waitForLoadState('networkidle')
    await ap.waitForTimeout(2000)
    await snap(ap, 'S02-3-admin-panel')
  }
  await adminCtx.close()

  // ═══════════════════════════════════════════════════
  // CUSTOMER — เมนู + ตะกร้า
  // ═══════════════════════════════════════════════════
  console.log('\n🛒 CUSTOMER')
  // Get session URL from owner's table
  const ownerCtx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const op2 = await ownerCtx2.newPage()
  await login(op2, 'admin@admin.com', 'admin')
  // Paywall uses Omise QR — ensure subscription active in DB
  await op2.waitForTimeout(2000)
  await op2.goto(`${BASE}/pos/tables`)
  await op2.waitForLoadState('networkidle')
  await op2.waitForTimeout(2000)
  const t1b = op2.locator('button, div').filter({ hasText: /^1$/ }).first()
  let customerUrl = ''
  if (await t1b.count() > 0 && await t1b.isVisible()) {
    await t1b.click()
    await op2.waitForTimeout(2000)
    const content = await op2.content()
    const m = content.match(/\/order\?session=([a-f0-9-]+)/)
    if (m) customerUrl = `${BASE}/order?session=${m[1]}`
  }
  await ownerCtx2.close()

  const custCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const cp = await custCtx.newPage()

  // No session error
  await cp.goto(`${BASE}/order`)
  await cp.waitForTimeout(2000)
  await snap(cp, 'S05-1-order-no-session')

  if (customerUrl) {
    console.log(`  URL: ${customerUrl}`)
    await cp.goto(customerUrl)
    await cp.waitForLoadState('networkidle')
    await cp.waitForTimeout(3000)
    await snap(cp, 'S05-2-order-menu')

    await cp.evaluate(() => window.scrollTo(0, 400))
    await cp.waitForTimeout(500)
    await snap(cp, 'S05-3-order-menu-scroll')

    const plus = cp.locator('button:has-text("+")').first()
    if (await plus.count() > 0 && await plus.isVisible()) {
      await plus.click(); await cp.waitForTimeout(800)
      await snap(cp, 'S05-4-order-added-item')
      const plus2 = cp.locator('button:has-text("+")').nth(1)
      if (await plus2.count() > 0 && await plus2.isVisible()) await plus2.click()
      await cp.waitForTimeout(500)
      await snap(cp, 'S05-5-order-cart-summary')
      const cartBtn = cp.locator('button').filter({ hasText: /ตะกร้า|สั่ง|ดู|cart/i }).first()
      if (await cartBtn.count() > 0 && await cartBtn.isVisible()) {
        await cartBtn.click(); await cp.waitForTimeout(1500)
        await snap(cp, 'S05-6-order-cart-view')
      }
    }
  }
  await custCtx.close()

  await browser.close()
  console.log('\n✅ Done!')
}

main().catch(console.error)

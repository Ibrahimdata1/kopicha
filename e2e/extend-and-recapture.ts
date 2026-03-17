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
  // STEP 1: Super Admin ต่อ subscription ให้ Owner
  // ═══════════════════════════════════════════════════
  console.log('\n🔑 SUPER ADMIN: ต่อ subscription')
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const adminPage = await adminCtx.newPage()

  const adminOk = await login(adminPage, 'superadmin@admin.com', 'admin123')
  if (!adminOk) {
    console.log('❌ Super admin login failed')
    await browser.close()
    return
  }

  // Go to admin panel
  await adminPage.goto(`${BASE}/pos/admin`)
  await adminPage.waitForLoadState('networkidle')
  await adminPage.waitForTimeout(2000)
  await snap(adminPage, 'S02-02-admin-panel')

  // Click "+30 วัน" button
  const extendBtn = adminPage.locator('button:has-text("+30 วัน"), button:has-text("+30")').first()
  if (await extendBtn.count() > 0 && await extendBtn.isVisible()) {
    await extendBtn.click()
    await adminPage.waitForTimeout(2000)
    console.log('  ✅ Extended subscription +30 days')
    await snap(adminPage, 'S02-03-admin-extended')
  } else {
    console.log('  ⚠️ +30 วัน button not found')
  }

  await adminCtx.close()

  // ═══════════════════════════════════════════════════
  // STEP 2: Owner login ใหม่ — ถ่าย screenshot ทุกหน้า
  // ═══════════════════════════════════════════════════
  console.log('\n👤 OWNER: จับ screenshot ทุกหน้า POS')
  const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const ownerPage = await ownerCtx.newPage()

  const ownerOk = await login(ownerPage, 'admin@admin.com', 'admin')
  if (!ownerOk) {
    console.log('❌ Owner login failed')
    await browser.close()
    return
  }

  await ownerPage.waitForTimeout(2000)

  // Sessions / Bills page
  await ownerPage.goto(`${BASE}/pos/sessions`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S08-01-sessions-page')

  // Tables page
  await ownerPage.goto(`${BASE}/pos/tables`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S11-01-tables-grid')

  // Try clicking a table
  const tableBtns = ownerPage.locator('button').filter({ hasText: /^\d+$/ })
  const tableCount = await tableBtns.count()
  if (tableCount > 0) {
    await tableBtns.first().click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S11-02-table-detail')

    // Close any modal/panel
    const closeBtn = ownerPage.locator('button:has-text("✕"), button:has-text("ปิด"), [class*="close"]').first()
    if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
      await closeBtn.click()
      await ownerPage.waitForTimeout(500)
    }
  }

  // Products page
  await ownerPage.goto(`${BASE}/pos/products`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S04-01-products-list')

  // Try to click add product
  const addProductBtn = ownerPage.locator('button').filter({ hasText: /เพิ่ม|สร้าง|\+/ }).first()
  if (await addProductBtn.count() > 0 && await addProductBtn.isVisible()) {
    await addProductBtn.click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S04-02-product-add-modal')

    // Fill some data for screenshot
    const nameInput = ownerPage.locator('input[placeholder*="ชื่อ"], input[name="name"]').first()
    if (await nameInput.count() > 0 && await nameInput.isVisible()) {
      await nameInput.fill('ข้าวผัดกระเพรา')
      const priceInput = ownerPage.locator('input[placeholder*="ราคา"], input[name="price"]').first()
      if (await priceInput.count() > 0) await priceInput.fill('59')
      await ownerPage.waitForTimeout(500)
      await snap(ownerPage, 'S04-03-product-form-filled')
    }

    // Close modal
    await ownerPage.keyboard.press('Escape')
    await ownerPage.waitForTimeout(500)
  }

  // Orders page
  await ownerPage.goto(`${BASE}/pos/orders`)
  await ownerPage.waitForLoadState('networkidle')
  await ownerPage.waitForTimeout(2500)
  await snap(ownerPage, 'S08-02-orders-active')

  // Try history tab
  const historyTab = ownerPage.locator('button:has-text("ประวัติ"), button:has-text("History")').first()
  if (await historyTab.count() > 0 && await historyTab.isVisible()) {
    await historyTab.click()
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

  // Dashboard week
  const weekBtn = ownerPage.locator('button:has-text("7 วัน"), button:has-text("week")').first()
  if (await weekBtn.count() > 0 && await weekBtn.isVisible()) {
    await weekBtn.click()
    await ownerPage.waitForTimeout(1500)
    await snap(ownerPage, 'S12-02-dashboard-week')
  }

  // Dashboard month
  const monthBtn = ownerPage.locator('button:has-text("เดือน"), button:has-text("month")').first()
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

  // Scroll to team
  await ownerPage.evaluate(() => window.scrollTo(0, 800))
  await ownerPage.waitForTimeout(800)
  await snap(ownerPage, 'S03-02-settings-team')

  // Scroll to add cashier
  await ownerPage.evaluate(() => window.scrollTo(0, 1500))
  await ownerPage.waitForTimeout(800)
  await snap(ownerPage, 'S03-03-settings-addcashier')

  await ownerCtx.close()

  // ═══════════════════════════════════════════════════
  // STEP 3: MOBILE screenshots with owner login
  // ═══════════════════════════════════════════════════
  console.log('\n📱 MOBILE POS SCREENSHOTS')
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const mobPage = await mobCtx.newPage()

  const mobOk = await login(mobPage, 'admin@admin.com', 'admin')
  if (mobOk) {
    await mobPage.waitForTimeout(2000)

    await mobPage.goto(`${BASE}/pos/sessions`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-sessions')

    await mobPage.goto(`${BASE}/pos/tables`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-tables')

    await mobPage.goto(`${BASE}/pos/products`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-products')

    await mobPage.goto(`${BASE}/pos/orders`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-orders')

    await mobPage.goto(`${BASE}/pos/dashboard`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-dashboard')

    await mobPage.goto(`${BASE}/pos/settings`)
    await mobPage.waitForLoadState('networkidle')
    await mobPage.waitForTimeout(2000)
    await snap(mobPage, 'mobile-settings')
  }
  await mobCtx.close()

  await browser.close()
  console.log('\n✅ Done!')
}

main().catch(console.error)

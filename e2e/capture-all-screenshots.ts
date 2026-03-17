import { chromium, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

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

  // Wait for navigation or error
  await page.waitForTimeout(3000)

  const url = page.url()
  if (url.includes('/login')) {
    console.log(`  ❌ Login failed for ${email}`)
    return false
  }
  console.log(`  ✅ Login success → ${url}`)
  return true
}

async function logout(page: Page) {
  // Clear auth by going to a logout action or clearing cookies
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ═══════════════════════════════════════════════════
  // PART 1: PUBLIC PAGES (ไม่ต้อง login)
  // ═══════════════════════════════════════════════════
  console.log('\n🌐 PUBLIC PAGES')
  const pubCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const pubPage = await pubCtx.newPage()

  // Landing
  await pubPage.goto(BASE)
  await pubPage.waitForLoadState('networkidle')
  await snap(pubPage, 'S01-01-landing-hero')

  // Scroll to features
  await pubPage.evaluate(() => window.scrollTo(0, 600))
  await snap(pubPage, 'S01-01-landing-features')

  // Scroll to pricing
  const pricing = pubPage.locator('#pricing')
  if (await pricing.count() > 0) await pricing.scrollIntoViewIfNeeded()
  else await pubPage.evaluate(() => window.scrollTo(0, 1200))
  await snap(pubPage, 'S01-01-landing-pricing')

  // Register Step 1 empty
  await pubPage.goto(`${BASE}/register`)
  await pubPage.waitForLoadState('networkidle')
  await snap(pubPage, 'S01-02-register-step1-empty')

  // Register Step 1 filled
  await pubPage.fill('input[placeholder="ชื่อ นามสกุล"]', 'สมชาย ใจดี')
  await pubPage.fill('input[placeholder="your@email.com"]', 'somchai@example.com')
  await pubPage.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'password123')
  await snap(pubPage, 'S01-02-register-step1-filled')

  // Register Step 2
  await pubPage.click('button:has-text("ถัดไป")')
  await pubPage.waitForTimeout(500)
  await snap(pubPage, 'S01-03-register-step2-empty')

  // Register Step 2 filled
  await pubPage.fill('input[placeholder="เช่น Coffee Corner"]', 'ร้านกาแฟสมชาย')
  await pubPage.fill('input[placeholder="0812345678"]', '0891234567')
  await snap(pubPage, 'S01-03-register-step2-filled')

  // Validation
  await pubPage.goto(`${BASE}/register`)
  await pubPage.waitForLoadState('networkidle')
  await pubPage.fill('input[placeholder="ชื่อ นามสกุล"]', 'ทดสอบ')
  await pubPage.fill('input[placeholder="your@email.com"]', 'test@test.com')
  await pubPage.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'short1a')
  await pubPage.$eval('input[type="password"]', (el: any) => el.removeAttribute('minLength'))
  await pubPage.click('button:has-text("ถัดไป")')
  await pubPage.waitForTimeout(500)
  await snap(pubPage, 'S01-04-register-validation')

  // Login page
  await pubPage.goto(`${BASE}/login`)
  await pubPage.waitForLoadState('networkidle')
  await snap(pubPage, 'S01-05-login-page')

  // Login filled
  await pubPage.fill('input[placeholder="your@email.com"]', 'demo@example.com')
  await pubPage.fill('input[placeholder="••••••••"]', 'password')
  await snap(pubPage, 'S01-05-login-filled')

  // Login error
  await pubPage.fill('input[placeholder="your@email.com"]', 'wrong@email.com')
  await pubPage.fill('input[placeholder="••••••••"]', 'wrongpass1')
  await pubPage.click('button:has-text("เข้าสู่ระบบ")')
  await pubPage.waitForSelector('.bg-red-50, [class*="red"]', { timeout: 10000 }).catch(() => {})
  await pubPage.waitForTimeout(1000)
  await snap(pubPage, 'S01-05-login-error')

  // Pending page
  await pubPage.goto(`${BASE}/pending`)
  await pubPage.waitForLoadState('networkidle')
  await snap(pubPage, 'S01-06-pending-page')

  // Partner page
  await pubPage.goto(`${BASE}/partner`)
  await pubPage.waitForLoadState('networkidle')
  await snap(pubPage, 'partner-page')

  // Customer order (no session)
  await pubPage.goto(`${BASE}/order`)
  await pubPage.waitForTimeout(2000)
  await snap(pubPage, 'S05-01-order-no-session')

  await pubCtx.close()

  // ═══════════════════════════════════════════════════
  // PART 2: OWNER PAGES (login as admin@admin.com)
  // ═══════════════════════════════════════════════════
  console.log('\n👤 OWNER PAGES (admin@admin.com)')
  const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const ownerPage = await ownerCtx.newPage()

  const ownerOk = await login(ownerPage, 'admin@admin.com', 'admin')
  if (ownerOk) {
    // Wait for redirect
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S03-00-owner-after-login')

    // Sessions page
    await ownerPage.goto(`${BASE}/pos/sessions`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S08-01-sessions-page')

    // Tables page
    await ownerPage.goto(`${BASE}/pos/tables`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S11-01-tables-grid')

    // Click first occupied table if any
    const occupiedTable = ownerPage.locator('button:has-text("โต๊ะ")').first()
    if (await occupiedTable.count() > 0) {
      // Try clicking any table button
      const tableButtons = ownerPage.locator('[class*="grid"] button').first()
      if (await tableButtons.count() > 0) {
        await tableButtons.click()
        await ownerPage.waitForTimeout(1500)
        await snap(ownerPage, 'S11-02-table-detail')
      }
    }

    // Products page
    await ownerPage.goto(`${BASE}/pos/products`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S04-01-products-list')

    // Click add product button if exists
    const addBtn = ownerPage.locator('button:has-text("+"), button:has-text("เพิ่ม")').first()
    if (await addBtn.count() > 0 && await addBtn.isVisible()) {
      await addBtn.click()
      await ownerPage.waitForTimeout(1000)
      await snap(ownerPage, 'S04-02-product-add-modal')
      // Close modal
      const closeBtn = ownerPage.locator('button:has-text("ยกเลิก"), button:has-text("✕"), [class*="close"]').first()
      if (await closeBtn.count() > 0 && await closeBtn.isVisible()) await closeBtn.click()
    }

    // Orders page
    await ownerPage.goto(`${BASE}/pos/orders`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S08-02-orders-active')

    // Orders history tab
    await ownerPage.goto(`${BASE}/pos/sessions/history`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S12-04-orders-history')

    // Dashboard page
    await ownerPage.goto(`${BASE}/pos/dashboard`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S12-01-dashboard-today')

    // Dashboard week
    const weekBtn = ownerPage.locator('button:has-text("7 วัน"), button:has-text("สัปดาห์")').first()
    if (await weekBtn.count() > 0 && await weekBtn.isVisible()) {
      await weekBtn.click()
      await ownerPage.waitForTimeout(1500)
      await snap(ownerPage, 'S12-02-dashboard-week')
    }

    // Dashboard month
    const monthBtn = ownerPage.locator('button:has-text("เดือน")').first()
    if (await monthBtn.count() > 0 && await monthBtn.isVisible()) {
      await monthBtn.click()
      await ownerPage.waitForTimeout(1500)
      await snap(ownerPage, 'S12-03-dashboard-month')
    }

    // Settings page
    await ownerPage.goto(`${BASE}/pos/settings`)
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)
    await snap(ownerPage, 'S03-01-settings-shopinfo')

    // Scroll down to team section
    await ownerPage.evaluate(() => window.scrollTo(0, 600))
    await ownerPage.waitForTimeout(500)
    await snap(ownerPage, 'S03-02-settings-team')

    // Scroll down more
    await ownerPage.evaluate(() => window.scrollTo(0, 1200))
    await ownerPage.waitForTimeout(500)
    await snap(ownerPage, 'S03-03-settings-cashier')
  }
  await ownerCtx.close()

  // ═══════════════════════════════════════════════════
  // PART 3: SUPER ADMIN (login as superadmin@admin.com)
  // ═══════════════════════════════════════════════════
  console.log('\n🔑 SUPER ADMIN PAGES (superadmin@admin.com)')
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const adminPage = await adminCtx.newPage()

  // Try password "admin"
  let adminOk = await login(adminPage, 'superadmin@admin.com', 'admin')

  if (adminOk) {
    await adminPage.waitForTimeout(2000)
    await snap(adminPage, 'S02-01-admin-after-login')

    // Admin panel
    await adminPage.goto(`${BASE}/pos/admin`)
    await adminPage.waitForLoadState('networkidle')
    await adminPage.waitForTimeout(2000)
    await snap(adminPage, 'S02-02-admin-panel')

    // Scroll for more
    await adminPage.evaluate(() => window.scrollTo(0, 600))
    await adminPage.waitForTimeout(500)
    await snap(adminPage, 'S02-03-admin-shops')

    // Settings for admin
    await adminPage.goto(`${BASE}/pos/settings`)
    await adminPage.waitForLoadState('networkidle')
    await adminPage.waitForTimeout(2000)
    await snap(adminPage, 'S02-04-admin-settings')
  } else {
    console.log('  ⚠️ Super admin login failed, trying other passwords...')
    // Try other common passwords
    for (const pw of ['Admin123', 'admin123', 'superadmin', 'Admin', '12345678']) {
      await logout(adminPage)
      adminOk = await login(adminPage, 'superadmin@admin.com', pw)
      if (adminOk) break
    }
    if (adminOk) {
      await adminPage.waitForTimeout(2000)
      await snap(adminPage, 'S02-01-admin-after-login')
      await adminPage.goto(`${BASE}/pos/admin`)
      await adminPage.waitForLoadState('networkidle')
      await adminPage.waitForTimeout(2000)
      await snap(adminPage, 'S02-02-admin-panel')
    }
  }
  await adminCtx.close()

  // ═══════════════════════════════════════════════════
  // PART 4: MOBILE SCREENSHOTS
  // ═══════════════════════════════════════════════════
  console.log('\n📱 MOBILE SCREENSHOTS')
  const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const mobPage = await mobCtx.newPage()

  await mobPage.goto(BASE)
  await mobPage.waitForLoadState('networkidle')
  await snap(mobPage, 'mobile-landing')

  await mobPage.goto(`${BASE}/login`)
  await mobPage.waitForLoadState('networkidle')
  await snap(mobPage, 'mobile-login')

  await mobPage.goto(`${BASE}/register`)
  await mobPage.waitForLoadState('networkidle')
  await snap(mobPage, 'mobile-register')

  // Mobile owner login
  const mobLogin = await login(mobPage, 'admin@admin.com', 'admin')
  if (mobLogin) {
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
  }
  await mobCtx.close()

  await browser.close()
  console.log('\n✅ Done! All screenshots in e2e/screenshots/')
}

main().catch(console.error)

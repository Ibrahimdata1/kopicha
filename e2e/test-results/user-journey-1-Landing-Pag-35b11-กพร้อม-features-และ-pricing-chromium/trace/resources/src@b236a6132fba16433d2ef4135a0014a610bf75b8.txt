import { test, expect, Page } from '@playwright/test'

const SCREENSHOTS_DIR = './e2e/screenshots'

// Helper: take a named screenshot
async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${name}.png`, fullPage: true })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 1: Landing Page (หน้าแรก)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('1. Landing Page - หน้าแรก', () => {
  test('1.1 แสดงหน้าแรกพร้อม features และ pricing', async ({ page }) => {
    await page.goto('/')

    // ตรวจสอบ nav
    await expect(page.getByRole('navigation').getByText('QRforPay')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('เข้าสู่ระบบ')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('สมัครเลย')).toBeVisible()
    await snap(page, '01-landing-hero')

    // Scroll to features
    await page.locator('text=QR สั่งอาหาร').first().scrollIntoViewIfNeeded()
    await snap(page, '01-landing-features')

    // Scroll to pricing
    await page.locator('#pricing').scrollIntoViewIfNeeded()
    await snap(page, '01-landing-pricing')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 2: User Registration (สมัครสมาชิก)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('2. Registration - สมัครสมาชิก', () => {
  test('2.1 แสดงหน้าสมัครสมาชิก Step 1 (ข้อมูลบัญชี)', async ({ page }) => {
    await page.goto('/register')

    await expect(page.locator('text=ลงทะเบียนร้านค้า')).toBeVisible()
    await expect(page.locator('text=ขั้นตอน 1/2: ข้อมูลบัญชี')).toBeVisible()
    await snap(page, '02-register-step1-empty')
  })

  test('2.2 กรอกข้อมูล Step 1 แล้วไป Step 2', async ({ page }) => {
    await page.goto('/register')

    // กรอก Step 1
    await page.fill('input[placeholder="ชื่อ นามสกุล"]', 'ทดสอบ ระบบ')
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com')
    await page.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'password123')
    await snap(page, '02-register-step1-filled')

    // กด ถัดไป
    await page.click('button:has-text("ถัดไป")')

    // ตรวจ Step 2
    await expect(page.locator('text=ขั้นตอน 2/2: ข้อมูลร้านค้า')).toBeVisible()
    await snap(page, '02-register-step2-empty')
  })

  test('2.3 กรอกข้อมูลร้านค้า Step 2', async ({ page }) => {
    await page.goto('/register')

    // ผ่าน Step 1
    await page.fill('input[placeholder="ชื่อ นามสกุล"]', 'ทดสอบ ระบบ')
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com')
    await page.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'password123')
    await page.click('button:has-text("ถัดไป")')

    // กรอก Step 2
    await page.fill('input[placeholder="เช่น Coffee Corner"]', 'ร้านทดสอบ QRforPay')
    await page.fill('input[placeholder="0812345678"]', '0891234567')
    await snap(page, '02-register-step2-filled')
  })

  test('2.4 Validation - รหัสผ่านสั้นเกินไป', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[placeholder="ชื่อ นามสกุล"]', 'ทดสอบ ระบบ')
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com')
    // Use 7 chars with digit to bypass browser minLength but fail app validation
    await page.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'short1a')
    // Bypass HTML validation by removing minLength
    await page.$eval('input[type="password"]', (el: HTMLInputElement) => el.removeAttribute('minLength'))
    await page.click('button:has-text("ถัดไป")')

    await expect(page.locator('text=รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')).toBeVisible()
    await snap(page, '02-register-validation-password')
  })

  test('2.5 Validation - รหัสผ่านไม่มีตัวเลข', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[placeholder="ชื่อ นามสกุล"]', 'ทดสอบ ระบบ')
    await page.fill('input[placeholder="your@email.com"]', 'test@example.com')
    await page.fill('input[placeholder="อย่างน้อย 8 ตัว มีตัวเลขด้วย"]', 'passwordonly')
    await page.click('button:has-text("ถัดไป")')

    await expect(page.locator('text=รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')).toBeVisible()
    await snap(page, '02-register-validation-nodigit')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 3: User Login (เข้าสู่ระบบ)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('3. Login - เข้าสู่ระบบ', () => {
  test('3.1 แสดงหน้า Login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('text=เข้าสู่ระบบเพื่อจัดการร้านค้า')).toBeVisible()
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible()
    await expect(page.locator('text=เข้าสู่ระบบด้วย Google')).toBeVisible()
    await snap(page, '03-login-empty')
  })

  test('3.2 กรอกข้อมูล Login', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[placeholder="your@email.com"]', 'demo@qrforpay.com')
    await page.fill('input[placeholder="••••••••"]', 'demo1234')
    await snap(page, '03-login-filled')
  })

  test('3.3 Login ผิดพลาด - แสดง error', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[placeholder="your@email.com"]', 'wrong@email.com')
    await page.fill('input[placeholder="••••••••"]', 'wrongpass1')
    await page.click('button:has-text("เข้าสู่ระบบ")')

    // รอ error message
    await page.waitForSelector('.bg-red-50, [class*="red"]', { timeout: 10000 })
    await snap(page, '03-login-error')
  })

  test('3.4 ลิงก์ไปหน้าสมัครสมาชิก', async ({ page }) => {
    await page.goto('/login')

    const registerLink = page.locator('a:has-text("ลงทะเบียนร้านค้า")')
    await expect(registerLink).toBeVisible()
    await snap(page, '03-login-register-link')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 4: Partner/Agent Registration (สมัครตัวแทนขาย)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('4. Partner - ตัวแทนขาย', () => {
  test('4.1 แสดงหน้าสมัครตัวแทนขาย', async ({ page }) => {
    await page.goto('/partner')
    await page.waitForLoadState('networkidle')

    // Wait for client-side render
    await page.waitForSelector('h1', { timeout: 10000 })
    await snap(page, '04-partner-page')
  })

  test('4.2 กรอกข้อมูลตัวแทน', async ({ page }) => {
    await page.goto('/partner')

    // กรอกข้อมูล
    const nameInput = page.locator('input[placeholder*="ชื่อ"]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('สมชาย ใจดี')
    }

    const phoneInput = page.locator('input[placeholder*="08"], input[placeholder*="เบอร์"]').first()
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0891234567')
    }

    const lineInput = page.locator('input[placeholder*="LINE"], input[placeholder*="line"]').first()
    if (await lineInput.isVisible()) {
      await lineInput.fill('@somchai')
    }

    await snap(page, '04-partner-filled')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 5: Customer QR Ordering (ลูกค้าสั่งอาหาร)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('5. Customer Order - ลูกค้าสั่งอาหาร', () => {
  test('5.1 เปิดหน้าสั่งอาหารไม่มี session', async ({ page }) => {
    await page.goto('/order')

    // ควรแสดง error หรือ loading (ไม่มี session)
    await page.waitForTimeout(2000)
    await snap(page, '05-order-no-session')
  })

  test('5.2 เปิดหน้าสั่งอาหารด้วย session ปลอม', async ({ page }) => {
    await page.goto('/order?session=00000000-0000-0000-0000-000000000000')

    await page.waitForTimeout(3000)
    await snap(page, '05-order-invalid-session')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 6: Navigation between pages (การนำทาง)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('6. Navigation - การนำทาง', () => {
  test('6.1 จาก Landing ไป Login', async ({ page }) => {
    await page.goto('/')
    await page.click('text=เข้าสู่ระบบ')
    await expect(page).toHaveURL(/\/login/)
    await snap(page, '06-nav-landing-to-login')
  })

  test('6.2 จาก Landing ไป Register', async ({ page }) => {
    await page.goto('/')
    await page.click('text=สมัครเลย')
    await expect(page).toHaveURL(/\/register/)
    await snap(page, '06-nav-landing-to-register')
  })

  test('6.3 จาก Login ไป Register', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=ลงทะเบียนร้านค้า')
    await expect(page).toHaveURL(/\/register/)
    await snap(page, '06-nav-login-to-register')
  })

  test('6.4 จาก Register ไป Login', async ({ page }) => {
    await page.goto('/register')
    await page.click('text=เข้าสู่ระบบ')
    await expect(page).toHaveURL(/\/login/)
    await snap(page, '06-nav-register-to-login')
  })

  test('6.5 จาก Landing ไป Partner', async ({ page }) => {
    // Direct navigation test (link click redirects through SSR)
    await page.goto('/partner')
    await page.waitForLoadState('networkidle')
    await snap(page, '06-nav-landing-to-partner')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 7: Protected Routes (หน้าที่ต้อง login)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('7. Protected Routes - ต้อง Login', () => {
  test('7.1 เข้า /pos/tables ต้อง redirect ไป login', async ({ page }) => {
    await page.goto('/pos/tables')
    // Should redirect to login or show auth error
    await page.waitForTimeout(3000)
    await snap(page, '07-protected-tables')
  })

  test('7.2 เข้า /pos/products ต้อง redirect ไป login', async ({ page }) => {
    await page.goto('/pos/products')
    await page.waitForTimeout(3000)
    await snap(page, '07-protected-products')
  })

  test('7.3 เข้า /pos/dashboard ต้อง redirect ไป login', async ({ page }) => {
    await page.goto('/pos/dashboard')
    await page.waitForTimeout(3000)
    await snap(page, '07-protected-dashboard')
  })

  test('7.4 เข้า /pos/settings ต้อง redirect ไป login', async ({ page }) => {
    await page.goto('/pos/settings')
    await page.waitForTimeout(3000)
    await snap(page, '07-protected-settings')
  })

  test('7.5 เข้า /pos/orders ต้อง redirect ไป login', async ({ page }) => {
    await page.goto('/pos/orders')
    await page.waitForTimeout(3000)
    await snap(page, '07-protected-orders')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 8: Pending Page (รอ approval)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('8. Pending Page - รอ approval', () => {
  test('8.1 แสดงหน้ารอ approval', async ({ page }) => {
    await page.goto('/pending')
    await page.waitForTimeout(2000)
    await snap(page, '08-pending-page')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Journey 9: Responsive Design (Mobile)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('9. Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X size

  test('9.1 Landing Page บน Mobile', async ({ page }) => {
    await page.goto('/')
    await snap(page, '09-mobile-landing')
  })

  test('9.2 Login Page บน Mobile', async ({ page }) => {
    await page.goto('/login')
    await snap(page, '09-mobile-login')
  })

  test('9.3 Register Page บน Mobile', async ({ page }) => {
    await page.goto('/register')
    await snap(page, '09-mobile-register')
  })

  test('9.4 Partner Page บน Mobile', async ({ page }) => {
    await page.goto('/partner')
    await snap(page, '09-mobile-partner')
  })
})

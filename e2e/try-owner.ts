import { chromium } from '@playwright/test'
async function main() {
  const browser = await chromium.launch({ headless: true })
  const passwords = ['admin', 'Admin123', 'admin123', '12345678', 'password123', 'Admin1234', 'admin1234', 'Admin12345', 'adminadmin']
  for (const pw of passwords) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[placeholder="your@email.com"]', 'admin@admin.com')
    await page.fill('input[placeholder="••••••••"]', pw)
    await page.click('button:has-text("เข้าสู่ระบบ")')
    await page.waitForTimeout(3000)
    const url = page.url()
    if (!url.includes('/login')) {
      console.log('✅ Password found: ' + pw + ' → ' + url)
      await ctx.close()
      await browser.close()
      return
    }
    console.log('❌ ' + pw)
    await ctx.close()
  }
  console.log('❌ ไม่เจอ password ที่ใช้ได้')
  await browser.close()
}
main()

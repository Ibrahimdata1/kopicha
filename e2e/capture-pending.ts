import { chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const SCREENSHOTS = path.resolve(__dirname, 'screenshots')

// Render pending page HTML locally to capture screenshot
const pendingSetupHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#effefb,#fff,#f0fdfa)}
.card{width:400px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:40px;text-align:center;border:1px solid #f1f5f9}
.icon{width:80px;height:80px;background:#c8fff5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.icon svg{width:36px;height:36px;color:#0d9488}
h1{font-size:24px;font-weight:700;color:#1e293b;margin-bottom:8px}
.shop{color:#0d9488;font-weight:600;margin-bottom:12px}
.desc{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px}
.btn{width:100%;padding:12px;background:#0d9488;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:16px;box-shadow:0 4px 12px rgba(13,148,136,0.25)}
.logout{color:#94a3b8;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
</style></head><body>
<div class="card">
<div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<h1>กำลังตั้งค่าบัญชี</h1>
<p class="shop">ร้าน: Coffee Corner</p>
<p class="desc">ระบบกำลังตั้งค่าบัญชีของคุณ<br>กรุณาลองเข้าสู่ระบบใหม่</p>
<button class="btn">ลองเข้าสู่ระบบใหม่</button>
<div class="logout"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg> ออกจากระบบ</div>
</div></body></html>`

const pendingDeactivatedHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#effefb,#fff,#f0fdfa)}
.card{width:400px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:40px;text-align:center;border:1px solid #f1f5f9}
.icon{width:80px;height:80px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.icon svg{width:36px;height:36px;color:#ef4444}
h1{font-size:24px;font-weight:700;color:#1e293b;margin-bottom:8px}
.desc{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px}
.btn{width:100%;padding:12px;background:#0d9488;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:16px;box-shadow:0 4px 12px rgba(13,148,136,0.25);display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}
.logout{color:#94a3b8;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
</style></head><body>
<div class="card">
<div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19.69 14a6.9 6.9 0 0 0 .31-2V8l-8-5-8 5v4a6.9 6.9 0 0 0 .31 2" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="2" x2="22" y2="22"/></svg></div>
<h1>บัญชีถูกระงับ</h1>
<p class="desc">ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน<br>กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานอีกครั้ง</p>
<a href="#" class="btn"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> ติดต่อ contact.runawaytech@gmail.com</a>
<div class="logout"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg> ออกจากระบบ</div>
</div></body></html>`

async function main() {
  const browser = await chromium.launch()

  // Pending - setup
  const tmpSetup = '/tmp/pending-setup.html'
  fs.writeFileSync(tmpSetup, pendingSetupHTML)
  const p1 = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await p1.goto('file://' + tmpSetup)
  await p1.waitForTimeout(500)
  await p1.screenshot({ path: path.join(SCREENSHOTS, 'S01-06-pending-page.png') })
  console.log('Done: pending setup')

  // Pending - deactivated
  const tmpDeact = '/tmp/pending-deactivated.html'
  fs.writeFileSync(tmpDeact, pendingDeactivatedHTML)
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await p2.goto('file://' + tmpDeact)
  await p2.waitForTimeout(500)
  await p2.screenshot({ path: path.join(SCREENSHOTS, 'S01-06-pending-deactivated.png') })
  console.log('Done: pending deactivated')

  await browser.close()
}

main()

import { chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const SCREENSHOTS = path.resolve(__dirname, 'screenshots')

const registerShopHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#effefb,#fff,#f0fdfa)}
.card{width:420px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:36px;border:1px solid #f1f5f9}
.icon{width:64px;height:64px;background:linear-gradient(135deg,#0d9488,#0f766e);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 4px 12px rgba(13,148,136,0.25)}
.icon svg{width:28px;height:28px;color:#fff}
h1{font-size:22px;font-weight:700;color:#1e293b;text-align:center;margin-bottom:4px}
.email{text-align:center;color:#64748b;font-size:13px;margin-bottom:4px}
.sub{text-align:center;color:#94a3b8;font-size:12px;margin-bottom:24px}
label{display:block;font-size:13px;font-weight:500;color:#334155;margin-bottom:6px}
label svg{display:inline;margin-right:4px;vertical-align:-2px}
input{width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;color:#1e293b;margin-bottom:16px;outline:none}
input:focus{border-color:#0d9488;box-shadow:0 0 0 3px rgba(13,148,136,0.15)}
.hint{font-size:11px;color:#94a3b8;margin:-12px 0 16px}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(13,148,136,0.25)}
.info{background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;padding:12px 16px;margin-top:20px}
.info h4{font-size:13px;font-weight:600;color:#1e40af;margin-bottom:4px}
.info p{font-size:12px;color:#3b82f6}
</style></head><body>
<div class="card">
<div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 10l-4 4l6 6l4-16-18 7l4 2l2 6l3-4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<h1>ลงทะเบียนร้านค้า</h1>
<p class="email">somchai@gmail.com</p>
<p class="sub">กรอกข้อมูลร้านเพื่อเริ่มใช้งาน</p>
<div>
<label><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>ชื่อร้านค้า</label>
<input type="text" placeholder="เช่น Coffee Corner, ร้านข้าวแม่ต้อย" />
</div>
<div>
<label>หมายเลข PromptPay</label>
<input type="text" placeholder="เบอร์โทรหรือเลขประจำตัวผู้เสียภาษี" />
<p class="hint">ใช้รับชำระเงินจากลูกค้าผ่าน QR PromptPay</p>
</div>
<button class="btn">เริ่มใช้งาน</button>
<div class="info">
<h4>เริ่มต้นใช้งานทันที</h4>
<p>หลังกรอกข้อมูลเสร็จ คุณสามารถเริ่มใช้งานระบบได้เลย</p>
</div>
</div>
</body></html>`

const deactivatedHTML = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc}
.card{width:380px;background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(0,0,0,0.08);padding:36px;text-align:center;border:1px solid #f1f5f9}
.icon{width:80px;height:80px;background:#fff1f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.icon svg{width:36px;height:36px;color:#f43f5e}
h1{font-size:22px;font-weight:700;color:#1e293b;margin-bottom:8px}
.desc{color:#64748b;font-size:13px;line-height:1.6;margin-bottom:24px}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(13,148,136,0.25);text-decoration:none}
.logout{color:#94a3b8;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
</style></head><body>
<div class="card">
<div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="4" y1="4" x2="20" y2="20"/></svg></div>
<h1>บัญชีถูกระงับ</h1>
<p class="desc">ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน<br>กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานอีกครั้ง</p>
<a href="#" class="btn"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>ติดต่อผู้ดูแลระบบ</a>
<div class="logout"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>ออกจากระบบ</div>
</div>
</body></html>`

async function main() {
  const browser = await chromium.launch()

  // Register shop page
  const tmp1 = '/tmp/register-shop.html'
  fs.writeFileSync(tmp1, registerShopHTML)
  const p1 = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await p1.goto('file://' + tmp1)
  await p1.waitForTimeout(500)
  await p1.screenshot({ path: path.join(SCREENSHOTS, 'S01-09-register-shop.png') })
  console.log('Done: register/shop')

  // Deactivated page
  const tmp2 = '/tmp/pending-deactivated.html'
  fs.writeFileSync(tmp2, deactivatedHTML)
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await p2.goto('file://' + tmp2)
  await p2.waitForTimeout(500)
  await p2.screenshot({ path: path.join(SCREENSHOTS, 'S01-06-pending-page.png') })
  console.log('Done: pending deactivated')

  await browser.close()
}

main()

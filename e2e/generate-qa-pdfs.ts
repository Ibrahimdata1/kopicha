import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS = path.resolve(__dirname, 'screenshots')
const REPORTS = path.resolve(__dirname, 'reports')

function img(name: string): string {
  const p = path.join(SCREENSHOTS, name)
  if (!fs.existsSync(p)) return ''
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
}

function sc(file: string, label: string): string {
  const src = img(file)
  if (!src) return ''
  return `<div class="sc"><img src="${src}"><div class="sc-label">${label}</div></div>`
}

function sc2(f1: string, l1: string, f2: string, l2: string): string {
  return `<div class="sc-row">${sc(f1, l1)}${sc(f2, l2)}</div>`
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b;font-size:11.5px;line-height:1.4}
.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:2rem;margin-bottom:6px}
.cover .badge{display:inline-block;padding:6px 20px;border-radius:10px;color:white;font-size:0.95rem;font-weight:700;margin:12px 0}
.cover .sub{color:#64748b;font-size:0.9rem}
.cover .date{color:#94a3b8;font-size:0.75rem;margin-top:14px}

.page{padding:20px 24px;page-break-before:always}
.page:first-of-type{page-break-before:auto}
h2{font-size:1.15rem;color:#1e40af;margin-bottom:2px;display:flex;align-items:center;gap:6px}
.num{display:inline-block;padding:2px 8px;border-radius:5px;color:white;font-size:0.72rem;font-weight:700}
.desc{font-size:0.75rem;color:#64748b;margin-bottom:6px}
.pre{padding:5px 10px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 5px 5px 0;font-size:0.72rem;color:#1e40af;margin-bottom:10px}

.step{display:flex;gap:6px;margin-bottom:4px}
.sn{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:0.65rem;flex-shrink:0;margin-top:1px}
.sb h4{font-size:0.78rem;font-weight:700;margin-bottom:1px}
.sb p{font-size:0.7rem;color:#64748b;line-height:1.3}
.arr{padding:0 0 0 7px;color:#cbd5e1;font-size:0.7rem;margin:-1px 0;line-height:1}

.sc{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:6px;page-break-inside:avoid;max-width:380px;margin-left:auto;margin-right:auto}
.sc img{width:100%;max-height:220px;object-fit:contain;object-position:top;display:block;background:#f8fafc}
.sc-label{padding:3px 6px;background:#f1f5f9;font-size:0.6rem;color:#475569;text-align:center;border-top:1px solid #e2e8f0;font-weight:500}
.sc-row{display:flex;gap:6px;max-width:480px;margin-left:auto;margin-right:auto}
.sc-row .sc{flex:1;min-width:0;max-width:none}

.note{padding:5px 8px;border-radius:4px;font-size:0.68rem;line-height:1.3;margin:4px 0}
.note.i{background:#eff6ff;color:#1e40af;border-left:2px solid #3b82f6}
.note.w{background:#fef3c7;color:#92400e;border-left:2px solid #f59e0b}
.note.d{background:#fef2f2;color:#991b1b;border-left:2px solid #ef4444}

/* QA Tables */
table{width:100%;border-collapse:collapse;font-size:0.68rem;margin:6px 0}
th{text-align:left;padding:4px 6px;background:#f1f5f9;color:#1e40af;font-weight:600;border:1px solid #e2e8f0}
td{padding:4px 6px;border:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even){background:#fafafa}
.mono{font-family:monospace;font-size:0.65rem;background:#f1f5f9;padding:1px 3px;border-radius:2px}
.tag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:0.6rem;font-weight:600;color:white}
.tag.r{background:#ef4444}.tag.g{background:#22c55e}.tag.b{background:#3b82f6}.tag.y{background:#f59e0b}.tag.p{background:#8b5cf6}
`

function S(n: string, c: string, t: string, d: string): string {
  return `<div class="step"><div class="sn" style="background:${c}">${n}</div><div class="sb"><h4>${t}</h4><p>${d}</p></div></div><div class="arr">↓</div>`
}
function SL(n: string, c: string, t: string, d: string): string {
  return `<div class="step"><div class="sn" style="background:${c}">${n}</div><div class="sb"><h4>${t}</h4><p>${d}</p></div></div>`
}

function ownerQA(): string {
  const c = '#2563eb'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Owner (เจ้าของร้าน)</div><div class="sub">QRforPay POS — S-01, S-03, S-04, S-12</div><div class="date">March 2026 | QA Professional — ตรวจสอบจากโค้ดจริงทุก condition</div></div>

<!-- S-01 Registration -->
<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Owner สมัครร้านใหม่</h2>
<div class="desc">เจ้าของร้านอาหารเปิดใช้ QRforPay ครั้งแรก</div>
<div class="pre">Precondition: ยังไม่มี account ในระบบ</div>

${S('1',c,'เปิดหน้าเว็บ → กด "สมัครเลย"','ไปหน้า /register แสดง Step 1/2: ข้อมูลบัญชี')}
${sc('S01-1-landing.png','หน้าแรก QRforPay')}

${S('2',c,'กรอก Step 1: ข้อมูลบัญชี','กรอก ชื่อ-นามสกุล + อีเมล + รหัสผ่าน → กด "ถัดไป"')}
${sc2('S01-2-register-step1.png','Step 1 ว่าง','S01-3-register-step1-filled.png','Step 1 กรอกแล้ว')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation Rules — Step 1</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อ-นามสกุล</strong></td><td>Required, min 2, max 100 ตัวอักษร</td><td>
"กรุณากรอกชื่อ-นามสกุล" (ว่าง)<br>
"ชื่อสั้นเกินไป" (&lt;2)<br>
"ชื่อยาวเกินไป" (&gt;100)</td></tr>
<tr><td><strong>อีเมล</strong></td><td>Required, regex: <span class="mono">/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/</span></td><td>
"กรุณากรอกอีเมล" (ว่าง)<br>
"รูปแบบอีเมลไม่ถูกต้อง" (regex fail)</td></tr>
<tr><td><strong>รหัสผ่าน</strong></td><td>Min 8 ตัวอักษร + ต้องมีตัวเลขอย่างน้อย 1 ตัว<br>
✅ ตัวอักษรพิเศษ (!@#$%) ใช้ได้<br>
✅ ภาษาไทยใช้ได้<br>
❌ แค่ตัวอักษรล้วนไม่ผ่าน</td><td>
"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" (&lt;8)<br>
"รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" (ไม่มีเลข)</td></tr>
</table>

<div class="note w">HTML minLength=6 แต่ JS validate ที่ 8 → ถ้า browser ไม่ block HTML5 validation จะเจอ JS error แทน</div>
</div>

<div class="page">
${S('3',c,'กรอก Step 2: ข้อมูลร้านค้า','กรอก ชื่อร้าน + PromptPay ID → กด "สมัครสมาชิก"')}
${sc2('S01-4-register-step2.png','Step 2 ว่าง','S01-5-register-step2-filled.png','Step 2 กรอกแล้ว')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation Rules — Step 2</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อร้านค้า</strong></td><td>Required, 2-100 ตัวอักษร</td><td>
"กรุณากรอกชื่อร้าน" (ว่าง)<br>
"ชื่อร้านต้องมี 2-100 ตัวอักษร" (ผิด range)</td></tr>
<tr><td><strong>PromptPay ID</strong></td><td>Required, ลบ non-digit แล้วนับ<br>
✅ เบอร์โทร 10 หลัก (เช่น 0891234567)<br>
✅ เลขนิติบุคคล 13 หลัก<br>
❌ 9 หลัก, 11 หลัก, 14 หลัก ไม่ผ่าน<br>
✅ ใส่ขีด "-" ได้ ระบบลบให้อัตโนมัติ</td><td>
"กรุณากรอกหมายเลข PromptPay" (ว่าง)<br>
"PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก"</td></tr>
</table>

${S('4',c,'ระบบสร้าง account + ร้าน','supabase.auth.signUp() → self_register_shop RPC → สร้าง shop + profile ทันที')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Redirect Logic หลังสมัคร</h4>
<table>
<tr><th>กรณี</th><th>Redirect ไป</th></tr>
<tr><td>self_register_shop สำเร็จ</td><td><span class="mono">/pos/tables</span></td></tr>
<tr><td>self_register_shop ล้มเหลว → fallback submit_owner_info</td><td><span class="mono">/pending</span></td></tr>
</table>

${S('5',c,'Login เข้าระบบ','กรอก email + password → เข้าสู่ระบบ')}
${sc2('S01-6-login-page.png','หน้า Login','S01-8-after-login.png','หลัง Login → เข้าหน้าบิล')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Login Redirect Logic</h4>
<table>
<tr><th>กรณี</th><th>Redirect ไป</th></tr>
<tr><td>profile ไม่มี role (null)</td><td><span class="mono">/pending</span></td></tr>
<tr><td>profile มี role</td><td><span class="mono">/pos/sessions</span></td></tr>
<tr><td>Login ผิด</td><td>แสดง "อีเมลหรือรหัสผ่านไม่ถูกต้อง"</td></tr>
</table>

${SL('6',c,'ทดลองใช้ฟรี 7 วัน','ร้านใหม่ได้ทดลอง 7 วัน → หมดแล้วต้องจ่ายค่าแรกเข้า ฿999 หรือใช้รหัสตัวแทน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Paywall Conditions</h4>
<table>
<tr><th>สถานะ</th><th>ผลลัพธ์</th></tr>
<tr><td>ทดลอง เหลือ 4-7 วัน</td><td>ใช้งานปกติ ไม่แสดงอะไร</td></tr>
<tr><td>ทดลอง เหลือ 1-3 วัน</td><td><span class="tag y">Banner</span> "ทดลองใช้ฟรีเหลืออีก X วัน"</td></tr>
<tr><td>ทดลองหมด + ยังไม่จ่าย ฿999</td><td><span class="tag r">BLOCKED</span> หน้า paywall — ต้องจ่ายหรือใช้รหัสตัวแทน</td></tr>
<tr><td>จ่ายแล้ว + subscription เกิน 1-2 วัน</td><td><span class="tag y">Modal</span> เตือนจ่ายค่ารายเดือน (dismiss ได้วันละ 1 ครั้ง)</td></tr>
<tr><td>จ่ายแล้ว + subscription เกิน 3+ วัน</td><td><span class="tag r">BLOCKED</span> ต้องจ่าย ฿199/เดือน</td></tr>
</table>
</div>

<!-- S-03 Settings -->
<div class="page">
<h2><span class="num" style="background:#7c3aed">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</h2>
<div class="pre">Precondition: Owner login แล้ว, ร้านอนุมัติแล้ว</div>

${S('1','#7c3aed','ไปแท็บ "ตั้งค่า"','เห็น: โลโก้, ชื่อร้าน, PromptPay, จำนวนโต๊ะ, โหมดชำระเงิน')}
${sc('S03-1-settings-top.png','หน้าตั้งค่าร้าน')}

<table>
<tr><th>Field</th><th>Rule</th><th>Error Message</th></tr>
<tr><td><strong>ชื่อร้าน</strong></td><td>2-100 ตัวอักษร</td><td>"ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร" / "ชื่อร้านยาวเกินไป"</td></tr>
<tr><td><strong>PromptPay</strong></td><td>10 หรือ 13 หลัก (เหมือนตอนสมัคร)</td><td>เหมือน S-01 Step 2</td></tr>
<tr><td><strong>จำนวนโต๊ะ</strong></td><td>0-200, ตัวเลขเท่านั้น</td><td>"จำนวนโต๊ะต้องเป็นตัวเลข 0-200"</td></tr>
<tr><td><strong>โลโก้ร้าน</strong></td><td>ไฟล์รูป, สูงสุด 2MB, เฉพาะ Owner</td><td>"กรุณาเลือกไฟล์รูปภาพ" / "ขนาดไฟล์ต้องไม่เกิน 2MB"</td></tr>
<tr><td><strong>โหมดชำระเงิน</strong></td><td>"จ่ายที่เคาน์เตอร์" หรือ "จ่ายเองอัตโนมัติ"</td><td>ไม่มี error (เลือก 1 จาก 2)</td></tr>
</table>

${S('2','#7c3aed','ดูทีมงาน + เพิ่มพนักงาน','เห็นสมาชิกทั้งหมด + ฟอร์มเพิ่ม Cashier')}
${sc2('S03-4-settings-team.png','ทีมงาน + ฟอร์มเพิ่มพนักงาน','S03-5-settings-addcashier.png','ฟอร์มเพิ่ม Cashier')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — เพิ่ม Cashier</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message</th></tr>
<tr><td><strong>ชื่อ-นามสกุล</strong></td><td>Required, min 2 ตัว</td><td>"กรุณากรอกชื่อพนักงาน (อย่างน้อย 2 ตัว)"</td></tr>
<tr><td><strong>อีเมล</strong></td><td>Required, regex email, lowercase อัตโนมัติ</td><td>"รูปแบบอีเมลไม่ถูกต้อง"</td></tr>
<tr><td><strong>รหัสผ่าน</strong></td><td>Min 8 ตัว + ต้องมีตัวเลข 1 ตัว<br>(HTML placeholder บอก 6 แต่ JS เช็ค 8)</td><td>"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"<br>"รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"</td></tr>
</table>

<div class="note i">Owner เพิ่ม Cashier ได้ — Cashier เห็นหน้านี้แต่ไม่เห็นส่วนทีมงาน (Super Admin ไม่สามารถเพิ่ม Cashier ได้)</div>
</div>

<!-- S-04 Products -->
<div class="page">
<h2><span class="num" style="background:#ea580c">S-04</span> Owner จัดการสินค้า + เมนู</h2>
<div class="pre">Precondition: Owner login แล้ว (Cashier/Super Admin ทำไม่ได้)</div>

${S('1','#ea580c','ไปแท็บ "สินค้า"','เห็นรายการสินค้า + ปุ่ม "+" (Owner เท่านั้น)')}
${sc('S04-1-products-list.png','หน้าสินค้า')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — เพิ่ม/แก้ไขสินค้า</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message</th></tr>
<tr><td><strong>ชื่อสินค้า</strong></td><td>Required, max 100 ตัว<br>
❌ สระ/วรรณยุกต์ไทยซ้อนกัน 2 ตัวขึ้นไปไม่ได้<br>
❌ ใส่แค่อักขระพิเศษล้วนไม่ได้<br>
✅ ไทย+อังกฤษ+ตัวเลข+พิเศษ ผสมได้</td><td>
"กรุณากรอกชื่อสินค้า"<br>
"ชื่อสินค้ายาวเกินไป (สูงสุด 100 ตัวอักษร)"<br>
"ชื่อสินค้ามีสระหรือวรรณยุกต์ซ้อนกัน"<br>
"ชื่อสินค้าต้องมีตัวอักษรหรือตัวเลข"</td></tr>
<tr><td><strong>ราคา</strong></td><td>Required, ตัวเลข, ทศนิยม 2 หลัก<br>
ต้อง &gt; 0 และ ≤ 999,999<br>
regex: <span class="mono">/^\\d+(\\.\\d{1,2})?$/</span></td><td>
"กรุณากรอกราคา"<br>
"ราคาต้องเป็นตัวเลขเท่านั้น (เช่น 50 หรือ 49.99)"<br>
"ราคาต้องมากกว่า 0"<br>
"ราคาสูงเกินไป (สูงสุด 999,999 บาท)"</td></tr>
<tr><td><strong>Stock</strong></td><td>Required (default: 999)<br>
จำนวนเต็มบวก 0-99,999<br>
regex: <span class="mono">/^\\d+$/</span></td><td>
"กรุณากรอก Stock"<br>
"Stock ต้องเป็นจำนวนเต็มบวกเท่านั้น"<br>
"Stock ติดลบไม่ได้"<br>
"Stock สูงเกินไป (สูงสุด 99,999)"</td></tr>
<tr><td><strong>Barcode</strong></td><td>Optional, max 50 ตัว<br>
เฉพาะ a-z, A-Z, 0-9, -, _, .</td><td>
"Barcode ยาวเกินไป (สูงสุด 50 ตัวอักษร)"<br>
"Barcode ใช้ได้เฉพาะ a-z, 0-9, -, _, ."</td></tr>
<tr><td><strong>Image URL</strong></td><td>Optional, ต้องขึ้นด้วย https://<br>
max 500 ตัว</td><td>
"URL รูปภาพต้องขึ้นต้นด้วย https://"<br>
"URL รูปภาพยาวเกินไป"</td></tr>
<tr><td><strong>หมวดหมู่</strong></td><td>Optional (dropdown)</td><td>ไม่มี error</td></tr>
<tr><td><strong>Active</strong></td><td>Checkbox, default: checked</td><td>ไม่มี error</td></tr>
</table>

<div class="note w">ลบสินค้า = Soft delete (is_active=false) → สินค้าหายจากเมนูลูกค้า แต่ยังอยู่ใน DB</div>
</div>

<!-- S-12 Dashboard -->
<div class="page">
<h2><span class="num" style="background:#059669">S-12</span> Owner ดู Dashboard + รายงาน</h2>
<div class="pre">Precondition: Owner login, มีออเดอร์ในระบบ</div>

${S('1','#059669','ไปแท็บ "สรุป"','เห็น: ยอดขายรวม, จำนวนออเดอร์, เงินสด/โอน, ค่าเฉลี่ย')}
${sc('S12-1-dashboard-today.png','Dashboard วันนี้')}
${sc2('S12-2-dashboard-week.png','Dashboard 7 วัน','S12-3-dashboard-month.png','Dashboard เดือนนี้')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Date Range Logic</h4>
<table>
<tr><th>ปุ่ม</th><th>Start Date</th><th>End Date</th><th>Filter</th></tr>
<tr><td>"วันนี้"</td><td>วันนี้ 00:00:00</td><td>พรุ่งนี้ 00:00:00</td><td rowspan="3">status = 'completed'<br>completed_at อยู่ใน range</td></tr>
<tr><td>"7 วัน"</td><td>7 วันก่อน</td><td>พรุ่งนี้ 00:00:00</td></tr>
<tr><td>"เดือนนี้"</td><td>วันที่ 1 ของเดือน</td><td>พรุ่งนี้ 00:00:00</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Metrics</h4>
<table>
<tr><th>Metric</th><th>คำนวณจาก</th></tr>
<tr><td>ยอดขายรวม</td><td>sum(orders.total_amount) — เฉพาะ completed</td></tr>
<tr><td>จำนวนออเดอร์</td><td>count(orders) — เฉพาะ completed</td></tr>
<tr><td>เงินสด</td><td>sum(payments where method='cash')</td></tr>
<tr><td>เงินโอน</td><td>sum(payments where method≠'cash')</td></tr>
<tr><td>ค่าเฉลี่ย</td><td>ยอดขายรวม / จำนวนออเดอร์</td></tr>
<tr><td>Top 5 สินค้า</td><td>group by product, sort by qty desc, เฉพาะ item_status='active'</td></tr>
</table>

${SL('2','#059669','ดูประวัติบิล','หน้าบิล → กด "ประวัติ" → กรองตามสถานะ')}
${sc('S12-4-history.png','ประวัติบิลทั้งหมด')}
</div>
</body></html>`
}

function customerQA(): string {
  const c = '#0d9488'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Customer (ลูกค้า)</div><div class="sub">QRforPay POS — S-05, S-06, S-07</div><div class="date">March 2026 | QA Professional — ตรวจสอบจากโค้ดจริงทุก condition</div></div>

<!-- S-05 -->
<div class="page">
<h2><span class="num" style="background:${c}">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</h2>
<div class="pre">Precondition: ร้านมีสินค้า + QR Code ติดบนโต๊ะ | ไม่ต้อง login</div>

${S('1',c,'สแกน QR Code → เปิด /order?session={uuid}','ระบบตรวจ session UUID → โหลดเมนูร้าน')}
${sc('S05-1-order-no-session.png','ถ้าไม่มี session → "เปิดไม่ได้"')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Session Validation</h4>
<table>
<tr><th>กรณี</th><th>ผลลัพธ์</th><th>Error Message</th></tr>
<tr><td>ไม่มี ?session param</td><td><span class="tag r">ERROR</span></td><td>"ไม่พบ QR Session — กรุณาขอ QR ใหม่จากพนักงาน"</td></tr>
<tr><td>UUID ไม่มีใน DB</td><td><span class="tag r">ERROR</span></td><td>"QR code ไม่ถูกต้องหรือหมดอายุ — กรุณาขอ QR ใหม่"</td></tr>
<tr><td>session status = cancelled</td><td><span class="tag r">ERROR</span></td><td>"QR code นี้ถูกยกเลิก — กรุณาขอ QR ใหม่จากพนักงาน"</td></tr>
<tr><td>session status = paid</td><td><span class="tag g">SUCCESS</span></td><td>แสดงหน้า "ชำระเงินสำเร็จ"</td></tr>
<tr><td>session status = active</td><td><span class="tag g">OK</span></td><td>แสดงเมนูร้าน</td></tr>
</table>

${S('2',c,'เห็นเมนูร้าน','แสดงสินค้าแบ่งตามหมวดหมู่ สินค้าหมดสต็อกจะ disabled')}
${sc('S05-2-order-menu.png','หน้าเมนูร้าน — สินค้าจริง')}

${S('3',c,'กด "+" เพิ่มตะกร้า','เช็คสต็อก → เพิ่มจำนวน → ยอดรวมด้านล่าง')}
${sc2('S05-4-order-added-item.png','หลังกด "+" เพิ่มสินค้า','S05-5-order-cart-summary.png','สรุปยอด + ปุ่มดูตะกร้า')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Cart Logic</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>ผลลัพธ์</th></tr>
<tr><td>กด "+"</td><td>stock &gt; 0 และ qty &lt; stock</td><td>เพิ่ม qty +1</td></tr>
<tr><td>กด "+"</td><td>qty ≥ stock</td><td>ไม่เพิ่ม (หมดสต็อก)</td></tr>
<tr><td>กด "-" เมื่อ qty=1</td><td>-</td><td>ถาม confirm: 'ต้องการลบ "ชื่อ" ออกจากตะกร้า?'</td></tr>
<tr><td>สินค้าถูก deactivate</td><td>Realtime</td><td>ลบจากตะกร้าอัตโนมัติ</td></tr>
</table>
<div class="note i">ตะกร้าเก็บใน localStorage key: <span class="mono">qrforpay_cart_{session_id}</span> — sync ข้าม tab ผ่าน Realtime broadcast</div>

${S('4',c,'ดูตะกร้า → กดยืนยันออเดอร์','แสดง confirm: "X รายการ รวม ฿Y ออเดอร์จะส่งไปยังครัวทันที"')}
${sc('S05-6-order-cart-view.png','ตะกร้า → กดยืนยัน')}

${SL('5',c,'ออเดอร์สำเร็จ → POS ได้รับ realtime','สร้าง order (status=pending, order_source=customer) + order_items + payment (pending)')}

<h4 style="color:#1e40af;margin:8px 0 4px;">DB Operations เมื่อสั่ง</h4>
<table>
<tr><th>Table</th><th>Fields</th></tr>
<tr><td>orders</td><td>shop_id, cashier_id=<strong>NULL</strong>, subtotal, tax_amount, total_amount, payment_method='qr', status='pending', order_source='<strong>customer</strong>', customer_session_id, table_number</td></tr>
<tr><td>order_items</td><td>order_id, product_id, quantity, unit_price, subtotal (price×qty)</td></tr>
<tr><td>payments</td><td>order_id, method='qr', amount, status='pending'</td></tr>
</table>
<div class="note i">Tax: คำนวณจาก subtotal × (taxRate / (1 + taxRate)) — ดึงจาก shop.tax_rate (default 7%)</div>
</div>

<!-- S-06 -->
<div class="page">
<h2><span class="num" style="background:#d97706">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</h2>
<div class="pre">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ)</div>

${S('1','#d97706','กด "ชำระเงิน"','state → paying → สร้าง QR PromptPay')}
${S('2','#d97706','แสดง QR Code + countdown','EMV QR ตามมาตรฐาน BOT + CRC16-CCITT checksum')}
${SL('3','#d97706','ลูกค้าสแกนจ่ายผ่าน Banking App','ตรวจชื่อร้าน + จำนวนเงิน → ยืนยัน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">QR PromptPay Validation</h4>
<table>
<tr><th>Check</th><th>Rule</th><th>Error</th></tr>
<tr><td>PromptPay ID</td><td>Required, 10 หรือ 13 หลัก</td><td>"PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก"</td></tr>
<tr><td>Amount</td><td>&gt; 0, ≤ 999,999</td><td>"Amount must be greater than 0" / "Amount must not exceed 999,999"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Payment Mode (ตั้งค่าโดย Owner)</h4>
<table>
<tr><th>Mode</th><th>Flow ลูกค้า</th><th>ยืนยันโดย</th></tr>
<tr><td><span class="tag b">auto</span> จ่ายเองอัตโนมัติ</td><td>QR → สแกนจ่าย → Realtime detect → auto complete</td><td>ระบบอัตโนมัติ</td></tr>
<tr><td><span class="tag y">counter</span> จ่ายที่เคาน์เตอร์</td><td>แจ้งจ่ายที่พนักงาน → พนักงานกด "ยืนยันรับเงิน"</td><td>แคชเชียร์กดยืนยัน</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">QR Countdown</h4>
<table>
<tr><th>เวลา</th><th>สถานะ</th></tr>
<tr><td>0-540 วินาที</td><td>แสดง "หมดอายุใน MM:SS" (สีปกติ)</td></tr>
<tr><td>541-600 วินาที</td><td>แสดงสีแดง (เหลือ &lt; 60 วินาที)</td></tr>
<tr><td>600+ วินาที</td><td>"QR หมดอายุ" → ปุ่มสร้างใหม่หรือยกเลิก</td></tr>
</table>

${sc('S08-2-session-detail.png','ตัวอย่าง QR Code + รายการ (ฝั่ง POS)')}
</div>

<!-- S-07 -->
<div class="page">
<h2><span class="num" style="background:#db2777">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order)</h2>
<div class="pre">Precondition: สั่งไปแล้ว 1 ออเดอร์ (S-05) ยังอยู่หน้าเมนูเดิม</div>

${S('1','#db2777','หน้าเมนูเดิม (session ยังอยู่)','ตะกร้าว่าง + เห็น confirmedItems + สถานะครัว realtime')}
${S('2','#db2777','เลือกเมนูเพิ่ม → ยืนยัน','สร้าง order_id ใหม่ + order_number ใหม่ บนโต๊ะเดิม (same customer_session_id)')}
${SL('3','#db2777','POS เห็น realtime','highlight 8 วินาที + vibrate')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Order Status Labels</h4>
<table>
<tr><th>Status</th><th>Label ไทย</th><th>สี</th></tr>
<tr><td>pending</td><td>รอครัว</td><td><span class="tag y">yellow</span></td></tr>
<tr><td>preparing</td><td>กำลังทำ</td><td><span class="tag p">purple</span></td></tr>
<tr><td>ready</td><td>พร้อมเสิร์ฟ</td><td><span class="tag g">green</span></td></tr>
<tr><td>completed</td><td>เสร็จแล้ว</td><td>gray</td></tr>
<tr><td>cancelled</td><td>ยกเลิก</td><td><span class="tag r">red</span></td></tr>
</table>

<div class="note i">Bill Merging: เมนูเดียวกันจากหลาย order รวมเป็นบรรทัดเดียว (merge by product_id)</div>
</div>
</body></html>`
}

function cashierQA(): string {
  const c = '#0891b2'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Cashier (แคชเชียร์)</div><div class="sub">QRforPay POS — S-08, S-09, S-10, S-11</div><div class="date">March 2026 | QA Professional — ตรวจสอบจากโค้ดจริงทุก condition</div></div>

<!-- S-08 -->
<div class="page">
<h2><span class="num" style="background:${c}">S-08</span> แคชเชียร์รับออเดอร์ + จัดการ</h2>
<div class="pre">Precondition: มีออเดอร์จากลูกค้า (S-05)</div>

${S('1',c,'แจ้งเตือน Realtime','Vibration + Toast "ออเดอร์ #XX โต๊ะ Y" (6 วินาที auto-dismiss)')}
${sc('S08-1-sessions-list.png','หน้าบิลที่เปิดอยู่')}
${S('2',c,'กดดูรายละเอียดบิล','QR Code + รายการ + ยอด + ปุ่มลบรายการ')}
${sc('S08-2-session-detail.png','รายละเอียดบิล + QR + รายการ')}
${SL('3',c,'ยืนยัน Payment + ปิดบิล','')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Payment — 2 วิธี</h4>
<table>
<tr><th>วิธี</th><th>Flow</th><th>Validation</th></tr>
<tr><td><span class="tag b">โอนเงิน</span></td><td>กด "ยืนยันรับโอนเงิน" → confirm dialog "ยอด ฿X" → ยืนยัน</td><td>ไม่มี input validation<br>บันทึก: method='promptpay', confirmation_type='manual', confirmed_by=profile.id</td></tr>
<tr><td><span class="tag g">เงินสด</span></td><td>กรอก "เงินรับ" → คำนวณทอน → confirm "รับ ฿X · ทอน ฿Y"</td><td>เงินรับ ≥ ยอดรวม<br>Error: "เงินไม่พอ ยอดที่ต้องชำระ ฿X"<br>บันทึก: method='cash', cash_received, cash_change</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Discount (ส่วนลด)</h4>
<table>
<tr><th>Type</th><th>Rule</th><th>Error</th></tr>
<tr><td>percent (%)</td><td>0-100%</td><td>"ส่วนลดเกิน 100%"</td></tr>
<tr><td>fixed (฿)</td><td>0 ถึง subtotal</td><td>"ส่วนลดเกินยอดรวม"</td></tr>
<tr><td>ทั้งสอง</td><td>ต้อง &gt; 0</td><td>"กรุณาใส่ส่วนลด"</td></tr>
</table>
</div>

<!-- S-09 -->
<div class="page">
<h2><span class="num" style="background:#4f46e5">S-09</span> แคชเชียร์สร้างบิล + ให้ QR ลูกค้า</h2>
<div class="desc">ระบบ QRforPay เป็น Self-Service — ลูกค้าสั่งเอง แคชเชียร์สร้างบิล+ให้ QR</div>
<div class="pre">Precondition: Cashier/Owner login แล้ว</div>

${S('1','#4f46e5','สร้างบิลใหม่','หน้า "บิล" กด "+ บิลใหม่" หรือ หน้า "โต๊ะ" กดที่โต๊ะว่าง')}
${sc('S08-1-sessions-list.png','กด "+ บิลใหม่" มุมขวาบน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">สร้างบิลจากหน้าโต๊ะ</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>ผลลัพธ์</th></tr>
<tr><td>กดโต๊ะว่าง (available)</td><td>-</td><td>Confirm: "เปิดโต๊ะ X - สร้างบิลใหม่และ QR Code?"<br>→ สร้าง customer_session (status=active) → เปิด detail modal</td></tr>
<tr><td>กดโต๊ะไม่ว่าง (occupied)</td><td>-</td><td>เปิด detail modal ของ session ที่มีอยู่</td></tr>
</table>

${S('2','#4f46e5','ระบบแสดง QR Code','QR ชี้ไปที่ /order?session={uuid}')}
${sc('S11-2-table-detail.png','QR Code สำหรับลูกค้าสแกน')}

${S('3','#4f46e5','ให้ QR ลูกค้า','พิมพ์ QR (80mm receipt) หรือ ให้สแกนจากหน้าจอ')}
${SL('4','#4f46e5','ลูกค้าสแกน QR → สั่งเอง (S-05)','ลูกค้าเห็นเมนู → สั่ง → เข้าครัว → แคชเชียร์ได้รับ realtime (S-08)')}

<div class="note d">⚠️ แคชเชียร์ไม่สามารถสั่งอาหารแทนลูกค้าได้ — ไม่มีหน้า POS ordering ในระบบ</div>
<div class="note i">หน้า "สินค้า" ใช้สำหรับ Owner จัดการเมนูเท่านั้น ไม่ใช่หน้าสั่งอาหาร</div>
</div>

<!-- S-10 -->
<div class="page">
<h2><span class="num" style="background:#dc2626">S-10</span> ยกเลิกรายการ / ยกเลิกบิล</h2>
<div class="pre">Precondition: มีบิลเปิดอยู่ที่มีออเดอร์</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">กรณี A: ยกเลิกรายเมนู</h4>
<table>
<tr><th>Step</th><th>Action</th><th>DB Update</th></tr>
<tr><td>1</td><td>เปิด Session Detail → เห็นทุก item</td><td>-</td></tr>
<tr><td>2</td><td>กดปุ่ม "ลบ" ข้าง item → confirm: "ยกเลิกรายการนี้?"</td><td>order_items: item_status='cancelled', item_cancelled_by, item_cancelled_at</td></tr>
<tr><td>3</td><td>ระบบคำนวณยอดใหม่ (เฉพาะ active items)</td><td>orders: อัพเดท total_amount, subtotal</td></tr>
<tr><td>4</td><td>ถ้าทุก item ถูกลบ → auto ยกเลิกทั้ง order</td><td>orders: status='cancelled'</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">กรณี B: ยกเลิกทั้งบิล</h4>
<table>
<tr><th>Step</th><th>Action</th><th>DB Update</th></tr>
<tr><td>1</td><td>เปิด Table Detail หรือ Session Detail</td><td>-</td></tr>
<tr><td>2</td><td>กด "ยกเลิกบิล" → confirm: "ยกเลิกบิลนี้?"</td><td>orders: status='cancelled', cancelled_at, cancelled_by<br>payments: status='failed'<br>session: status='cancelled'</td></tr>
</table>

${sc('S08-2-session-detail.png','Session Detail — กด "ลบ" ข้างรายการ')}
</div>

<!-- S-11 -->
<div class="page">
<h2><span class="num" style="background:#475569">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</h2>
<div class="pre">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว</div>

${S('1','#475569','ไปแท็บ "โต๊ะ"','Grid โต๊ะ 1..N + สถานะ + ยอดเงิน + ปุ่ม ⇄')}
${sc('S11-1-tables-grid.png','Grid โต๊ะ — ปุ่ม ⇄ ย้ายโต๊ะ')}

${S('2','#475569','กดที่ตัวเลขโต๊ะ → รายละเอียด','QR Code + ออเดอร์ + ปุ่มยกเลิกบิล')}
${sc('S11-2-table-detail.png','รายละเอียดโต๊ะ + QR')}

${SL('3','#475569','ย้ายโต๊ะ — กดปุ่ม ⇄ จาก Grid ได้เลย','')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Move Table Logic</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>ผลลัพธ์</th></tr>
<tr><td>กด ⇄ ที่โต๊ะ</td><td>-</td><td>เข้า move mode: "ย้ายจากโต๊ะ X" banner ด้านบน</td></tr>
<tr><td>กดโต๊ะปลายทาง (ว่าง)</td><td>โต๊ะ available</td><td>ย้ายสำเร็จ → Toast "ย้ายจากโต๊ะ X ไปโต๊ะ Y สำเร็จ"</td></tr>
<tr><td>กดโต๊ะปลายทาง (ไม่ว่าง)</td><td>โต๊ะ occupied</td><td><span class="tag r">ERROR</span> "โต๊ะ Y ไม่ว่าง — ย้ายได้เฉพาะโต๊ะว่าง"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">DB Update เมื่อย้าย</h4>
<table>
<tr><th>Table</th><th>Update</th></tr>
<tr><td>customer_sessions</td><td>table_label = โต๊ะใหม่</td></tr>
<tr><td>orders (active only)</td><td>table_number = โต๊ะใหม่ (เฉพาะ status ≠ cancelled, completed)</td></tr>
</table>

<div class="note i">ถ้า table_count = 0 → แสดง "ยังไม่ได้ตั้งจำนวนโต๊ะ" + ลิงก์ไปตั้งค่า</div>
</div>
</body></html>`
}

function adminQA(): string {
  const c = '#16a34a'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Super Admin</div><div class="sub">QRforPay POS — S-02</div><div class="date">March 2026 | QA Professional — ตรวจสอบจากโค้ดจริงทุก condition</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Super Admin จัดการร้านค้า + PromptPay บริษัท</h2>
<div class="pre">Precondition: Super Admin login แล้ว</div>

${S('1',c,'Login ด้วย email super admin','หน้า Login เหมือนกันทุก role — ใส่ email + password แล้วกด "เข้าสู่ระบบ"')}
${S('2',c,'หลัง Login เห็นแท็บ "Admin" ใน nav bar','แท็บ "Admin" ขึ้นเฉพาะ super_admin เท่านั้น (Owner/Cashier ไม่เห็น) → กดเข้า Admin Panel')}
${sc('S02-3-admin-panel.png','หลัง Login → เห็นแท็บ "Admin" ใน nav bar (มุมขวา)')}

${S('3',c,'จัดการร้าน','ปุ่ม: "+30 วัน", "ยกเลิกสิทธิ์", "ลบ"')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Admin Actions</h4>
<table>
<tr><th>Action</th><th>ผลลัพธ์</th></tr>
<tr><td><span class="tag g">+30 วัน</span></td><td>subscription_paid_until += 30 วัน → Owner ใช้ต่อได้</td></tr>
<tr><td><span class="tag y">ยกเลิกสิทธิ์</span></td><td>Owner ถูกระงับ → ไม่สามารถใช้ POS</td></tr>
<tr><td><span class="tag r">ลบ</span></td><td>ลบร้านออกจากระบบ</td></tr>
</table>

<div class="note i">Owner สมัครแล้วใช้งานได้ทันที (automatic via self_register_shop) — ไม่มีขั้นตอนรออนุมัติ</div>

${SL('4',c,'ตั้งค่า PromptPay รับเงิน (บริษัท)','Super Admin เปลี่ยน PromptPay QR ของบริษัทได้')}
${sc('S02-3-admin-panel.png','Admin Panel — ตั้งค่า PromptPay บริษัท')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — เปลี่ยน PromptPay บริษัท</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>PromptPay ID</strong></td><td>Required, ลบ non-digit แล้วนับ<br>
✅ เบอร์โทร 10 หลัก (เช่น 0891234567)<br>
✅ เลขนิติบุคคล 13 หลัก<br>
❌ 9 หลัก, 11 หลัก, 14 หลัก ไม่ผ่าน<br>
✅ ใส่ขีด "-" ได้ ระบบลบให้อัตโนมัติ</td><td>
"กรุณากรอกหมายเลข PromptPay" (ว่าง)<br>
"PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก"</td></tr>
</table>
</div>

<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Super Admin — สิ่งที่ทำได้ / ทำไม่ได้</h2>

<h4 style="color:#1e40af;margin:8px 0 4px;">Super Admin ทำได้</h4>
<table>
<tr><th>Feature</th><th>รายละเอียด</th></tr>
<tr><td><span class="tag g">✓</span> จัดการร้านค้า</td><td>ต่ออายุ (+30 วัน) / ยกเลิกสิทธิ์ / ลบร้าน</td></tr>
<tr><td><span class="tag g">✓</span> เปลี่ยน PromptPay บริษัท</td><td>ตั้งค่า PromptPay QR ของบริษัท (10 หรือ 13 หลัก)</td></tr>
<tr><td><span class="tag g">✓</span> Bypass Paywall</td><td>ไม่ถูก block จาก paywall</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Super Admin ทำไม่ได้</h4>
<table>
<tr><th>Feature</th><th>เหตุผล</th></tr>
<tr><td><span class="tag r">✗</span> เพิ่ม Cashier</td><td>เป็นหน้าที่ของ Owner เท่านั้น (เจ้าของร้านเพิ่มลูกน้องเอง ดูที่ S-03)</td></tr>
<tr><td><span class="tag r">✗</span> จัดการสินค้า</td><td>เป็นหน้าที่ของ Owner เท่านั้น</td></tr>
<tr><td><span class="tag r">✗</span> ดูโต๊ะ/ออเดอร์/บิลของร้าน</td><td>Super Admin ไม่มี shop_id → ไม่เห็นข้อมูลร้าน</td></tr>
<tr><td><span class="tag r">✗</span> ดู Dashboard</td><td>ไม่มี shop_id → ไม่มีข้อมูลยอดขาย</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Role-Based Access Control</h4>
<table>
<tr><th>Feature</th><th>Customer</th><th>Cashier</th><th>Owner</th><th>Super Admin</th></tr>
<tr><td>สั่งอาหารผ่าน QR</td><td><span class="tag g">✓</span></td><td>-</td><td>-</td><td>-</td></tr>
<tr><td>ดูบิล/ออเดอร์</td><td>-</td><td><span class="tag g">✓</span></td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>จัดการโต๊ะ</td><td>-</td><td><span class="tag g">✓</span></td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>จัดการสินค้า</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>ตั้งค่าร้าน</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>เพิ่ม Cashier</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>Dashboard</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td><td>-</td></tr>
<tr><td>Admin Panel (จัดการร้าน)</td><td>-</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td></tr>
<tr><td>เปลี่ยน PromptPay บริษัท</td><td>-</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td></tr>
<tr><td>Bypass Paywall</td><td>-</td><td>-</td><td>-</td><td><span class="tag g">✓</span></td></tr>
</table>
</div>
</body></html>`
}

async function main() {
  const roles = [
    { name: 'owner', fn: ownerQA },
    { name: 'customer', fn: customerQA },
    { name: 'cashier', fn: cashierQA },
    { name: 'admin', fn: adminQA },
  ]
  const browser = await chromium.launch()
  for (const role of roles) {
    const html = role.fn()
    const htmlPath = path.join(REPORTS, `${role.name}.html`)
    fs.writeFileSync(htmlPath, html)
    const page = await browser.newPage()
    await page.goto(`file://${htmlPath}`)
    await page.waitForTimeout(1000)
    await page.pdf({
      path: path.join(REPORTS, `QA-UserFlow-${role.name}.pdf`),
      format: 'A4', printBackground: true,
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
    })
    await page.close()
    console.log(`✓ QA-UserFlow-${role.name}.pdf`)
  }
  await browser.close()
  console.log('\nDone!')
}
main()

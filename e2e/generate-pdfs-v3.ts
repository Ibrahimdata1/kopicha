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
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b;font-size:13px}
.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:2.2rem;margin-bottom:8px}
.cover .badge{display:inline-block;padding:8px 24px;border-radius:12px;color:white;font-size:1rem;font-weight:700;margin:14px 0}
.cover .sub{color:#64748b;font-size:0.95rem}
.cover .date{color:#94a3b8;font-size:0.8rem;margin-top:16px}

.page{padding:24px 28px;page-break-before:always}
.page:first-of-type{page-break-before:auto}
h2{font-size:1.3rem;color:#1e40af;margin-bottom:3px;display:flex;align-items:center;gap:8px}
.num{display:inline-block;padding:3px 10px;border-radius:6px;color:white;font-size:0.8rem;font-weight:700}
.desc{font-size:0.82rem;color:#64748b;margin-bottom:8px}
.pre{padding:7px 12px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 6px 6px 0;font-size:0.78rem;color:#1e40af;margin-bottom:14px}

.step{display:flex;gap:8px;margin-bottom:6px}
.sn{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:0.7rem;flex-shrink:0;margin-top:1px}
.sb h4{font-size:0.82rem;font-weight:700;margin-bottom:1px}
.sb p{font-size:0.75rem;color:#64748b;line-height:1.35}
.sb .t{font-size:0.68rem;color:#94a3b8;font-style:italic}
.arr{padding:0 0 0 8px;color:#cbd5e1;font-size:0.8rem;margin:-1px 0;line-height:1}

.sc{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:8px;page-break-inside:avoid;max-width:420px;margin-left:auto;margin-right:auto}
.sc img{width:100%;max-height:260px;object-fit:contain;object-position:top;display:block;background:#f8fafc;border-radius:6px 6px 0 0}
.sc-label{padding:4px 8px;background:#f1f5f9;font-size:0.65rem;color:#475569;text-align:center;border-top:1px solid #e2e8f0;font-weight:500}
.sc-row{display:flex;gap:8px;max-width:520px;margin-left:auto;margin-right:auto}
.sc-row .sc{flex:1;min-width:0;max-width:none}

.note{padding:6px 10px;border-radius:5px;font-size:0.72rem;line-height:1.35;margin:6px 0}
.note.i{background:#eff6ff;color:#1e40af;border-left:3px solid #3b82f6}
.note.w{background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b}

.br{display:flex;gap:8px;margin:6px 0}
.bx{flex:1;padding:8px;border-radius:6px;border:1px solid #e2e8f0;font-size:0.72rem;color:#64748b;line-height:1.35}
.bx h5{display:inline-block;padding:2px 7px;border-radius:4px;color:white;font-size:0.68rem;font-weight:700;margin-bottom:3px}
`

function S(n: string, c: string, t: string, d: string): string {
  return `<div class="step"><div class="sn" style="background:${c}">${n}</div><div class="sb"><h4>${t}</h4><p>${d}</p></div></div><div class="arr">↓</div>`
}
function SL(n: string, c: string, t: string, d: string): string {
  return `<div class="step"><div class="sn" style="background:${c}">${n}</div><div class="sb"><h4>${t}</h4><p>${d}</p></div></div>`
}
function ST(n: string, c: string, t: string, d: string, tech: string): string {
  return `<div class="step"><div class="sn" style="background:${c}">${n}</div><div class="sb"><h4>${t}</h4><p>${d}</p><div class="t">${tech}</div></div></div><div class="arr">↓</div>`
}

function ownerPDF(): string {
  const c = '#2563eb'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Owner (เจ้าของร้าน)</div><div class="sub">QRforPay POS — S-01, S-03, S-04, S-12</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Owner สมัครร้านใหม่</h2>
<div class="desc">เจ้าของร้านอาหารเปิดใช้ QRforPay ครั้งแรก</div>
<div class="pre">Precondition: ยังไม่มี account</div>
${ST('1',c,'เปิดหน้าเว็บ QRforPay','เห็น Landing พร้อม Hero, Features, Pricing','Route: /')}
${sc('S01-1-landing.png','Step 1: Landing Page — เว็บไซต์หน้าแรก')}
${S('2',c,'กดสมัคร → Register Step 1','กรอก ชื่อ + อีเมล + รหัสผ่าน (8+ ตัว มีตัวเลข)')}
${sc2('S01-2-register-step1.png','Step 2: ฟอร์มสมัคร (ว่าง)','S01-3-register-step1-filled.png','Step 2: กรอกข้อมูลแล้ว')}
${S('3',c,'Register Step 2 — ข้อมูลร้านค้า','กรอก ชื่อร้าน + PromptPay ID')}
${sc2('S01-4-register-step2.png','Step 3: ข้อมูลร้าน (ว่าง)','S01-5-register-step2-filled.png','Step 3: กรอกข้อมูลร้านแล้ว')}
${S('4',c,'กด "สมัครสมาชิก"','signUp() → self_register_shop RPC → สร้าง shop + profile ทันที')}
${S('5',c,'Login เข้าระบบ','กรอก email + password → เข้าสู่ระบบ')}
${sc2('S01-6-login-page.png','Step 5: หน้า Login','S01-8-after-login.png','Step 5: หลัง Login สำเร็จ')}
${SL('6',c,'เข้าระบบ POS','Redirect ไป /pos/sessions — เริ่มใช้งานได้เลย')}
</div>

<div class="page">
<h2><span class="num" style="background:#7c3aed">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</h2>
<div class="desc">ตั้งค่าร้านให้พร้อมใช้งาน</div>
<div class="pre">Precondition: Owner login, ร้านอนุมัติแล้ว</div>
${S('1','#7c3aed','ไปแท็บ "ตั้งค่า"','เห็น: ชื่อร้าน, PromptPay, จำนวนโต๊ะ')}
${sc('S03-1-settings-top.png','Step 1: หน้าตั้งค่า — ข้อมูลร้าน')}
${S('2','#7c3aed','ตั้งค่าระบบชำระเงิน','เลือก "จ่ายที่เคาน์เตอร์" หรือ "จ่ายเองอัตโนมัติ"')}
${sc('S03-2-settings-payment-mode.png','Step 2: โหมดชำระเงิน + บันทึก')}
${S('3','#7c3aed','ดูบัญชีของคุณ','เห็นชื่อ, role, email ของตัวเอง')}
${sc('S03-3-settings-account.png','Step 3: บัญชีของคุณ')}
${S('4','#7c3aed','ดูรายชื่อทีม','แสดงสมาชิกทั้งหมด — ลบได้')}
${sc('S03-4-settings-team.png','Step 4: รายชื่อทีม')}
${SL('5','#7c3aed','เพิ่ม Cashier','กรอก ชื่อ + Email + Password → สร้าง')}
${sc('S03-5-settings-addcashier.png','Step 5: ฟอร์มเพิ่ม Cashier')}
</div>

<div class="page">
<h2><span class="num" style="background:#ea580c">S-04</span> Owner จัดการสินค้า + เมนู</h2>
<div class="desc">เพิ่ม/แก้ไข/ลบสินค้าในร้าน</div>
<div class="pre">Precondition: Owner login, ร้านตั้งค่าแล้ว</div>
${S('1','#ea580c','ไปแท็บ "สินค้า"','แสดงรายการสินค้าทั้งหมด — ค้นหาได้')}
${sc('S04-1-products-list.png','Step 1: รายการสินค้า')}
${S('2','#ea580c','เพิ่มสินค้าใหม่','กด "+" → Modal: ชื่อ, ราคา, หมวดหมู่, สต็อก, รูป')}
${S('3','#ea580c','แก้ไขสินค้า','กดที่สินค้า → Modal (pre-filled) → แก้ → บันทึก')}
${SL('4','#ea580c','ลบสินค้า','กดลบ → ยืนยัน → Soft delete (is_active=false)')}
${sc('S04-2-products-scroll.png','Step 2-4: รายการสินค้า (scroll ลง)')}
</div>

<div class="page">
<h2><span class="num" style="background:#059669">S-12</span> Owner ดู Dashboard + รายงาน</h2>
<div class="desc">ดูสรุปยอดขายและประสิทธิภาพร้าน</div>
<div class="pre">Precondition: Owner login, มีออเดอร์ในระบบ</div>
${S('1','#059669','ไปแท็บ "สรุป" — วันนี้','ยอดขายรวม, จำนวนออเดอร์, เงินสด vs โอน, ค่าเฉลี่ย')}
${sc('S12-1-dashboard-today.png','Step 1: Dashboard วันนี้')}
${S('2','#059669','เลือกดู 7 วัน','เปลี่ยนช่วงเวลาเป็น 7 วัน')}
${sc('S12-2-dashboard-week.png','Step 2: Dashboard 7 วัน')}
${S('3','#059669','เลือกดูเดือนนี้','เปลี่ยนช่วงเวลาเป็นเดือนนี้')}
${sc('S12-3-dashboard-month.png','Step 3: Dashboard เดือนนี้')}
${SL('4','#059669','ดูประวัติออเดอร์','History — กรอง: วันนี้/7วัน/30วัน + สถานะ')}
${sc('S12-4-history.png','Step 4: ประวัติออเดอร์ทั้งหมด')}
</div>
</body></html>`
}

function customerPDF(): string {
  const c = '#0d9488'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Customer (ลูกค้า)</div><div class="sub">QRforPay POS — S-05, S-06, S-07</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</h2>
<div class="desc">ลูกค้านั่งโต๊ะ สแกน QR สั่งเอง ไม่ต้องเรียกพนักงาน</div>
<div class="pre">Precondition: ร้านมีสินค้า + QR Code ติดบนโต๊ะ</div>
${ST('1',c,'สแกน QR Code บนโต๊ะ','เปิดกล้อง → สแกน → browser เปิดอัตโนมัติ','URL: /order?session={uuid}')}
${sc('S05-1-order-no-session.png','Step 1: ถ้าไม่มี QR/session จะแสดง error')}
${S('2',c,'โหลดหน้าเมนูร้าน','แสดงเมนูร้านทั้งหมด แบ่งตามหมวดหมู่')}
${sc('S05-2-order-menu.png','Step 2: หน้าเมนูร้าน — สินค้าทั้งหมด')}
${S('3',c,'เลือกเมนู กด "+" เพิ่มตะกร้า','กดเพิ่มจำนวน → เห็นยอดรวมที่ด้านล่าง')}
${sc2('S05-3-order-menu-scroll.png','Step 3: เมนู (scroll ลง)','S05-4-order-added-item.png','Step 3: หลังกด "+" เพิ่มสินค้า')}
${S('4',c,'ตรวจสอบตะกร้า','เห็นรายการ + ราคารวม — แก้จำนวน/ลบได้')}
${sc('S05-5-order-cart-summary.png','Step 4: สรุปยอด + ปุ่มสั่ง')}
${S('5',c,'ดูตะกร้า → ยืนยันออเดอร์','กดดูรายละเอียด → ยืนยัน → ส่งเข้าครัว')}
${sc('S05-6-order-cart-view.png','Step 5: ตะกร้า — รายการที่จะสั่ง')}
${SL('6',c,'ออเดอร์สำเร็จ → POS ได้รับ realtime','หน้า success → ตะกร้าล้าง → POS แจ้งเตือนทันที')}
<div class="note i">ต้องมี session UUID จริง (จาก QR บนโต๊ะ) ถึงจะเห็นเมนู — ป้องกันคนเข้าโดยไม่สแกน QR</div>
</div>

<div class="page">
<h2><span class="num" style="background:#d97706">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</h2>
<div class="desc">หลังสั่งอาหาร จ่ายผ่าน QR PromptPay</div>
<div class="pre">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ)</div>
${S('1','#d97706','กด "ชำระเงิน"','กดปุ่มจ่ายเงินในหน้า customer')}
${S('2','#d97706','ระบบสร้าง PromptPay QR','EMV QR ตามมาตรฐาน BOT + CRC16 checksum')}
${S('3','#d97706','แสดง QR + countdown 5 นาที','หน้าจอแสดง QR + ยอดเงิน + สถานะ "รอการชำระ"')}
${SL('4','#d97706','ลูกค้าเปิด Banking App สแกนจ่าย','ตรวจชื่อร้าน + จำนวนเงิน → ยืนยัน')}
<div class="br">
<div class="bx"><h5 style="background:#2563eb">Auto Confirm</h5><p>Realtime ตรวจจับ payment success → auto complete → แสดง ✓ สำเร็จ</p></div>
<div class="bx"><h5 style="background:#ea580c">Manual Confirm</h5><p>แคชเชียร์กด "ยืนยันรับเงิน" → แสดงสำเร็จ + ชื่อคนยืนยัน</p></div>
</div>
<div class="note w">Timeout: 5 นาทีไม่จ่าย → QR หมดอายุ → "สร้าง QR ใหม่" หรือ "ยกเลิก"</div>
${sc('S08-2-session-detail.png','ตัวอย่าง: QR Code สำหรับจ่ายเงิน (จากหน้า Session Detail)')}
</div>

<div class="page">
<h2><span class="num" style="background:#db2777">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order)</h2>
<div class="desc">สั่งรอบ 2, 3 บนโต๊ะเดิม — หลาย order ต่อโต๊ะ</div>
<div class="pre">Precondition: สั่งไปแล้ว 1 ออเดอร์ (S-05 เสร็จ)</div>
${S('1','#db2777','อยู่หน้าเมนูเดิม (session ยังอยู่)','ตะกร้าว่าง แต่เห็น confirmedItems + สถานะครัว realtime')}
${sc('S05-2-order-menu.png','Step 1: กลับมาหน้าเมนู — session เดิม')}
${S('2','#db2777','เลือกเมนูเพิ่ม','กดเพิ่มรายการใหม่ — คนละชุดกับออเดอร์เก่า')}
${sc('S05-4-order-added-item.png','Step 2: เลือกเมนูใหม่ เพิ่มลงตะกร้า')}
${S('3','#db2777','ยืนยัน → ออเดอร์ใหม่','สร้าง order_id + order_number ใหม่ บนโต๊ะเดิม')}
${SL('4','#db2777','POS เห็น realtime','หน้าออเดอร์ POS มีรายการใหม่ (highlight 8 วินาที + vibrate)')}
${sc('S08-1-sessions-list.png','Step 4: POS เห็นบิลทุกโต๊ะ realtime')}
<div class="note i">Bill Merging: เมนูเดียวกันจากหลาย order รวมเป็นบรรทัดเดียว (merge by product_id)</div>
</div>
</body></html>`
}

function cashierPDF(): string {
  const c = '#0891b2'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Cashier (แคชเชียร์)</div><div class="sub">QRforPay POS — S-08, S-09, S-10, S-11</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-08</span> แคชเชียร์รับออเดอร์ + จัดการครัว</h2>
<div class="desc">ออเดอร์เข้ามา → อัพเดทสถานะจนเสร็จ</div>
<div class="pre">Precondition: มีออเดอร์ pending (จาก S-05/S-09)</div>
${S('1',c,'แจ้งเตือนออเดอร์ใหม่','Realtime → Vibration + Toast "ออเดอร์ #XX โต๊ะ Y"')}
${sc('S08-1-sessions-list.png','Step 1: หน้าบิล — เห็นออเดอร์ทุกโต๊ะ')}
${S('2',c,'กดดูรายละเอียด','เห็น QR Code + รายการสินค้า + ยอดเงิน')}
${sc('S08-2-session-detail.png','Step 2: รายละเอียดบิล — QR + รายการ + ยอดเงิน')}
${S('3',c,'ดูหน้าออเดอร์ทั้งหมด','แท็บ "บิล" ทั้งหมด — กรองตามสถานะ')}
${sc('S08-4-orders-page.png','Step 3: ออเดอร์ทั้งหมด (แยกสถานะ)')}
${S('4',c,'กดดูรายละเอียดออเดอร์','เห็นรายการ, สถานะ, ปุ่ม "กำลังทำ" / "พร้อมเสิร์ฟ"')}
${sc('S08-5-order-detail.png','Step 4: รายละเอียดออเดอร์ — QR + รายการ')}
${SL('5',c,'ยืนยัน Payment + Complete','QR: "ยืนยันรับเงิน" / เงินสด: กรอกเงินรับ → คำนวณทอน')}
${sc2('S01-6-login-page.png','Cashier Login','S01-8-after-login.png','หลัง Login สำเร็จ')}
</div>

<div class="page">
<h2><span class="num" style="background:#4f46e5">S-09</span> แคชเชียร์สั่งแทนลูกค้า (POS Order)</h2>
<div class="desc">ลูกค้าบอกปากเปล่า → แคชเชียร์กดสั่งผ่าน POS</div>
<div class="pre">Precondition: Cashier/Owner login แล้ว</div>
${S('1','#4f46e5','ไปแท็บ "สินค้า"','เห็นรายการ → กดเพิ่มสินค้าที่ลูกค้าต้องการ')}
${sc('S04-1-products-list.png','Step 1: เลือกสินค้าจากรายการ')}
${S('2','#4f46e5','ตรวจตะกร้า','ดูรายการ + ราคา + ส่วนลด + เลขโต๊ะ')}
${SL('3','#4f46e5','เลือกวิธีจ่าย','A: QR PromptPay | B: เงินสด | C: บันทึกไว้ก่อน')}
<div class="br">
<div class="bx"><h5 style="background:#0891b2">A: QR PromptPay</h5><p>แสดง QR ให้ลูกค้าสแกน → รอ confirm</p></div>
<div class="bx"><h5 style="background:#059669">B: เงินสด</h5><p>กรอกเงินรับ → คำนวณทอน → ยืนยัน</p></div>
</div>
<div class="note i">C: Save as Pending — ครัวเริ่มทำได้เลย จ่ายทีหลัง</div>
</div>

<div class="page">
<h2><span class="num" style="background:#dc2626">S-10</span> ยกเลิกรายการ / ยกเลิกออเดอร์</h2>
<div class="desc">2 ระดับ: ยกเลิกรายเมนู หรือยกเลิกทั้งออเดอร์</div>
<div class="pre">Precondition: มีออเดอร์ในระบบ</div>
<div class="br">
<div class="bx"><h5 style="background:#f59e0b">A: ยกเลิกรายเมนู</h5><p>1. เปิด Detail Modal → เห็นทุก item<br>2. กดยกเลิกข้าง item → confirm<br>3. คำนวณยอดใหม่ (active items)<br>4. ถ้าหมด → auto ยกเลิกทั้ง order</p></div>
<div class="bx"><h5 style="background:#dc2626">B: ยกเลิกทั้งออเดอร์</h5><p>1. Detail Modal → "ยกเลิกออเดอร์"<br>2. confirm → cancelOrder()<br>3. ย้ายไป History สถานะ cancelled</p></div>
</div>
${sc('S08-5-order-detail.png','ตัวอย่าง: รายละเอียดออเดอร์ — กดยกเลิกรายการ/ออเดอร์ได้')}
</div>

<div class="page">
<h2><span class="num" style="background:#475569">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</h2>
<div class="desc">ดูสถานะโต๊ะทั้งร้าน แชร์ QR ย้ายออเดอร์</div>
<div class="pre">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว</div>
${S('1','#475569','ไปแท็บ "โต๊ะ"','Grid โต๊ะ 1..N — 🟢 ว่าง 🟠 ไม่ว่าง')}
${sc('S11-1-tables-grid.png','Step 1: Grid โต๊ะ — สถานะ ว่าง/ไม่ว่าง')}
${S('2','#475569','กดเลือกโต๊ะ → รายละเอียด','QR Code + ออเดอร์ + ปุ่ม action')}
${sc('S11-2-table-detail.png','Step 2: รายละเอียดโต๊ะ — QR + สถานะ + ปุ่มยกเลิกบิล')}
${S('3','#475569','แชร์ QR / Copy URL','Share API + clipboard')}
${SL('4','#475569','ย้ายโต๊ะ','กด ⇄ → เลือกโต๊ะปลายทาง → ยืนยัน → อัพเดท table_number')}
</div>
</body></html>`
}

function adminPDF(): string {
  const c = '#16a34a'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Super Admin</div><div class="sub">QRforPay POS — S-02</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Super Admin อนุมัติร้าน</h2>
<div class="desc">ตรวจสอบและอนุมัติร้านใหม่ที่สมัครเข้ามา</div>
<div class="pre">Precondition: มี pending owner อย่างน้อย 1 คน (จาก S-01)</div>
${S('1',c,'Super Admin Login','Login ด้วย email super admin')}
${sc('S02-1-admin-login.png','Step 1: หน้า Login')}
${S('2',c,'หลัง Login สำเร็จ','Redirect ไป /pos/sessions หรือ /pos/admin')}
${sc('S02-2-admin-after-login.png','Step 2: หลัง Login เข้าระบบ')}
${S('3',c,'เปิด Admin Panel','เห็นร้านทั้งหมด + pending + ปุ่ม +30 วัน / ยกเลิกสิทธิ์')}
${sc('S02-3-admin-panel.png','Step 3: Admin Panel — จัดการร้านทั้งหมด')}
${S('4',c,'กดอนุมัติ / +30 วัน','ต่อ subscription หรืออนุมัติร้านใหม่')}
${SL('5',c,'Owner เข้าระบบได้ทันที','Owner login → role=owner → ใช้ POS ได้')}
${sc('S02-4-admin-settings.png','Step 5: Admin Settings')}
<div class="note i">Owner ต้องรอ Super Admin อนุมัติก่อนถึงจะเข้า POS ได้ — ป้องกันร้านปลอม</div>
</div>
</body></html>`
}

async function main() {
  const roles = [
    { name: 'owner', fn: ownerPDF },
    { name: 'customer', fn: customerPDF },
    { name: 'cashier', fn: cashierPDF },
    { name: 'admin', fn: adminPDF },
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
      path: path.join(REPORTS, `E2E-UserFlow-${role.name}.pdf`),
      format: 'A4', printBackground: true,
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
    })
    await page.close()
    console.log(`✓ E2E-UserFlow-${role.name}.pdf`)
  }
  await browser.close()
  console.log('\nDone!')
}
main()

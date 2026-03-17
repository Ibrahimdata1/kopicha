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

function ssCard(file: string, label: string): string {
  const src = img(file)
  if (!src) return `<div class="ss-card"><div class="label" style="padding:40px 10px;color:#94a3b8;">[${file} not found]</div></div>`
  return `<div class="ss-card"><img src="${src}"><div class="label">${label}</div></div>`
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b}
.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:2.4rem;margin-bottom:8px}
.cover .badge{display:inline-block;padding:8px 28px;border-radius:12px;color:white;font-size:1.1rem;font-weight:700;margin:16px 0}
.cover .sub{color:#64748b;font-size:1rem;margin-bottom:8px}
.cover .date{color:#94a3b8;font-size:0.85rem;margin-top:20px}

.scenario{page-break-before:always;padding:28px 32px}
.s-title{font-size:1.4rem;color:#1e40af;margin-bottom:4px;display:flex;align-items:center;gap:10px}
.s-num{display:inline-block;padding:4px 12px;border-radius:8px;color:white;font-size:0.85rem;font-weight:700}
.s-desc{font-size:0.88rem;color:#64748b;margin-bottom:10px}
.precond{padding:8px 14px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;font-size:0.82rem;color:#1e40af;margin-bottom:16px}

.step{display:flex;gap:10px;margin-bottom:10px}
.step-n{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:0.78rem;flex-shrink:0;margin-top:2px}
.step-body h4{font-size:0.88rem;font-weight:700;margin-bottom:2px}
.step-body p{font-size:0.78rem;color:#64748b;line-height:1.4}
.step-body .tech{font-size:0.72rem;color:#94a3b8;font-style:italic}
.arrow-down{padding:0 0 0 10px;color:#cbd5e1;font-size:0.9rem;margin:-2px 0}

.ss-section{margin-top:16px;page-break-inside:avoid}
.ss-section h4{font-size:0.78rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;border-top:1px solid #e2e8f0;padding-top:10px}
.ss-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.ss-card{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;flex:1;min-width:180px;max-width:48%}
.ss-card.full{max-width:100%}
.ss-card img{width:100%;display:block}
.ss-card .label{padding:5px 8px;background:#f8fafc;font-size:0.68rem;color:#475569;text-align:center;border-top:1px solid #f1f5f9}

.note{padding:8px 12px;border-radius:6px;font-size:0.78rem;line-height:1.4;margin-top:8px}
.note.info{background:#eff6ff;color:#1e40af;border-left:3px solid #3b82f6}
.note.warn{background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b}

.branch-grid{display:flex;gap:10px;margin-top:8px}
.branch-box{flex:1;padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-size:0.78rem;color:#64748b;line-height:1.4}
.branch-box h5{display:inline-block;padding:2px 8px;border-radius:5px;color:white;font-size:0.75rem;font-weight:700;margin-bottom:4px}
`

function step(num: string, color: string, title: string, desc: string, tech?: string): string {
  return `<div class="step"><div class="step-n" style="background:${color}">${num}</div><div class="step-body"><h4>${title}</h4><p>${desc}</p>${tech ? `<div class="tech">${tech}</div>` : ''}</div></div><div class="arrow-down">↓</div>`
}
function stepLast(num: string, color: string, title: string, desc: string, tech?: string): string {
  return `<div class="step"><div class="step-n" style="background:${color}">${num}</div><div class="step-body"><h4>${title}</h4><p>${desc}</p>${tech ? `<div class="tech">${tech}</div>` : ''}</div></div>`
}

// ═══════ OWNER PDF ═══════
function ownerPDF(): string {
  const c = '#2563eb'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Owner (เจ้าของร้าน)</div><div class="sub">QRforPay POS — S-01, S-03, S-04, S-12</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:${c}">S-01</span> Owner สมัครร้านใหม่</div>
<div class="s-desc">เจ้าของร้านอาหารเปิดใช้ QRforPay ครั้งแรก</div>
<div class="precond">Precondition: ยังไม่มี account</div>
${step('1', c, 'เปิดหน้าเว็บ QRforPay', 'เห็น Landing พร้อม Hero, Features, Pricing', 'Route: /')}
${step('2', c, 'กดสมัคร → Register Step 1', 'กรอก ชื่อ + อีเมล + รหัสผ่าน (8+ ตัว มีตัวเลข) กด "ถัดไป"')}
${step('3', c, 'Register Step 2 — ข้อมูลร้านค้า', 'กรอก ชื่อร้าน + PromptPay ID (เบอร์ 10 หลัก / เลขภาษี 13 หลัก)')}
${step('4', c, 'กด "สมัครสมาชิก"', 'signUp() → self_register_shop RPC → สร้าง shop + profile ทันที', 'DB: INSERT shops + UPDATE profiles')}
${stepLast('5', c, 'Redirect → เข้า POS ทันที', 'ไป /pos/tables หรือ /pending (ถ้า fallback)')}
<div class="ss-section"><h4>Screenshots — S-01</h4>
<div class="ss-row">${ssCard('S01-01-landing-hero.png', '1. Landing Page')}${ssCard('S01-01-landing-pricing.png', '2. Pricing')}</div>
<div class="ss-row">${ssCard('S01-02-register-step1-empty.png', '3. Register Step 1')}${ssCard('S01-02-register-step1-filled.png', '4. Step 1 กรอกแล้ว')}</div>
<div class="ss-row">${ssCard('S01-03-register-step2-empty.png', '5. Register Step 2')}${ssCard('S01-03-register-step2-filled.png', '6. Step 2 กรอกแล้ว')}</div>
<div class="ss-row">${ssCard('S01-04-register-validation.png', '7. Validation Error')}${ssCard('S01-06-pending-page.png', '8. Pending Page')}</div>
</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#7c3aed">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</div>
<div class="s-desc">ตั้งค่าร้านให้พร้อมใช้งาน</div>
<div class="precond">Precondition: Owner login, ร้านอนุมัติแล้ว</div>
${step('1', '#7c3aed', 'ไปแท็บ "ตั้งค่า"', 'เห็น: ชื่อร้าน, PromptPay, จำนวนโต๊ะ, โหมดชำระเงิน', 'Route: /pos/settings')}
${step('2', '#7c3aed', 'แก้ไขข้อมูลร้าน + กด "บันทึก"', 'แก้ชื่อ / PromptPay / จำนวนโต๊ะ / payment mode', 'DB: UPDATE shops')}
${step('3', '#7c3aed', 'เพิ่ม Cashier (พนักงาน)', 'กรอก ชื่อ + Email + Password → กด "สร้าง Cashier"')}
${stepLast('4', '#7c3aed', 'ดูรายชื่อทีม', 'แสดงสมาชิกทั้งหมด — Owner ลบสมาชิกได้')}
<div class="ss-section"><h4>Screenshots — S-03</h4>
<div class="ss-row">${ssCard('S03-01-settings-shopinfo.png', '1. ตั้งค่าร้าน')}</div>
<div class="ss-row">${ssCard('S03-02-settings-team.png', '2. ทีม + บัญชี')}${ssCard('S03-03-settings-addcashier.png', '3. เพิ่ม Cashier')}</div>
</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#ea580c">S-04</span> Owner จัดการสินค้า + เมนู</div>
<div class="s-desc">เพิ่ม/แก้ไข/ลบสินค้าในร้าน</div>
<div class="precond">Precondition: Owner login, ร้านตั้งค่าแล้ว</div>
${step('1', '#ea580c', 'ไปแท็บ "สินค้า"', 'แสดงรายการสินค้าทั้งหมด — ค้นหาได้ — สีบอกสต็อก', 'Route: /pos/products')}
${step('2', '#ea580c', 'เพิ่มสินค้าใหม่', 'กดปุ่ม "+" → Modal: ชื่อ, ราคา, หมวดหมู่, สต็อก, รูป → บันทึก')}
${step('3', '#ea580c', 'แก้ไขสินค้า', 'กดที่สินค้า → Modal (pre-filled) → แก้ → บันทึก')}
${stepLast('4', '#ea580c', 'ลบสินค้า', 'กดลบ → ยืนยัน → Soft delete (is_active=false)')}
<div class="ss-section"><h4>Screenshots — S-04</h4>
<div class="ss-row">${ssCard('S04-01-products-list.png', '1. Products Page')}</div>
</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#059669">S-12</span> Owner ดู Dashboard + รายงาน</div>
<div class="s-desc">ดูสรุปยอดขายและประสิทธิภาพร้าน</div>
<div class="precond">Precondition: Owner login, มีออเดอร์ในระบบ</div>
${step('1', '#059669', 'ไปแท็บ "สรุป"', 'ยอดขายรวม, จำนวนออเดอร์, เงินสด vs โอน, ค่าเฉลี่ย', 'Route: /pos/dashboard')}
${step('2', '#059669', 'ดูสินค้าขายดี Top 5', 'อันดับสินค้าที่ขายมากที่สุด')}
${step('3', '#059669', 'เลือกช่วงเวลา', 'วันนี้ / 7 วัน / เดือนนี้')}
${stepLast('4', '#059669', 'ดูประวัติออเดอร์', 'History tab → กรอง: วันนี้/7วัน/30วัน + สถานะ')}
<div class="ss-section"><h4>Screenshots — S-12</h4>
<div class="ss-row">${ssCard('S12-01-dashboard-today.png', '1. Dashboard วันนี้')}${ssCard('S12-02-dashboard-week.png', '2. Dashboard 7 วัน')}</div>
<div class="ss-row">${ssCard('S12-03-dashboard-month.png', '3. Dashboard เดือนนี้')}${ssCard('S12-04-sessions-history.png', '4. ประวัติออเดอร์')}</div>
</div></div>
</body></html>`
}

// ═══════ CUSTOMER PDF ═══════
function customerPDF(): string {
  const c = '#0d9488'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Customer (ลูกค้า)</div><div class="sub">QRforPay POS — S-05, S-06, S-07</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:${c}">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</div>
<div class="s-desc">ลูกค้านั่งโต๊ะ สแกน QR สั่งเอง ไม่ต้องเรียกพนักงาน</div>
<div class="precond">Precondition: ร้านมีสินค้า + QR Code ติดบนโต๊ะ</div>
${step('1', c, 'สแกน QR Code บนโต๊ะ', 'เปิดกล้อง → สแกน → browser เปิดอัตโนมัติ', 'URL: /order?session={uuid}')}
${step('2', c, 'โหลดหน้าเมนูร้าน', 'สร้าง session → โหลด categories + products', 'RLS: anon SELECT')}
${step('3', c, 'เลือกเมนู + เพิ่มตะกร้า', 'เลือกหมวดหมู่ → กด "+" → ยอดรวมด้านล่าง')}
${step('4', c, 'ตรวจตะกร้า', 'เห็นรายการ + ราคา — แก้จำนวน/ลบได้')}
${step('5', c, 'กดยืนยันออเดอร์', 'สร้าง order(pending) + order_items + payment(pending)', 'DB: INSERT orders + order_items + payments')}
${stepLast('6', c, 'ออเดอร์สำเร็จ', 'หน้า success → ตะกร้าล้าง → POS ได้รับ realtime', 'Supabase Realtime → POS')}
<div class="ss-section"><h4>Screenshots — S-05</h4>
<div class="ss-row">${ssCard('S05-01-order-no-session.png', '1. เปิดไม่มี session (error)')}</div>
</div>
<div class="note info">ต้องมี session UUID จริง (จาก QR บนโต๊ะ) ถึงจะเห็นเมนู</div>
</div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#d97706">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</div>
<div class="s-desc">หลังสั่งอาหาร จ่ายผ่าน QR PromptPay</div>
<div class="precond">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ)</div>
${step('1', '#d97706', 'กด "ชำระเงิน"', 'กดปุ่มจ่ายเงินในหน้า customer')}
${step('2', '#d97706', 'ระบบสร้าง PromptPay QR', 'EMV QR ตามมาตรฐาน BOT + CRC16 checksum', 'lib/qr.ts')}
${step('3', '#d97706', 'แสดง QR + countdown 5 นาที', 'หน้าจอแสดง QR + ยอดเงิน + สถานะรอ')}
${stepLast('4', '#d97706', 'ลูกค้าเปิด Banking App สแกนจ่าย', 'ตรวจชื่อร้าน + จำนวนเงิน → ยืนยัน')}
<div class="branch-grid">
<div class="branch-box"><h5 style="background:#2563eb">Auto Confirm</h5><p>Realtime ตรวจจับ payment success → auto complete → แสดง ✓</p></div>
<div class="branch-box"><h5 style="background:#ea580c">Manual Confirm</h5><p>แคชเชียร์กด "ยืนยันรับเงิน" → แสดงสำเร็จ + ชื่อคนยืนยัน</p></div>
</div>
<div class="note warn">Timeout: 5 นาทีไม่จ่าย → QR หมดอายุ → "สร้างใหม่" หรือ "ยกเลิก"</div>
<div class="ss-section"><h4>Screenshots — S-06</h4>
<div class="ss-row">${ssCard('S01-07-paywall-setupfee.png', 'ตัวอย่าง QR PromptPay ในระบบ')}</div>
</div>
</div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#db2777">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order)</div>
<div class="s-desc">สั่งรอบ 2, 3 บนโต๊ะเดิม — หลาย order ต่อโต๊ะ</div>
<div class="precond">Precondition: สั่งไปแล้ว 1 ออเดอร์ (S-05 เสร็จ)</div>
${step('1', '#db2777', 'อยู่หน้าเมนูเดิม (session ยังอยู่)', 'ตะกร้าว่าง แต่เห็น confirmedItems + สถานะครัว realtime')}
${step('2', '#db2777', 'เลือกเมนูเพิ่ม', 'กดเพิ่มรายการใหม่ — คนละชุดกับออเดอร์เก่า')}
${step('3', '#db2777', 'ยืนยัน → ออเดอร์ใหม่', 'สร้าง order_id + order_number ใหม่ บนโต๊ะเดิม')}
${stepLast('4', '#db2777', 'POS เห็น realtime', 'หน้าออเดอร์ POS มีรายการใหม่ (highlight 8 วินาที + vibrate)')}
<div class="note info">Bill Merging: เมนูเดียวกันจากหลาย order รวมเป็นบรรทัดเดียว (merge by product_id)</div>
</div>
</body></html>`
}

// ═══════ CASHIER PDF ═══════
function cashierPDF(): string {
  const c = '#0891b2'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Cashier (แคชเชียร์)</div><div class="sub">QRforPay POS — S-08, S-09, S-10, S-11</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:${c}">S-08</span> แคชเชียร์รับออเดอร์ + จัดการครัว</div>
<div class="s-desc">ออเดอร์เข้ามา → อัพเดทสถานะจนเสร็จ</div>
<div class="precond">Precondition: มีออเดอร์ pending (จาก S-05/S-09)</div>
${step('1', c, 'แจ้งเตือนออเดอร์ใหม่', 'Realtime → Vibration + Toast "ออเดอร์ #XX โต๊ะ Y" (6 วินาที)')}
${step('2', c, 'ดูรายละเอียดออเดอร์', 'แท็บ "บิล" → เห็น cards: เลขออเดอร์, โต๊ะ, รายการ, ยอด, สถานะ', 'Route: /pos/sessions')}
${step('3', c, 'กด "กำลังทำ" → "พร้อมเสิร์ฟ"', 'pending → preparing → ready — ลูกค้าเห็น realtime')}
${stepLast('4', c, 'ยืนยัน Payment + Complete', 'QR: "ยืนยันรับเงิน" / เงินสด: กรอกเงินรับ → คำนวณทอน → completed')}
<div class="ss-section"><h4>Screenshots — S-08</h4>
<div class="ss-row">${ssCard('S08-01-sessions-page.png', '1. หน้าบิล (Sessions)')}${ssCard('S08-02-orders-active.png', '2. ออเดอร์ทั้งหมด')}</div>
<div class="ss-row">${ssCard('S01-05-login-page.png', '3. Cashier Login')}${ssCard('S01-05-login-filled.png', '4. Login กรอกข้อมูล')}</div>
</div>
</div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#4f46e5">S-09</span> แคชเชียร์สั่งแทนลูกค้า (POS Order)</div>
<div class="s-desc">ลูกค้าบอกปากเปล่า → แคชเชียร์กดสั่งผ่าน POS</div>
<div class="precond">Precondition: Cashier/Owner login แล้ว</div>
${step('1', '#4f46e5', 'ไปแท็บ "สินค้า"', 'เห็นรายการ → กดเพิ่มสินค้าที่ลูกค้าต้องการ')}
${step('2', '#4f46e5', 'ตรวจตะกร้า', 'ดูรายการ + ราคา + ส่วนลด + เลขโต๊ะ')}
${stepLast('3', '#4f46e5', 'เลือกวิธีจ่าย', 'A: QR PromptPay | B: เงินสด | C: บันทึกไว้ก่อน (Pending)')}
<div class="branch-grid">
<div class="branch-box"><h5 style="background:#0891b2">A: QR PromptPay</h5><p>แสดง QR ให้ลูกค้าสแกน → รอ confirm</p></div>
<div class="branch-box"><h5 style="background:#059669">B: เงินสด</h5><p>กรอกเงินรับ → คำนวณทอน → ยืนยัน</p></div>
</div>
<div class="note info">C: Save as Pending — ครัวเริ่มทำได้เลย จ่ายทีหลัง</div>
</div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#dc2626">S-10</span> ยกเลิกรายการ / ยกเลิกออเดอร์</div>
<div class="s-desc">2 ระดับ: ยกเลิกรายเมนู หรือยกเลิกทั้งออเดอร์</div>
<div class="precond">Precondition: มีออเดอร์ในระบบ</div>
<div class="branch-grid">
<div class="branch-box"><h5 style="background:#f59e0b">A: ยกเลิกรายเมนู</h5><p>1. Detail Modal → เห็นทุก item<br>2. กดยกเลิกข้าง item → confirm<br>3. คำนวณยอดใหม่<br>4. ถ้าหมดทุก item → auto ยกเลิกทั้งออเดอร์</p></div>
<div class="branch-box"><h5 style="background:#dc2626">B: ยกเลิกทั้งออเดอร์</h5><p>1. Detail Modal → "ยกเลิกออเดอร์"<br>2. confirm → cancelOrder()<br>3. ย้ายไป History tab สถานะ cancelled</p></div>
</div>
</div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:#475569">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</div>
<div class="s-desc">ดูสถานะโต๊ะทั้งร้าน แชร์ QR ย้ายออเดอร์</div>
<div class="precond">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว</div>
${step('1', '#475569', 'ไปแท็บ "โต๊ะ"', 'Grid โต๊ะ 1..N — 🟢 ว่าง 🟠 ไม่ว่าง', 'Route: /pos/tables')}
${step('2', '#475569', 'กดเลือกโต๊ะ → รายละเอียด', 'Detail: ออเดอร์ทั้งหมด + QR Code + ปุ่ม action')}
${step('3', '#475569', 'แชร์ QR / Copy URL', 'Share API + clipboard')}
${stepLast('4', '#475569', 'ย้ายโต๊ะ', '"ย้ายโต๊ะ" → เลือกปลายทาง → ยืนยัน → อัพเดท table_number')}
<div class="ss-section"><h4>Screenshots — S-11</h4>
<div class="ss-row">${ssCard('S11-01-tables-grid.png', '1. Grid โต๊ะ — สถานะ ว่าง/ไม่ว่าง')}</div>
</div>
</div>
</body></html>`
}

// ═══════ ADMIN PDF ═══════
function adminPDF(): string {
  const c = '#16a34a'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Super Admin</div><div class="sub">QRforPay POS — S-02</div><div class="date">March 2026 | Playwright E2E + Real Screenshots</div></div>

<div class="scenario">
<div class="s-title"><span class="s-num" style="background:${c}">S-02</span> Super Admin อนุมัติร้าน</div>
<div class="s-desc">ตรวจสอบและอนุมัติร้านใหม่ที่สมัครเข้ามา</div>
<div class="precond">Precondition: มี pending owner อย่างน้อย 1 คน (จาก S-01)</div>
${step('1', c, 'Super Admin Login', 'Login → role = super_admin → ไป /pos/admin')}
${step('2', c, 'เห็นรายชื่อ Pending + ร้านทั้งหมด', 'แสดง: email, ชื่อร้าน, PromptPay, สถานะ Active/Pending')}
${step('3', c, 'กดอนุมัติ / +30 วัน / ยกเลิกสิทธิ์', 'จัดการ subscription + approve pending owners')}
${step('4', c, 'ระบบสร้างร้าน', 'INSERT shops + UPDATE profiles (role=owner, shop_id=ใหม่)')}
${stepLast('5', c, 'Owner เข้าระบบได้ทันที', 'Owner login → profile.role=owner → Redirect ไป /pos/sessions')}
<div class="ss-section"><h4>Screenshots — S-02</h4>
<div class="ss-row">${ssCard('S02-01-admin-after-login.png', '1. Admin หลัง Login')}${ssCard('S02-02-admin-panel.png', '2. Admin Panel — ร้านทั้งหมด')}</div>
<div class="ss-row">${ssCard('S02-03-admin-extended.png', '3. หลังกด +30 วัน')}</div>
</div>
<div class="note info">Owner ต้องรอ Super Admin อนุมัติก่อนถึงจะเข้า POS ได้ — ป้องกันร้านปลอม</div>
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
      format: 'A4',
      printBackground: true,
      margin: { top: '12px', bottom: '12px', left: '12px', right: '12px' },
    })
    await page.close()
    console.log(`✓ E2E-UserFlow-${role.name}.pdf`)
  }
  await browser.close()
  console.log('\nDone!')
}

main()

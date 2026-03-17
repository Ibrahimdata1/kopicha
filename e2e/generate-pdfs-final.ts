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

// ═══════════════════════════════════════════════════════
// OWNER PDF — S-01, S-03, S-04, S-12
// ═══════════════════════════════════════════════════════
function ownerPDF(): string {
  const c = '#2563eb'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Owner (เจ้าของร้าน)</div><div class="sub">QRforPay POS — S-01, S-03, S-04, S-12</div><div class="date">March 2026 | ตรวจสอบจากโค้ดจริง + Playwright E2E</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Owner สมัครร้านใหม่</h2>
<div class="desc">เจ้าของร้านอาหารเปิดใช้ QRforPay ครั้งแรก</div>
<div class="pre">Precondition: ยังไม่มี account</div>
${S('1',c,'เปิดหน้าเว็บ QRforPay','เห็น Landing พร้อม Hero, Features, Pricing ปุ่ม "ทดลองฟรี 7 วัน"')}
${sc('S01-1-landing.png','Step 1: Landing Page')}
${S('2',c,'กด "สมัครเลย" → Register Step 1','กรอก ชื่อ-นามสกุล + อีเมล + รหัสผ่าน (8+ ตัว มีตัวเลข) กด "ถัดไป"')}
${sc2('S01-2-register-step1.png','Step 2: ฟอร์มสมัคร (ว่าง)','S01-3-register-step1-filled.png','Step 2: กรอกข้อมูลแล้ว')}
${S('3',c,'Register Step 2 — ข้อมูลร้านค้า','กรอก "ชื่อร้าน" + "PromptPay ID" (เบอร์โทร 10 หลัก หรือ เลขนิติบุคคล 13 หลัก)')}
${sc2('S01-4-register-step2.png','Step 3: ข้อมูลร้าน (ว่าง)','S01-5-register-step2-filled.png','Step 3: กรอกข้อมูลร้านแล้ว')}
${S('4',c,'กด "สมัครสมาชิก"','supabase.auth.signUp() → self_register_shop RPC → สร้าง shop + profile ทันที')}
${S('5',c,'Login เข้าระบบ','กรอก email + password → เข้าสู่ระบบ')}
${sc2('S01-6-login-page.png','Step 5: หน้า Login','S01-8-after-login.png','Step 5: หลัง Login → เข้าหน้าบิล')}
${S('6',c,'เข้าระบบ POS → หน้าโต๊ะ','Redirect ไป /pos/tables (self-register) หรือ /pos/sessions (login ครั้งถัดไป)')}
${SL('7',c,'ทดลองใช้ฟรี 7 วัน','ร้านใหม่ได้ทดลองฟรี 7 วัน → หลังหมดต้องชำระค่าแรกเข้า ฿999 หรือใช้รหัสตัวแทน')}
</div>

<div class="page">
<h2><span class="num" style="background:#7c3aed">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</h2>
<div class="desc">ตั้งค่าร้านให้พร้อมใช้งาน + เพิ่ม Cashier ให้ทีม</div>
<div class="pre">Precondition: Owner login แล้ว, ร้านอนุมัติแล้ว</div>
${S('1','#7c3aed','ไปแท็บ "ตั้งค่า"','เห็น: โลโก้ร้าน (กดเปลี่ยนรูปได้), ชื่อร้าน, หมายเลข PromptPay, จำนวนโต๊ะ')}
${sc('S03-1-settings-top.png','Step 1: ข้อมูลร้าน + โลโก้ + PromptPay + จำนวนโต๊ะ')}
${S('2','#7c3aed','อัพโหลดโลโก้ร้าน (ถ้าต้องการ)','กด "เปลี่ยนรูป" → เลือกไฟล์ (สูงสุด 2MB) → อัพโหลดไป Supabase Storage')}
${S('3','#7c3aed','เลือกระบบชำระเงิน → กดบันทึก','เลือก "จ่ายที่เคาน์เตอร์" (แคชเชียร์ยืนยัน) หรือ "จ่ายเองอัตโนมัติ" (ลูกค้าสแกน QR เอง)')}
${sc('S03-2-settings-payment-mode.png','Step 3: เลือกโหมดชำระเงิน + กดบันทึก')}
${S('4','#7c3aed','ดูบัญชีของคุณ + รายชื่อทีม','เห็นชื่อ, role ของตัวเอง + รายชื่อสมาชิกทั้งหมดในร้าน — ลบสมาชิกได้')}
${sc2('S03-3-settings-account.png','Step 4: บัญชีของคุณ','S03-4-settings-team.png','Step 4: รายชื่อทีมในร้าน')}
${SL('5','#7c3aed','เพิ่ม Cashier (พนักงาน)','กรอก ชื่อ + Email + Password → กด "เพิ่มพนักงาน" → Cashier ใช้ login เข้าระบบได้เลย')}
${sc('S03-5-settings-addcashier.png','Step 5: ฟอร์มเพิ่มพนักงาน (Owner เพิ่มลูกน้องได้เอง)')}
</div>

<div class="page">
<h2><span class="num" style="background:#ea580c">S-04</span> Owner จัดการสินค้า + เมนู</h2>
<div class="desc">เพิ่ม/แก้ไข/ลบสินค้าในร้าน (เฉพาะ Owner และ Super Admin เท่านั้น, Cashier ทำไม่ได้)</div>
<div class="pre">Precondition: Owner login แล้ว</div>
${S('1','#ea580c','ไปแท็บ "สินค้า"','เห็นรายการสินค้าทั้งหมด — ค้นหาได้ — สีบอกสต็อก (แดง=หมด, ส้ม=ใกล้หมด)')}
${sc('S04-1-products-list.png','Step 1: รายการสินค้า (Owner/Super Admin เห็นปุ่ม "+")')}
${S('2','#ea580c','เพิ่มสินค้าใหม่','กดปุ่ม "+" → Modal: ชื่อ, ราคา, หมวดหมู่, จำนวนสต็อก, barcode, รูปภาพ → บันทึก')}
${S('3','#ea580c','แก้ไขสินค้า','กดที่สินค้า → Modal เดิม (pre-filled) → แก้ข้อมูล → บันทึก')}
${SL('4','#ea580c','ลบสินค้า','กดลบ → ยืนยัน → Soft delete (is_active=false) → สินค้าหายจากเมนูลูกค้า')}
${sc('S04-2-products-scroll.png','Step 2-4: จัดการสินค้า (Owner / Super Admin เท่านั้น)')}
<div class="note w">หน้า "สินค้า" ใช้สำหรับจัดการเมนูเท่านั้น (Owner/Super Admin) — ไม่ใช่หน้าสั่งอาหาร ลูกค้าสั่งผ่าน QR เท่านั้น (S-05)</div>
</div>

<div class="page">
<h2><span class="num" style="background:#059669">S-12</span> Owner ดู Dashboard + รายงาน</h2>
<div class="desc">ดูสรุปยอดขายและประสิทธิภาพร้าน</div>
<div class="pre">Precondition: Owner login, มีออเดอร์ในระบบ</div>
${S('1','#059669','ไปแท็บ "สรุป" — วันนี้','เห็น: ยอดขายรวม, จำนวนออเดอร์, แยกเงินสด/โอน, ยอดเฉลี่ยต่อออเดอร์')}
${sc('S12-1-dashboard-today.png','Step 1: Dashboard วันนี้')}
${S('2','#059669','เลือกดู 7 วัน','กดปุ่ม "7 วัน" → เห็นข้อมูลย้อนหลัง')}
${sc('S12-2-dashboard-week.png','Step 2: Dashboard 7 วัน')}
${S('3','#059669','เลือกดูเดือนนี้','กดปุ่ม "เดือนนี้"')}
${sc('S12-3-dashboard-month.png','Step 3: Dashboard เดือนนี้')}
${SL('4','#059669','ดูประวัติบิล','หน้าบิล → กด "ประวัติ" → เห็นบิลทั้งหมด กรองตามสถานะ (รอชำระ/ชำระแล้ว/ยกเลิก)')}
${sc('S12-4-history.png','Step 4: ประวัติบิลทั้งหมด')}
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════
// CUSTOMER PDF — S-05, S-06, S-07
// ═══════════════════════════════════════════════════════
function customerPDF(): string {
  const c = '#0d9488'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Customer (ลูกค้า)</div><div class="sub">QRforPay POS — S-05, S-06, S-07</div><div class="date">March 2026 | ตรวจสอบจากโค้ดจริง + Playwright E2E</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</h2>
<div class="desc">Flow หลักของระบบ — ลูกค้านั่งโต๊ะ สแกน QR สั่งอาหารเอง ไม่ต้องเรียกพนักงาน (ไม่ต้อง login)</div>
<div class="pre">Precondition: ร้านมีสินค้าในระบบ + แคชเชียร์สร้างบิลให้โต๊ะแล้ว (QR Code พร้อม)</div>
${S('1',c,'สแกน QR Code บนโต๊ะ','ลูกค้าเปิดกล้องมือถือ → สแกน QR → browser เปิดอัตโนมัติ → /order?session={uuid}')}
${sc('S05-1-order-no-session.png','ถ้าไม่มี session/QR → แสดง error "เปิดไม่ได้"')}
${S('2',c,'โหลดหน้าเมนูร้าน','ระบบโหลด shop info + categories + products ผ่าน anon Supabase client แสดงเมนูแบ่งตามหมวดหมู่')}
${sc('S05-2-order-menu.png','Step 2: หน้าเมนูร้าน — แบ่งหมวดหมู่ + รูปสินค้า')}
${S('3',c,'เลือกเมนู กด "+" เพิ่มตะกร้า','กดเพิ่มจำนวน (เช็คสต็อก ไม่ให้เกิน) → เห็นยอดรวมที่ด้านล่าง')}
${sc2('S05-3-order-menu-scroll.png','Step 3: เมนูเพิ่มเติม','S05-4-order-added-item.png','Step 3: หลังกด "+" → เห็นจำนวน + ยอดรวม')}
${S('4',c,'ตรวจสอบตะกร้า','เห็นรายการทั้งหมด + ราคารวม — แก้จำนวน ลบ หรือเพิ่มได้')}
${sc('S05-5-order-cart-summary.png','Step 4: สรุปยอด + ปุ่ม "ดูตะกร้า"')}
${S('5',c,'ดูตะกร้า → กดยืนยันออเดอร์','กดดูรายละเอียดตะกร้า → กด "สั่งอาหาร ฿xxx" → ส่งเข้าครัว')}
${sc('S05-6-order-cart-view.png','Step 5: ตะกร้า → รายการที่จะสั่ง → กดยืนยัน')}
${SL('6',c,'ออเดอร์สำเร็จ → POS ได้รับ realtime','สร้าง order (status=pending, order_source=customer) + order_items → ตะกร้าล้าง → POS แจ้งเตือนทันที')}
<div class="note i">ลูกค้าไม่ต้อง login — ใช้ anon Supabase client + RLS policy อนุญาต INSERT เฉพาะ order_source='customer'</div>
</div>

<div class="page">
<h2><span class="num" style="background:#d97706">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</h2>
<div class="desc">หลังสั่งอาหารแล้ว ลูกค้าจ่ายเงินผ่าน QR PromptPay ของร้าน</div>
<div class="pre">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ)</div>
${S('1','#d97706','กด "ชำระเงิน"','ลูกค้ากดปุ่มจ่ายเงินในหน้า customer → state เปลี่ยนเป็น paying')}
${S('2','#d97706','ระบบสร้าง PromptPay QR','EMV QR payload ตามมาตรฐาน BOT: Merchant ID (เบอร์/เลขภาษี) + จำนวนเงิน + CRC16-CCITT checksum')}
${S('3','#d97706','แสดง QR Code + countdown 5 นาที','หน้าจอแสดง QR PromptPay + ยอดเงิน + สถานะ "รอการชำระเงิน..."')}
${SL('4','#d97706','ลูกค้าเปิด Banking App สแกนจ่าย','เปิด Mobile Banking → สแกน QR จากจอ → ตรวจชื่อร้าน + จำนวนเงิน → กดยืนยัน')}
<div class="br">
<div class="bx"><h5 style="background:#2563eb">Auto Confirm (payment_mode='auto')</h5><p>Supabase Realtime ตรวจจับ payments.status='success' → auto completeOrder() → หน้าจอเปลี่ยนเป็น ✓ สำเร็จ</p></div>
<div class="bx"><h5 style="background:#ea580c">Manual Confirm (payment_mode='counter')</h5><p>แคชเชียร์ฝั่ง POS กดปุ่ม "ยืนยันรับเงินแล้ว" → Dialog confirm → แสดงสำเร็จ + ชื่อคนยืนยัน</p></div>
</div>
<div class="note w">Timeout: ถ้า 5 นาทีไม่มีการจ่าย → QR หมดอายุ → ลูกค้าเลือก "สร้าง QR ใหม่" หรือ "ยกเลิก"</div>
${sc('S08-2-session-detail.png','ตัวอย่าง: QR Code ใน Session Detail (ฝั่ง POS)')}
</div>

<div class="page">
<h2><span class="num" style="background:#db2777">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order บนโต๊ะเดียว)</h2>
<div class="desc">ลูกค้าสั่งอาหารรอบ 2, 3 บนโต๊ะเดิม — ระบบรองรับหลาย order ต่อ session เดียว</div>
<div class="pre">Precondition: ลูกค้าสั่งไปแล้ว 1 ออเดอร์ (S-05 เสร็จ) และยังอยู่หน้าเมนูเดิม</div>
${S('1','#db2777','อยู่หน้าเมนูเดิม (session ยังอยู่)','ตะกร้าว่าง แต่เห็น confirmedItems แสดงออเดอร์ก่อนหน้า + สถานะครัว realtime')}
${sc('S05-2-order-menu.png','Step 1: กลับมาหน้าเมนู — session เดิม ตะกร้าว่าง')}
${S('2','#db2777','เลือกเมนูเพิ่ม + ใส่ตะกร้า','กดเพิ่มรายการใหม่ลงตะกร้า — เป็นคนละชุดกับออเดอร์เก่า')}
${sc('S05-4-order-added-item.png','Step 2: เลือกเมนูเพิ่ม → ใส่ตะกร้า')}
${S('3','#db2777','ยืนยัน → สร้างออเดอร์ใหม่','กดสั่ง → ระบบสร้าง order_id ใหม่ + order_number ใหม่ บนโต๊ะเดิม (same customer_session_id)')}
${SL('4','#db2777','POS เห็นออเดอร์ใหม่ realtime','Supabase Realtime → หน้าบิล POS มีรายการใหม่ดังขึ้น (highlight 8 วินาที + vibrate)')}
${sc('S08-1-sessions-list.png','Step 4: POS เห็นบิลทุกโต๊ะอัพเดท realtime')}
<div class="note i">Bill Merging: เวลาดู "บิลรวมโต๊ะ" → เมนูเดียวกันจากหลายออเดอร์ รวมเป็นบรรทัดเดียว เพิ่มจำนวน (merge by product_id)</div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════
// CASHIER PDF — S-08, S-09, S-10, S-11
// (S-09 แก้ให้ตรงจริง: แคชเชียร์สร้างบิล+ให้QR ไม่ใช่สั่งแทน)
// ═══════════════════════════════════════════════════════
function cashierPDF(): string {
  const c = '#0891b2'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Cashier (แคชเชียร์/พนักงาน)</div><div class="sub">QRforPay POS — S-08, S-09, S-10, S-11</div><div class="date">March 2026 | ตรวจสอบจากโค้ดจริง + Playwright E2E</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-08</span> แคชเชียร์รับออเดอร์ + จัดการครัว</h2>
<div class="desc">ออเดอร์จากลูกค้า (S-05) เข้ามา → แคชเชียร์อัพเดทสถานะจนเสร็จ</div>
<div class="pre">Precondition: มีออเดอร์ pending เข้ามา (ลูกค้าสั่งผ่าน QR จาก S-05)</div>
${S('1',c,'แจ้งเตือนออเดอร์ใหม่ (Realtime)','Supabase Realtime subscription ตรวจจับ order ใหม่ → สั่น (Vibration) + Toast banner "ออเดอร์ #XX โต๊ะ Y" (6 วินาที auto-dismiss)')}
${S('2',c,'ดูรายการบิลที่เปิดอยู่','หน้า "บิล" → เห็น card ทุกบิลที่ยังเปิดอยู่: โต๊ะ, ยอดเงิน, จำนวนรายการ, เวลาเปิด')}
${sc('S08-1-sessions-list.png','Step 2: หน้าบิล — เห็นบิลทุกโต๊ะที่เปิดอยู่')}
${S('3',c,'กดดูรายละเอียดบิล','เห็น QR Code ของโต๊ะ + รายการสินค้าทั้งหมด + ยอดรวม + ปุ่มพิมพ์/บันทึก QR')}
${sc('S08-2-session-detail.png','Step 3: รายละเอียดบิล — QR + รายการ + ยอดเงิน + ปุ่ม "ลบ" ข้าง item')}
${S('4',c,'ดูหน้าออเดอร์ทั้งหมด','แท็บ "บิล" → ดูออเดอร์ทุกสถานะ: รอชำระเงิน / ชำระแล้ว / ยกเลิก')}
${sc('S08-4-orders-page.png','Step 4: ออเดอร์ทั้งหมด (กรองตามสถานะได้)')}
${SL('5',c,'ยืนยัน Payment + ปิดบิล','เงินสด: กรอกเงินที่รับ → คำนวณทอน → ยืนยัน | QR: กด "ยืนยันรับเงินแล้ว" → order status=completed')}
</div>

<div class="page">
<h2><span class="num" style="background:#4f46e5">S-09</span> แคชเชียร์สร้างบิล + ให้ QR ลูกค้า</h2>
<div class="desc">แคชเชียร์เปิดบิลใหม่ให้โต๊ะ แล้วให้ QR Code ลูกค้าสแกนสั่งอาหารเอง (ระบบนี้ลูกค้าสั่งเอง ไม่ใช่แคชเชียร์สั่งแทน)</div>
<div class="pre">Precondition: Cashier/Owner login แล้ว, มีโต๊ะตั้งค่าแล้ว</div>
${S('1','#4f46e5','ไปหน้า "บิล" กด "+ บิลใหม่" หรือไปหน้า "โต๊ะ" กดที่โต๊ะว่าง','ระบบสร้าง customer_session (status=active) + สร้าง QR Code สำหรับโต๊ะนั้น')}
${sc('S08-1-sessions-list.png','Step 1: หน้าบิล — กด "+ บิลใหม่" มุมขวาบน')}
${S('2','#4f46e5','ระบบแสดง QR Code + URL','QR ชี้ไปที่ /order?session={uuid} — ลูกค้าสแกนเพื่อดูเมนูและสั่งอาหาร')}
${sc('S11-2-table-detail.png','Step 2: QR Code สำหรับให้ลูกค้าสแกน + ปุ่ม "พิมพ์/บันทึก QR"')}
${S('3','#4f46e5','ให้ QR ลูกค้า','พิมพ์ QR (80mm receipt) หรือ ให้ลูกค้าสแกนจากหน้าจอ')}
${SL('4','#4f46e5','ลูกค้าสแกน QR → สั่งอาหารเอง (S-05)','ลูกค้าเปิดมือถือ สแกน QR → เห็นเมนูร้าน → สั่งอาหาร → ส่งเข้าครัว → แคชเชียร์ได้รับ realtime (S-08)')}
${sc('S05-2-order-menu.png','Step 4: ลูกค้าสแกน QR แล้วเห็นเมนู → สั่งอาหารเอง')}
<div class="note w">ระบบ QRforPay เป็น Self-Service — ลูกค้าสั่งอาหารเอง แคชเชียร์ไม่สามารถสั่งแทนลูกค้าได้ หน้า "สินค้า" ใช้สำหรับ Owner จัดการเมนูเท่านั้น</div>
</div>

<div class="page">
<h2><span class="num" style="background:#dc2626">S-10</span> ยกเลิกรายการ / ยกเลิกบิล</h2>
<div class="desc">2 ระดับ: ยกเลิกรายเมนู (item-level) หรือยกเลิกทั้งบิล</div>
<div class="pre">Precondition: มีบิลเปิดอยู่ที่มีออเดอร์</div>
<div class="br">
<div class="bx"><h5 style="background:#f59e0b">A: ยกเลิกรายเมนู</h5>
<p>1. เปิดรายละเอียดบิล → เห็นทุก item<br>
2. กดปุ่ม "ลบ" ข้าง item → confirm<br>
3. ระบบคำนวณยอดใหม่ (เฉพาะ active items)<br>
4. ถ้าทุก item ถูกลบ → auto ยกเลิกทั้งบิล</p></div>
<div class="bx"><h5 style="background:#dc2626">B: ยกเลิกทั้งบิล</h5>
<p>1. เปิดรายละเอียดโต๊ะ หรือ บิล<br>
2. กด "ยกเลิกบิล" → confirm dialog<br>
3. session.status='cancelled' → บิลปิด<br>
4. ลูกค้า (ถ้าเปิดหน้าเมนูอยู่) เห็น realtime</p></div>
</div>
${sc('S08-2-session-detail.png','รายละเอียดบิล: กด "ลบ" ข้างรายการ หรือ กด "ยกเลิกบิล" ด้านล่าง')}
</div>

<div class="page">
<h2><span class="num" style="background:#475569">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</h2>
<div class="desc">ดูสถานะโต๊ะทั้งร้าน + ย้ายลูกค้าไปโต๊ะอื่น</div>
<div class="pre">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว</div>
${S('1','#475569','ไปแท็บ "โต๊ะ"','แสดง Grid โต๊ะ 1..N — สีบอกสถานะ: 🟢 ว่าง 🟠 ไม่ว่าง (มีบิลเปิดอยู่) + ยอดเงิน + จำนวนรายการ + ปุ่ม ⇄ สำหรับย้ายโต๊ะ')}
${sc('S11-1-tables-grid.png','Step 1: Grid โต๊ะ — สถานะ + ยอดเงิน + ปุ่ม ⇄ ย้ายโต๊ะ')}
${S('2','#475569','กดที่ตัวเลขโต๊ะ → ดูรายละเอียด','เห็น QR Code สำหรับลูกค้าสแกน + รายการออเดอร์ + ปุ่ม "พิมพ์/บันทึก QR" + ปุ่ม "ยกเลิกบิล"')}
${sc('S11-2-table-detail.png','Step 2: รายละเอียดโต๊ะ — QR + สถานะ + ปุ่มยกเลิก')}
${SL('3','#475569','ย้ายโต๊ะ (กดปุ่ม ⇄ จาก Grid ได้เลย)','กดปุ่ม ⇄ ที่โต๊ะใน Grid โดยตรง (ไม่ต้องเข้ารายละเอียดก่อน) → เลือกโต๊ะปลายทาง → ยืนยัน → ระบบอัพเดท table_number')}
<div class="note i">ย้ายโต๊ะ: กดปุ่ม ⇄ จาก Grid ได้เลย ไม่ต้องเปิดรายละเอียดโต๊ะก่อน — ย้ายเฉพาะ order ที่ยังไม่เสร็จไปโต๊ะใหม่</div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════
// ADMIN PDF — S-02
// ═══════════════════════════════════════════════════════
function adminPDF(): string {
  const c = '#16a34a'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>E2E User Flow</h1><div class="badge" style="background:${c}">Super Admin</div><div class="sub">QRforPay POS — S-02</div><div class="date">March 2026 | ตรวจสอบจากโค้ดจริง + Playwright E2E</div></div>

<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Super Admin อนุมัติร้าน + จัดการ Subscription</h2>
<div class="desc">Super Admin ตรวจสอบร้านทั้งหมด ต่อ subscription ยกเลิกสิทธิ์</div>
<div class="pre">Precondition: มี pending owner อย่างน้อย 1 คน (จาก S-01) หรือมีร้านในระบบ</div>
${S('1',c,'Super Admin Login','Login ด้วย email super admin → ระบบตรวจ role=super_admin')}
${sc('S01-6-login-page.png','Step 1: หน้า Login')}
${S('2',c,'กดแท็บ "Admin"','เห็นแท็บ "Admin" ที่ nav (เฉพาะ super_admin เท่านั้น) → กดเข้า Admin Panel')}
${S('3',c,'เห็น Admin Panel — จัดการร้านค้าทั้งหมด','เห็นร้านค้าทั้งหมดในระบบ + จำนวนคำขอรอ + ปุ่ม "+30 วัน", "ยกเลิกสิทธิ์", "ลบ"')}
${sc('S02-3-admin-panel.png','Step 3: Admin Panel — จัดการร้านค้า (ไม่เห็นโต๊ะ/ออเดอร์ของร้าน)')}
${S('4',c,'กด "+30 วัน" ต่อ subscription','อัพเดท subscription_paid_until +30 วัน → Owner ใช้ระบบต่อได้')}
${SL('5',c,'Owner เข้าระบบได้ทันที','Owner login/refresh → profile.role=owner → ใช้ POS ได้ ไม่โดน paywall')}
<div class="note i">Owner ใหม่จะได้ทดลองใช้ฟรี 7 วัน หลังหมดต้องชำระค่าแรกเข้า ฿999 หรือใช้รหัสตัวแทน</div>
<div class="note i">Super Admin จัดการร้านค้าเท่านั้น (อนุมัติ/ต่อ subscription/ยกเลิก) — ไม่เห็นโต๊ะหรือออเดอร์ของร้าน เพราะไม่มี shop_id</div>
<div class="note i">การเพิ่ม Cashier เป็นหน้าที่ของ Owner (เจ้าของร้านเพิ่มลูกน้องเอง) ดูที่ S-03</div>
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

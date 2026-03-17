import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS = path.resolve(__dirname, 'screenshots')
const REPORTS = path.resolve(__dirname, 'reports')

// Convert image to base64 data URI
function imgB64(name: string): string {
  const p = path.join(SCREENSHOTS, name)
  if (!fs.existsSync(p)) return ''
  const buf = fs.readFileSync(p)
  return `data:image/png;base64,${buf.toString('base64')}`
}

// Shared CSS
const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color:#1e293b; padding:0; }
.cover { page-break-after:always; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.cover h1 { font-size:2.4rem; margin-bottom:8px; }
.cover .role-badge { display:inline-block; padding:8px 28px; border-radius:12px; color:white; font-size:1.1rem; font-weight:700; margin:16px 0; }
.cover .sub { color:#64748b; font-size:1rem; margin-bottom:8px; }
.cover .date { color:#94a3b8; font-size:0.85rem; margin-top:20px; }

.scenario { page-break-before:always; padding:32px; }
.scenario:first-of-type { page-break-before:auto; }
.s-title { font-size:1.5rem; color:#1e40af; margin-bottom:4px; display:flex; align-items:center; gap:10px; }
.s-num { display:inline-block; padding:4px 12px; border-radius:8px; color:white; font-size:0.85rem; font-weight:700; }
.s-desc { font-size:0.9rem; color:#64748b; margin-bottom:12px; }
.precond { padding:10px 16px; background:#eff6ff; border-left:4px solid #3b82f6; border-radius:0 8px 8px 0; font-size:0.85rem; color:#1e40af; margin-bottom:20px; }

.step { display:flex; gap:12px; margin-bottom:14px; }
.step-n { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:white; font-size:0.8rem; flex-shrink:0; }
.step-body h4 { font-size:0.92rem; font-weight:700; margin-bottom:2px; }
.step-body p { font-size:0.82rem; color:#64748b; line-height:1.5; }
.step-body .tech { font-size:0.75rem; color:#94a3b8; font-style:italic; }
.arrow-down { text-align:left; padding:0 0 0 10px; color:#cbd5e1; font-size:1rem; margin:-4px 0; }

.screenshots-section { margin-top:20px; page-break-inside:avoid; }
.screenshots-section h4 { font-size:0.82rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; border-top:1px solid #e2e8f0; padding-top:14px; }
.ss-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.ss-card { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; flex:1; min-width:200px; max-width:48%; }
.ss-card.full { max-width:100%; }
.ss-card img { width:100%; display:block; }
.ss-card .label { padding:6px 10px; background:#f8fafc; font-size:0.72rem; color:#475569; text-align:center; border-top:1px solid #f1f5f9; }

.note { padding:10px 14px; border-radius:8px; font-size:0.8rem; line-height:1.5; margin-top:12px; }
.note.info { background:#eff6ff; color:#1e40af; border-left:3px solid #3b82f6; }
.note.warn { background:#fef3c7; color:#92400e; border-left:3px solid #f59e0b; }

.branch-grid { display:flex; gap:12px; margin-top:8px; }
.branch-box { flex:1; padding:12px; border-radius:10px; border:1px solid #e2e8f0; font-size:0.82rem; color:#64748b; line-height:1.5; }
.branch-box h5 { display:inline-block; padding:3px 10px; border-radius:6px; color:white; font-size:0.8rem; font-weight:700; margin-bottom:6px; }

.lifecycle { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:12px 0; }
.status-box { padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; color:white; text-align:center; }
`

// ─── OWNER ROLE ────────────────────────────────────────────
function ownerHTML(): string {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover">
  <h1>E2E User Flow</h1>
  <div class="role-badge" style="background:#2563eb;">Owner (เจ้าของร้าน)</div>
  <div class="sub">QRforPay POS — Scenarios S-01, S-03, S-04, S-12</div>
  <div class="date">March 2026 | Generated from actual source code + Playwright E2E</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#2563eb;">S-01</span> Owner สมัครร้านใหม่ (First-time Setup)</div>
  <div class="s-desc">เจ้าของร้านอาหารต้องการเปิดใช้ระบบ QRforPay ครั้งแรก</div>
  <div class="precond">Precondition: ยังไม่มี account ในระบบ</div>

  <div class="step"><div class="step-n" style="background:#2563eb;">1</div><div class="step-body"><h4>เปิดหน้าเว็บ QRforPay</h4><p>เห็นหน้า Landing พร้อม Hero, Features, Pricing และปุ่ม "ทดลองฟรี 7 วัน"</p><div class="tech">Route: / (app/page.tsx)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#2563eb;">2</div><div class="step-body"><h4>กดสมัคร → Register Step 1</h4><p>กรอก ชื่อ-นามสกุล + อีเมล + รหัสผ่าน (8+ ตัว มีตัวเลข) กด "ถัดไป"</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#2563eb;">3</div><div class="step-body"><h4>Register Step 2 — ข้อมูลร้านค้า</h4><p>กรอก "ชื่อร้าน" + "PromptPay ID" (เบอร์โทร 10 หลัก หรือ เลขนิติบุคคล 13 หลัก)</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#2563eb;">4</div><div class="step-body"><h4>กด "สมัครสมาชิก"</h4><p>supabase.auth.signUp() → self_register_shop RPC → สร้าง shop + profile ทันที</p><div class="tech">DB: INSERT shops + UPDATE profiles (role='owner', shop_id=ใหม่)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#2563eb;">5</div><div class="step-body"><h4>Redirect → เข้าระบบ POS ทันที</h4><p>Redirect ไป /pos/tables หรือ /pending (ถ้า fallback)</p></div></div>

  <div class="screenshots-section"><h4>Screenshots</h4>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('01-landing-hero.png')}"><div class="label">1. Landing Page</div></div>
      <div class="ss-card"><img src="${imgB64('02-register-step1-empty.png')}"><div class="label">2. Register Step 1 (ว่าง)</div></div>
    </div>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('02-register-step1-filled.png')}"><div class="label">3. Register Step 1 (กรอกแล้ว)</div></div>
      <div class="ss-card"><img src="${imgB64('02-register-step2-empty.png')}"><div class="label">4. Register Step 2 (ว่าง)</div></div>
    </div>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('02-register-step2-filled.png')}"><div class="label">5. Register Step 2 (กรอกแล้ว)</div></div>
      <div class="ss-card"><img src="${imgB64('08-pending-page.png')}"><div class="label">6. Pending (ถ้ารอ approve)</div></div>
    </div>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('02-register-validation-password.png')}"><div class="label">Validation: รหัสผ่านสั้น</div></div>
      <div class="ss-card"><img src="${imgB64('02-register-validation-nodigit.png')}"><div class="label">Validation: ไม่มีตัวเลข</div></div>
    </div>
  </div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#7c3aed;">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</div>
  <div class="s-desc">หลังร้านได้รับอนุมัติ Owner ตั้งค่าร้านให้พร้อมใช้งาน</div>
  <div class="precond">Precondition: Owner login แล้ว, ร้านอนุมัติแล้ว</div>

  <div class="step"><div class="step-n" style="background:#7c3aed;">1</div><div class="step-body"><h4>ไปแท็บ "ตั้งค่า"</h4><p>เห็น: ชื่อร้าน, เลข PromptPay, จำนวนโต๊ะ (default: 10), โหมดชำระเงิน (auto/counter)</p><div class="tech">Route: /pos/settings</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#7c3aed;">2</div><div class="step-body"><h4>แก้ไขข้อมูลร้าน</h4><p>แก้ชื่อร้าน / PromptPay ID / จำนวนโต๊ะ (1-200) / payment mode → กด "บันทึก"</p><div class="tech">DB: UPDATE shops SET name, promptpay_id, table_count, payment_mode</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#7c3aed;">3</div><div class="step-body"><h4>เพิ่ม Cashier (พนักงาน)</h4><p>กรอก: ชื่อ-นามสกุล, Email, Password → กด "สร้าง Cashier"</p><div class="tech">Supabase Edge Function → auth.users + profiles (role='cashier', shop_id=owner's shop)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#7c3aed;">4</div><div class="step-body"><h4>ดูรายชื่อทีม</h4><p>แสดงสมาชิกทั้งหมดในร้าน: email, ชื่อ, role — Owner สามารถลบสมาชิกได้</p></div></div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#ea580c;">S-04</span> Owner จัดการสินค้า + เมนู</div>
  <div class="s-desc">เพิ่ม/แก้ไข/ลบ/จัดลำดับสินค้าในร้าน</div>
  <div class="precond">Precondition: Owner login, ร้านตั้งค่าแล้ว</div>

  <div class="step"><div class="step-n" style="background:#ea580c;">1</div><div class="step-body"><h4>ไปแท็บ "สินค้า"</h4><p>แสดงรายการสินค้าทั้งหมด — ค้นหาได้ — สีบอกสถานะสต็อก (แดง=หมด, ส้ม=ใกล้หมด≤5)</p><div class="tech">Route: /pos/products</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#ea580c;">2</div><div class="step-body"><h4>เพิ่มสินค้าใหม่</h4><p>กดปุ่ม "+" → Modal form: ชื่อ, ราคา, หมวดหมู่, จำนวนสต็อก, barcode, รูปภาพ → บันทึก</p><div class="tech">Validation: ชื่อ 2-100 ตัว, ราคา 1-999,999, stock 0-99,999</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#ea580c;">3</div><div class="step-body"><h4>แก้ไขสินค้า</h4><p>กดที่สินค้า → Modal เดิม (pre-filled) → แก้ข้อมูล → บันทึก</p><div class="tech">DB: UPDATE products</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#ea580c;">4</div><div class="step-body"><h4>ลบสินค้า</h4><p>กดลบ → ยืนยัน → Soft delete (is_active = false) สินค้าหายจากเมนูลูกค้า</p></div></div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#059669;">S-12</span> Owner ดู Dashboard + รายงาน</div>
  <div class="s-desc">เจ้าของร้านดูสรุปยอดขายและประสิทธิภาพร้าน</div>
  <div class="precond">Precondition: Owner login, มีออเดอร์ในระบบ</div>

  <div class="step"><div class="step-n" style="background:#059669;">1</div><div class="step-body"><h4>ไปแท็บ "แดชบอร์ด"</h4><p>แสดงข้อมูล: ยอดขายรวม, จำนวนออเดอร์, เงินสด vs โอน, ยอดเฉลี่ยต่อออเดอร์</p><div class="tech">Route: /pos/dashboard</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#059669;">2</div><div class="step-body"><h4>ดูสินค้าขายดี Top 5</h4><p>แสดง 5 อันดับสินค้าที่ขายได้มากที่สุด (นับ qty) — ช่วยตัดสินใจเมนู</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#059669;">3</div><div class="step-body"><h4>เลือกช่วงเวลา</h4><p>วันนี้ / 7 วัน / เดือนนี้ — สลับดูข้อมูลย้อนหลัง</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#059669;">4</div><div class="step-body"><h4>ดูประวัติออเดอร์ (History)</h4><p>แท็บ "ออเดอร์" → History tab → กรอง: วันนี้/เมื่อวาน/7วัน/30วัน + สถานะ: completed/cancelled — Pagination 15 รายการ</p></div></div>
</div>
</body></html>`
}

// ─── CUSTOMER ROLE ────────────────────────────────────────
function customerHTML(): string {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover">
  <h1>E2E User Flow</h1>
  <div class="role-badge" style="background:#0d9488;">Customer (ลูกค้า)</div>
  <div class="sub">QRforPay POS — Scenarios S-05, S-06, S-07</div>
  <div class="date">March 2026 | Generated from actual source code + Playwright E2E</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#0d9488;">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</div>
  <div class="s-desc">Flow หลักของระบบ — ลูกค้านั่งโต๊ะ สแกน QR สั่งอาหารเอง ไม่ต้องเรียกพนักงาน</div>
  <div class="precond">Precondition: ร้านมีสินค้าในระบบแล้ว + QR Code ติดบนโต๊ะ</div>

  <div class="step"><div class="step-n" style="background:#0d9488;">1</div><div class="step-body"><h4>สแกน QR Code บนโต๊ะ</h4><p>ลูกค้าเปิดกล้องมือถือ → สแกน → เปิด browser อัตโนมัติ</p><div class="tech">URL: /order?session={customer_session_uuid}</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">2</div><div class="step-body"><h4>โหลดหน้าเมนูร้าน</h4><p>ระบบสร้าง session → โหลด shop info + categories + products ผ่าน anon Supabase client</p><div class="tech">RLS: anon SELECT on shops, categories, products</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">3</div><div class="step-body"><h4>เลือกดูเมนูตามหมวดหมู่</h4><p>กดเลือกหมวดหมู่ (อาหาร, เครื่องดื่ม) → แสดงสินค้าในหมวด — สินค้าหมดสต็อกจะ disabled</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">4</div><div class="step-body"><h4>เพิ่มสินค้าลงตะกร้า</h4><p>กดปุ่ม "+" → จำนวน +1 (เช็คสต็อก ไม่ให้เกิน) → เห็นจำนวน + ยอดรวมที่ด้านล่าง</p><div class="tech">State: localStorage cart (CART_KEY per session)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">5</div><div class="step-body"><h4>ตรวจสอบตะกร้า</h4><p>กดดูตะกร้า → เห็นรายการทั้งหมด + ราคารวม — แก้จำนวน ลบ หรือเพิ่มได้</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">6</div><div class="step-body"><h4>กดยืนยันออเดอร์</h4><p>กด "ยืนยัน" → ระบบสร้าง: order (status=pending) + order_items + payment (status=pending)</p><div class="tech">DB: INSERT orders + order_items + payments | RLS: anon INSERT allowed</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0d9488;">7</div><div class="step-body"><h4>ออเดอร์ส่งสำเร็จ</h4><p>แสดงหน้า success → ตะกร้าถูกล้าง → POS ได้รับแจ้งเตือน realtime ทันที</p><div class="tech">Supabase Realtime broadcast → POS orders page</div></div></div>

  <div class="screenshots-section"><h4>Screenshots</h4>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('05-order-no-session.png')}"><div class="label">เปิดหน้า Order ไม่มี session</div></div>
      <div class="ss-card"><img src="${imgB64('05-order-invalid-session.png')}"><div class="label">เปิดด้วย session ไม่ถูกต้อง</div></div>
    </div>
  </div>
  <div class="note info">ต้องมี session UUID จริง (จาก QR Code บนโต๊ะ) ถึงจะเห็นเมนูร้าน</div>
  <div class="note warn" style="margin-top:8px;">Anti-Table-Switching: ถ้าลูกค้าสแกน QR โต๊ะอื่นใน browser เดียวกัน จะถาม confirm ก่อนสลับ ป้องกันออเดอร์เข้าผิดโต๊ะ</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#d97706;">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</div>
  <div class="s-desc">หลังสั่งอาหารแล้ว ลูกค้าจ่ายเงินผ่าน QR PromptPay ของร้าน</div>
  <div class="precond">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ step 7)</div>

  <div class="step"><div class="step-n" style="background:#d97706;">1</div><div class="step-body"><h4>กด "ชำระเงิน"</h4><p>ลูกค้ากดปุ่มจ่ายเงินในหน้า customer</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#d97706;">2</div><div class="step-body"><h4>ระบบสร้าง PromptPay QR</h4><p>EMV QR payload ตามมาตรฐาน BOT: Merchant ID + จำนวนเงิน + CRC16-CCITT XModem checksum</p><div class="tech">lib/qr.ts → generatePromptPayQR(promptpayId, amount)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#d97706;">3</div><div class="step-body"><h4>แสดง QR Code + รอการชำระ</h4><p>หน้าจอแสดง QR PromptPay + ยอดเงิน + สถานะ "รอการชำระเงิน..." + countdown 5 นาที</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#d97706;">4</div><div class="step-body"><h4>ลูกค้าเปิดแอปธนาคาร</h4><p>เปิด Mobile Banking → สแกน QR จากจอ → ตรวจสอบชื่อร้าน + จำนวนเงิน → กดยืนยัน</p></div></div>

  <div class="branch-grid">
    <div class="branch-box"><h5 style="background:#2563eb;">กรณี A: Auto Confirm</h5><p><strong>5a.</strong> Supabase Realtime ตรวจจับ payments.status = 'success' → auto completeOrder()</p><p><strong>6a.</strong> หน้าจอเปลี่ยนเป็น ✓ สำเร็จ</p></div>
    <div class="branch-box"><h5 style="background:#ea580c;">กรณี B: Manual Confirm</h5><p><strong>5b.</strong> แคชเชียร์ฝั่ง POS กดปุ่ม "ยืนยันรับเงินแล้ว" → Dialog confirm</p><p><strong>6b.</strong> แสดงสำเร็จ + ชื่อคนยืนยัน</p></div>
  </div>

  <div class="step" style="margin-top:16px;"><div class="step-n" style="background:#22c55e;">7</div><div class="step-body"><h4>Order Completed</h4><p>orders.status='completed', payments.status='success' → ลูกค้ากด "เสร็จสิ้น" → กลับหน้าเมนู</p></div></div>

  <div class="note warn">Timeout: ถ้า 5 นาทีไม่มีการจ่าย → QR หมดอายุ → ลูกค้าเลือก "สร้าง QR ใหม่" หรือ "ยกเลิก"</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#db2777;">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order บนโต๊ะเดียว)</div>
  <div class="s-desc">ลูกค้าสั่งอาหารรอบ 2, 3 บนโต๊ะเดิม — ระบบรองรับหลาย order ต่อโต๊ะ</div>
  <div class="precond">Precondition: ลูกค้าสั่งไปแล้ว 1 ออเดอร์ (S-05 เสร็จ)</div>

  <div class="step"><div class="step-n" style="background:#db2777;">1</div><div class="step-body"><h4>อยู่หน้าเมนูเดิม (session ยังอยู่)</h4><p>ตะกร้าว่าง แต่ confirmedItems แสดงออเดอร์ก่อนหน้า + สถานะครัว (realtime)</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#db2777;">2</div><div class="step-body"><h4>เลือกเมนูเพิ่ม</h4><p>กดเพิ่มรายการใหม่ลงตะกร้า — เป็นคนละชุดกับออเดอร์เก่า</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#db2777;">3</div><div class="step-body"><h4>ยืนยัน + สร้างออเดอร์ใหม่</h4><p>กดสั่ง → ระบบสร้าง order_id ใหม่ + order_number ใหม่ บนโต๊ะเดิม</p><div class="tech">DB: new row in orders (same customer_session_id)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#db2777;">4</div><div class="step-body"><h4>POS เห็นออเดอร์ใหม่ realtime</h4><p>หน้าออเดอร์ POS มีรายการใหม่ดังขึ้น (highlight 8 วินาที + vibrate)</p></div></div>

  <div class="note info">Bill Merging Rule: เมนูเดียวกันจากหลายออเดอร์ ต้องรวมเป็นบรรทัดเดียว เพิ่มจำนวน ห้ามซ้ำ (merge by product_id)</div>
</div>
</body></html>`
}

// ─── CASHIER ROLE ────────────────────────────────────────
function cashierHTML(): string {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover">
  <h1>E2E User Flow</h1>
  <div class="role-badge" style="background:#0891b2;">Cashier (แคชเชียร์/พนักงาน)</div>
  <div class="sub">QRforPay POS — Scenarios S-08, S-09, S-10, S-11</div>
  <div class="date">March 2026 | Generated from actual source code + Playwright E2E</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#0891b2;">S-08</span> แคชเชียร์รับออเดอร์ + จัดการครัว</div>
  <div class="s-desc">ออเดอร์เข้ามา → แคชเชียร์อัพเดทสถานะจนเสร็จ</div>
  <div class="precond">Precondition: มีออเดอร์ pending เข้ามา (จาก S-05 หรือ S-09)</div>

  <div class="step"><div class="step-n" style="background:#0891b2;">1</div><div class="step-body"><h4>แจ้งเตือนออเดอร์ใหม่</h4><p>Realtime subscription → สั่น (Vibration) + Toast banner "ออเดอร์ #XX โต๊ะ Y" (6 วินาที auto-dismiss)</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0891b2;">2</div><div class="step-body"><h4>ดูรายละเอียดออเดอร์</h4><p>แท็บ "ออเดอร์" → Active tab → เห็น order card: เลขออเดอร์, โต๊ะ, รายการ, ยอดเงิน, สถานะ</p><div class="tech">Route: /pos/orders — Active Orders Tab</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0891b2;">3</div><div class="step-body"><h4>กด "กำลังทำ"</h4><p>เปลี่ยนสถานะ: pending → preparing — ลูกค้าเห็น realtime ว่าครัวเริ่มทำแล้ว</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0891b2;">4</div><div class="step-body"><h4>กด "พร้อมเสิร์ฟ"</h4><p>เปลี่ยนสถานะ: preparing → ready — ลูกค้าเห็น "อาหารของคุณพร้อมแล้ว"</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#0891b2;">5</div><div class="step-body"><h4>ยืนยัน Payment + Complete</h4><p>QR: กด "ยืนยันรับเงินแล้ว" (manual) หรือ auto detect<br>เงินสด: กรอกจำนวนเงินรับ → ระบบคำนวณเงินทอน → ยืนยัน</p></div></div>

  <div class="lifecycle" style="margin-top:16px;">
    <div class="status-box" style="background:#f59e0b;">pending</div><span style="color:#94a3b8;">→</span>
    <div class="status-box" style="background:#3b82f6;">preparing</div><span style="color:#94a3b8;">→</span>
    <div class="status-box" style="background:#8b5cf6;">ready</div><span style="color:#94a3b8;">→</span>
    <div class="status-box" style="background:#22c55e;">completed</div>
  </div>

  <div class="screenshots-section"><h4>Screenshots</h4>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('03-login-empty.png')}"><div class="label">Login Page (Cashier ใช้ email+password)</div></div>
      <div class="ss-card"><img src="${imgB64('03-login-filled.png')}"><div class="label">Login กรอกข้อมูล</div></div>
    </div>
  </div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#4f46e5;">S-09</span> แคชเชียร์สั่งแทนลูกค้า (POS Order)</div>
  <div class="s-desc">ลูกค้าบอกปากเปล่า → แคชเชียร์กดสั่งให้ผ่านหน้าจอ POS</div>
  <div class="precond">Precondition: Cashier/Owner login แล้ว</div>

  <div class="step"><div class="step-n" style="background:#4f46e5;">1</div><div class="step-body"><h4>ไปแท็บ "สินค้า"</h4><p>เห็นรายการสินค้าทั้งหมด — กดเพิ่มสินค้าที่ลูกค้าต้องการ</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#4f46e5;">2</div><div class="step-body"><h4>ตรวจสอบตะกร้า</h4><p>Cart screen: ดูรายการ + ราคา + ใส่ส่วนลด (% หรือ บาท) + เลือกเลขโต๊ะ</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#4f46e5;">3</div><div class="step-body"><h4>เลือกวิธีจ่าย</h4></div></div>

  <div class="branch-grid">
    <div class="branch-box"><h5 style="background:#0891b2;">A: QR PromptPay</h5><p>กด "จ่ายด้วย QR" → แสดง QR ให้ลูกค้าสแกน → รอ confirm</p></div>
    <div class="branch-box"><h5 style="background:#059669;">B: เงินสด</h5><p>กด "จ่ายเงินสด" → กรอกเงินรับ → คำนวณทอน → ยืนยัน</p></div>
  </div>
  <div class="note info" style="margin-top:8px;">ทางเลือก C: บันทึกไว้ก่อน (Save as Pending) — ครัวเริ่มทำได้เลย จ่ายทีหลัง</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#dc2626;">S-10</span> ยกเลิกรายการ / ยกเลิกออเดอร์</div>
  <div class="s-desc">2 ระดับ: ยกเลิกรายเมนู (item-level) หรือยกเลิกทั้งออเดอร์</div>
  <div class="precond">Precondition: มีออเดอร์ในระบบ</div>

  <div class="branch-grid">
    <div class="branch-box"><h5 style="background:#f59e0b;">กรณี A: ยกเลิกรายเมนู</h5>
      <p>1. กดดูรายละเอียดออเดอร์ → Detail Modal</p>
      <p>2. กดปุ่มยกเลิกข้าง item → confirm</p>
      <p>3. ระบบคำนวณยอดใหม่ (เฉพาะ active items)</p>
      <p>4. ถ้าทุกรายการถูกยกเลิก → auto cascade ยกเลิกทั้งออเดอร์</p>
    </div>
    <div class="branch-box"><h5 style="background:#dc2626;">กรณี B: ยกเลิกทั้งออเดอร์</h5>
      <p>1. เปิด Detail Modal → กด "ยกเลิกออเดอร์"</p>
      <p>2. confirm dialog → cancelOrder(orderId)</p>
      <p>3. ออเดอร์ย้ายไป History tab สถานะ cancelled</p>
      <p>4. ลูกค้า (ถ้าสั่งเอง) เห็น realtime ว่าถูกยกเลิก</p>
    </div>
  </div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#475569;">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</div>
  <div class="s-desc">ดูสถานะโต๊ะทั้งร้าน แชร์ QR ย้ายออเดอร์ไปโต๊ะอื่น</div>
  <div class="precond">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว</div>

  <div class="step"><div class="step-n" style="background:#475569;">1</div><div class="step-body"><h4>ไปแท็บ "โต๊ะ"</h4><p>Grid ปุ่มเลขโต๊ะ 1..N — สีบอกสถานะ: 🟢 ว่าง 🟠 มีออเดอร์</p><div class="tech">Route: /pos/tables</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#475569;">2</div><div class="step-body"><h4>กดเลือกโต๊ะ → ดูรายละเอียด</h4><p>Detail Panel: ออเดอร์ทั้งหมดของโต๊ะ (combined view) + QR Code + ปุ่ม action</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#475569;">3</div><div class="step-body"><h4>แชร์ QR / Copy URL</h4><p>"แชร์ QR" → Screenshot + Share API | "Copy URL" → clipboard</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#475569;">4</div><div class="step-body"><h4>ย้ายโต๊ะ</h4><p>กด "ย้ายโต๊ะ" → Modal เลือกโต๊ะปลายทาง → ยืนยัน → อัพเดท table_number ทุก active order</p></div></div>
</div>
</body></html>`
}

// ─── SUPER ADMIN ROLE ────────────────────────────────────
function adminHTML(): string {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover">
  <h1>E2E User Flow</h1>
  <div class="role-badge" style="background:#16a34a;">Super Admin</div>
  <div class="sub">QRforPay POS — Scenario S-02</div>
  <div class="date">March 2026 | Generated from actual source code + Playwright E2E</div>
</div>

<div class="scenario">
  <div class="s-title"><span class="s-num" style="background:#16a34a;">S-02</span> Super Admin อนุมัติร้าน</div>
  <div class="s-desc">Super Admin ตรวจสอบและอนุมัติร้านใหม่ที่สมัครเข้ามา</div>
  <div class="precond">Precondition: มี pending owner อย่างน้อย 1 คน (จาก S-01)</div>

  <div class="step"><div class="step-n" style="background:#16a34a;">1</div><div class="step-body"><h4>Super Admin Login</h4><p>Login → ระบบตรวจ role = 'super_admin' → Redirect ไป /pos/settings (no shop_id)</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#16a34a;">2</div><div class="step-body"><h4>เห็นรายชื่อ Pending Users</h4><p>รายการ Owner ที่รอการอนุมัติ แสดง: email, ชื่อร้าน (pending), เลข PromptPay</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#16a34a;">3</div><div class="step-body"><h4>กดอนุมัติ</h4><p>แสดง Modal ให้ยืนยัน/แก้ไข ชื่อร้าน + PromptPay ID → กดยืนยัน</p><div class="tech">approveOwner() → INSERT shops + UPDATE profiles (role='owner', shop_id=ใหม่)</div></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#16a34a;">4</div><div class="step-body"><h4>ระบบสร้างร้าน</h4><p>สร้าง row ใน shops table + อัพเดท profiles: role = 'owner', shop_id = ใหม่</p></div></div>
  <div class="arrow-down">↓</div>
  <div class="step"><div class="step-n" style="background:#16a34a;">5</div><div class="step-body"><h4>Owner เข้าระบบได้ทันที</h4><p>Owner refresh/re-login → profile.role = 'owner' → Redirect ไป /pos/sessions</p></div></div>

  <div class="screenshots-section"><h4>Screenshots</h4>
    <div class="ss-row">
      <div class="ss-card"><img src="${imgB64('03-login-empty.png')}"><div class="label">Admin Login Page</div></div>
      <div class="ss-card"><img src="${imgB64('03-login-error.png')}"><div class="label">Login Error (ข้อมูลผิด)</div></div>
    </div>
  </div>
  <div class="note info">หมายเหตุ: Owner ต้องรอ Super Admin อนุมัติก่อนถึงจะเข้าใช้ระบบ POS ได้ ป้องกันคนสุ่มสร้างร้านปลอม</div>
</div>
</body></html>`
}

async function main() {
  const roles = [
    { name: 'owner', fn: ownerHTML },
    { name: 'customer', fn: customerHTML },
    { name: 'cashier', fn: cashierHTML },
    { name: 'admin', fn: adminHTML },
  ]

  const browser = await chromium.launch()

  for (const role of roles) {
    const html = role.fn()
    const htmlPath = path.join(REPORTS, `${role.name}.html`)
    fs.writeFileSync(htmlPath, html)

    const page = await browser.newPage()
    await page.goto(`file://${htmlPath}`)
    await page.pdf({
      path: path.join(REPORTS, `E2E-UserFlow-${role.name}.pdf`),
      format: 'A4',
      printBackground: true,
      margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
    })
    await page.close()
    console.log(`✓ ${role.name}.pdf`)
  }

  await browser.close()
  console.log('\nDone! PDFs in e2e/reports/')
}

main()

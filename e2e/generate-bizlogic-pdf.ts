import { chromium } from '@playwright/test'
import * as path from 'path'

const REPORTS = path.resolve(__dirname, 'reports')

const HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b;font-size:12px;line-height:1.5}
.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#0f172a,#1e3a8a)}
.cover h1{font-size:2.2rem;color:white;margin-bottom:8px}
.cover .sub{color:#93c5fd;font-size:1rem;margin-bottom:24px}
.cover .badge{display:inline-block;padding:8px 24px;border-radius:20px;background:#3b82f6;color:white;font-size:0.9rem;font-weight:700;margin-bottom:8px}
.cover .date{color:#64748b;font-size:0.75rem;margin-top:20px;color:#94a3b8}

.page{padding:24px 28px;page-break-before:always}
.page:first-of-type{page-break-before:auto}
h2{font-size:1.2rem;color:#1e40af;margin-bottom:4px;padding-bottom:6px;border-bottom:2px solid #dbeafe}
h3{font-size:0.95rem;color:#1e3a8a;margin:14px 0 6px}
h4{font-size:0.82rem;color:#374151;margin:10px 0 4px;font-weight:700}

table{width:100%;border-collapse:collapse;font-size:0.75rem;margin:8px 0}
th{text-align:left;padding:6px 8px;background:#1e3a8a;color:white;font-weight:600}
td{padding:6px 8px;border:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
th{border:1px solid #1e40af}

.note{padding:6px 10px;border-radius:5px;font-size:0.72rem;line-height:1.4;margin:6px 0}
.note.blue{background:#eff6ff;color:#1e40af;border-left:3px solid #3b82f6}
.note.yellow{background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b}
.note.red{background:#fef2f2;color:#991b1b;border-left:3px solid #ef4444}
.note.green{background:#f0fdf4;color:#166534;border-left:3px solid #22c55e}

.tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:0.65rem;font-weight:700;color:white}
.tag.r{background:#ef4444}.tag.g{background:#22c55e}.tag.y{background:#f59e0b}.tag.b{background:#3b82f6}.tag.p{background:#8b5cf6}

.flow{display:flex;flex-direction:column;gap:0;margin:8px 0}
.flow-step{display:flex;align-items:flex-start;gap:8px}
.flow-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;color:white;flex-shrink:0}
.flow-line{width:28px;display:flex;justify-content:center;flex-shrink:0}
.flow-line-inner{width:2px;height:16px;background:#cbd5e1}
.flow-body{padding-bottom:4px}
.flow-body strong{font-size:0.8rem}
.flow-body p{font-size:0.7rem;color:#64748b}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:12px}
.card h4{margin-top:0;color:#1e40af}

.mono{font-family:monospace;font-size:0.7rem;background:#f1f5f9;padding:1px 4px;border-radius:3px}
.sep{height:1px;background:#e2e8f0;margin:14px 0}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="badge">QRforPay Internal</div>
  <h1>Business Logic<br>Reference</h1>
  <div class="sub">เอกสารอ้างอิง Business Logic สำหรับทีม<br>ใช้ตรวจสอบเมื่อเกิดความขัดแย้งภายในทีม</div>
  <div class="date">อัปเดต: 21 มีนาคม 2569 (rev 2) · qrforpaytest.vercel.app</div>
</div>

<!-- PAGE 1: OVERVIEW -->
<div class="page">
<h2>1. ภาพรวมระบบ</h2>

<h3>1.1 User Roles</h3>
<table>
<tr><th>Role</th><th>เข้าใช้งานได้</th><th>ข้อจำกัด</th></tr>
<tr><td><strong>super_admin</strong></td><td>ทุกหน้า รวม <span class="mono">/pos/admin</span></td><td>ไม่โดน Paywall / Subscription Guard เลย</td></tr>
<tr><td><strong>owner</strong></td><td><span class="mono">/pos/*</span> ทั้งหมด</td><td>ต้องผ่าน Subscription Guard ทุกครั้ง</td></tr>
<tr><td><strong>cashier</strong></td><td><span class="mono">/pos/sessions</span>, <span class="mono">/pos/orders</span></td><td>เข้า dashboard / settings / products ไม่ได้</td></tr>
<tr><td><strong>null (ไม่มี role)</strong></td><td><span class="mono">/pending</span> เท่านั้น</td><td>รอ admin กำหนด role</td></tr>
</table>

<h3>1.2 ช่องทางสมัครร้าน</h3>
<div class="grid2">
<div class="card">
<h4>🌐 Direct — สมัครเอง</h4>
<table>
<tr><th>ขั้นตอน</th><th>รายละเอียด</th></tr>
<tr><td>สมัคร</td><td>ไม่เสียค่าใช้จ่ายทันที<br><span class="mono">setup_fee_paid = false</span></td></tr>
<tr><td>Trial</td><td>7 วัน นับจาก <strong>สินค้าชิ้นแรก</strong><br>(ไม่ใช่วันสมัคร)</td></tr>
<tr><td>หลัง trial</td><td>จ่าย <strong>฿1,399</strong> ค่าแรกเข้า<br>→ เป็นสมาชิก ฿199/เดือน</td></tr>
</table>
</div>
<div class="card">
<h4>🤝 Referral — ผ่านตัวแทน</h4>
<table>
<tr><th>ขั้นตอน</th><th>รายละเอียด</th></tr>
<tr><td>สมัคร</td><td>ใช้ referral link หรือกรอก agent code<br><span class="mono">setup_fee_paid = true</span></td></tr>
<tr><td>Trial</td><td>7 วัน นับจาก <strong>สินค้าชิ้นแรก</strong><br>(เหมือน direct)</td></tr>
<tr><td>หลัง trial</td><td>จ่าย <strong>฿199/เดือน</strong> ตรงเลย<br>ไม่มีค่าแรกเข้า</td></tr>
</table>
</div>
</div>
<div class="note blue">Trial เริ่มนับจาก <strong>first_product_at</strong> (วันที่เพิ่มสินค้าชิ้นแรก) — ไม่ใช่วันสมัคร ทั้ง direct และ referral</div>
</div>

<!-- PAGE 2: SUBSCRIPTION LIFECYCLE -->
<div class="page">
<h2>2. Subscription Lifecycle (วงจรการสมัครสมาชิก)</h2>

<h3>2.1 Timeline สมาชิกรายเดือน (setup_fee_paid = true, มี subscription_paid_until)</h3>
<table>
<tr><th>ช่วงเวลา</th><th>สถานะ</th><th>UI ที่เห็น</th><th>QR จ่ายใน Settings</th></tr>
<tr><td>เหลือ &gt; 3 วัน</td><td><span class="tag g">ปกติ</span></td><td>Badge เขียว "สมาชิก"</td><td>❌ ไม่มี QR — ยังไม่ถึงเวลา</td></tr>
<tr><td>เหลือ 1–3 วัน</td><td><span class="tag y">ใกล้หมด</span></td><td>Banner เหลือง + ลิงก์ "ชำระเงิน"</td><td>✅ QR ฿199 → ต่อจากวันหมดเดิม</td></tr>
<tr><td>หมดแล้ว 1–7 วัน<br><strong>(Grace Period)</strong></td><td><span class="tag y">Grace</span></td><td>Banner แดง "หมดอายุแล้ว — เหลือ X วัน"<br>ยังใช้งานได้ปกติ</td><td>✅ QR ฿199 → ต่อจากวันหมดเดิม ✓</td></tr>
<tr><td>หมดแล้ว &gt; 7 วัน</td><td><span class="tag r">BLOCKED</span></td><td>Paywall เต็มจอ ฿199 + QR</td><td>✅ QR ฿199 → ต่อจากวันที่จ่าย</td></tr>
</table>

<h3>2.2 Timeline Trial</h3>
<table>
<tr><th>ช่วงเวลา</th><th>สถานะ</th><th>UI ที่เห็น</th><th>QR จ่ายใน Settings</th></tr>
<tr><td>Trial เหลือ &gt; 3 วัน<br><small>(Direct)</small></td><td><span class="tag g">ปกติ</span></td><td>ใช้งานปกติ ไม่มี banner</td><td>✅ ปุ่ม "ชำระก่อนหมด trial?" (ต้องกดเปิด)<br>QR ฿1,399</td></tr>
<tr><td>Trial เหลือ &gt; 3 วัน<br><small>(Referral)</small></td><td><span class="tag g">ปกติ</span></td><td>ใช้งานปกติ ไม่มี banner</td><td>✅ ปุ่ม "ชำระก่อนหมด trial?" (ต้องกดเปิด)<br>QR ฿199</td></tr>
<tr><td>Trial เหลือ 1–3 วัน</td><td><span class="tag y">ใกล้หมด</span></td><td>Banner เหลือง + ลิงก์ "ชำระเงิน"</td><td>✅ QR โชว์เลยโดยไม่ต้องกดเปิด</td></tr>
<tr><td>Trial หมด</td><td><span class="tag r">BLOCKED</span></td><td>Paywall เต็มจอ — <strong>ไม่มี Grace Period</strong></td><td>✅ QR ฿1,399 (direct) / ฿199 (referral)</td></tr>
</table>
<div class="note red">Trial หมด = Block ทันที ทั้ง direct และ referral — ไม่มี grace period เหมือนสมาชิก</div>

<h3>2.3 การคำนวณวันหมดอายุใหม่ (Fair Expiry)</h3>
<table>
<tr><th>จ่ายตอนไหน</th><th>นับต่อจาก</th><th>ตัวอย่าง</th></tr>
<tr><td>ก่อนหมด / วันหมดพอดี</td><td><strong>วันหมดเดิม</strong></td><td>หมด 21 เม.ย. จ่าย 19 เม.ย. → ถึง 21 พ.ค.</td></tr>
<tr><td>หลังหมดแล้ว (ไม่ว่ากี่วัน)</td><td><strong>วันที่จ่าย</strong></td><td>หมด 10 มี.ค. จ่าย 21 มี.ค. → ถึง 21 เม.ย.</td></tr>
</table>
<div class="note blue">สูตร: <strong>max(วันหมดเดิม, วันนี้) + 1 เดือน</strong> — จ่ายช้าเท่าไหร่ก็ได้ผลเท่ากัน ไม่มี paradox / Grace period (1–7 วัน) ยังใช้งานได้อยู่ แต่ไม่ได้วันคืน</div>

<h3>2.4 การคำนวณ 1 เดือนปฏิทิน</h3>
<table>
<tr><th>วันที่จ่าย</th><th>หมดอายุ</th><th>หมายเหตุ</th></tr>
<tr><td>21 มี.ค.</td><td>21 เม.ย.</td><td>ปกติ</td></tr>
<tr><td>30 ม.ค.</td><td>28 ก.พ.</td><td>Clamp = วันสุดท้ายของเดือน</td></tr>
<tr><td>31 ม.ค.</td><td>28 ก.พ.</td><td>Clamp เหมือนกัน</td></tr>
<tr><td>31 มี.ค.</td><td>30 เม.ย.</td><td>Clamp (เม.ย. มีแค่ 30 วัน)</td></tr>
</table>
<div class="note blue">1 เดือน = ปฏิทิน (ไม่ใช่ 30 วันตายตัว) — ถ้าวันไม่มีในเดือนถัดไป ใช้วันสุดท้ายของเดือนนั้น</div>
</div>

<!-- PAGE 3: FORMAT RULES + PAYMENT -->
<div class="page">
<h2>3. Format Rules (กฎการกรอกข้อมูล)</h2>

<table>
<tr><th>ข้อมูล</th><th>กฎ</th><th>ตัวอย่างที่ถูก</th><th>ตัวอย่างที่ผิด</th></tr>
<tr><td><strong>PromptPay</strong></td><td>10 หลัก (มือถือ) หรือ 13 หลัก (นิติบุคคล)<br>ลบ non-digit ก่อนตรวจ</td><td>0812345678<br>1234567890123</td><td>08-1234-5678<br>123456</td></tr>
<tr><td><strong>เบอร์โทร</strong></td><td>10 หลัก ขึ้นต้น 06, 08, หรือ 09</td><td>0812345678<br>0612345678</td><td>0712345678<br>081234567</td></tr>
<tr><td><strong>Password</strong></td><td>≥ 8 ตัวอักษร + มีตัวเลขอย่างน้อย 1 ตัว</td><td>abcd1234<br>myPass9!</td><td>abcdefgh<br>12345678</td></tr>
<tr><td><strong>Cashier username</strong></td><td>เก็บเป็น <span class="mono">username@{shopId8}.cashier</span> ใน Supabase</td><td>ken@35e2c237.cashier</td><td>—</td></tr>
<tr><td><strong>ชื่อร้าน</strong></td><td>2–100 ตัวอักษร (trim)</td><td>ร้านกาแฟสด</td><td>"a" หรือ 200+ ตัว</td></tr>
<tr><td><strong>จำนวนโต๊ะ</strong></td><td>0–999 จำนวนเต็ม</td><td>10</td><td>-1 หรือ 1000</td></tr>
</table>

<div class="sep"></div>
<h2>4. QR Payment Logic</h2>

<h3>4.1 QR Code สร้างจากอะไร</h3>
<div class="note blue">สร้างเอง (ไม่ใช้ library) ตามมาตรฐาน <strong>BOT Thai QR Payment (EMV QR)</strong><br>
AID: A000000677010111 · Currency: 764 (THB) · Checksum: CRC-16 · Phone แปลง 08x → 00668x</div>

<h3>4.2 ค่าบริการ</h3>
<table>
<tr><th>รายการ</th><th>ราคา</th><th>Direct</th><th>Referral (ผ่านตัวแทน)</th></tr>
<tr><td>ค่าแรกเข้า (Setup Fee)</td><td><strong>฿1,399</strong></td><td>✅ จ่ายหลัง trial หมด</td><td>❌ ไม่มี (ตัวแทนออกให้)</td></tr>
<tr><td>ค่ารายเดือน (Monthly)</td><td><strong>฿199</strong></td><td>✅ จ่ายทุกเดือน</td><td>✅ จ่ายทุกเดือน</td></tr>
</table>

<div class="sep"></div>
<h2>5. ข้อตกลงสำคัญ (ห้ามเปลี่ยนโดยไม่หารือทีม)</h2>

<table>
<tr><th>#</th><th>ข้อตกลง</th><th>เหตุผล</th></tr>
<tr><td>1</td><td>Trial เริ่มจาก <strong>first_product_at</strong> ไม่ใช่วันสมัคร</td><td>ยุติธรรม — ร้านยังไม่ได้ใช้จริงถ้ายังไม่มีสินค้า</td></tr>
<tr><td>2</td><td>Grace period 7 วัน เฉพาะ <strong>สมาชิก</strong> เท่านั้น</td><td>Trial คือ grace ในตัวเองอยู่แล้ว</td></tr>
<tr><td>3</td><td>สูตร <strong>max(วันหมดเดิม, วันนี้) + 1 เดือน</strong> — จ่ายก่อนหมด: ต่อจากวันหมดเดิม / จ่ายหลังหมด: ต่อจากวันที่จ่าย</td><td>ยุติธรรม ไม่มี paradox — คนจ่ายช้ากว่าไม่ได้วันมากกว่า</td></tr>
<tr><td>4</td><td>1 เดือน = <strong>ปฏิทิน</strong> + clamp end-of-month</td><td>ยุติธรรมและคาดเดาได้ — วันหมดอายุตรงกันทุกเดือน</td></tr>
<tr><td>5</td><td>super_admin <strong>ไม่โดน Paywall</strong> เลย</td><td>ต้องเข้าได้ตลอดเพื่อจัดการระบบ</td></tr>
<tr><td>6</td><td>วันที่ใช้ <strong>Asia/Bangkok fixed timezone</strong> เสมอ — ใช้ <span class="mono">Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })</span></td><td>ไม่สนว่า owner จะเปิดจากประเทศไหน วันที่คำนวณเป็นเวลาไทยเสมอ รองรับ owner ต่างประเทศได้</td></tr>
</table>

<div class="note yellow" style="margin-top:16px"><strong>⚠️ เอกสารนี้ต้องอัปเดตทุกครั้งที่มีการเปลี่ยน business logic</strong><br>
ถ้าโค้ดขัดแย้งกับเอกสารนี้ → ให้ถือเอกสารนี้เป็นหลักแล้วตรวจโค้ด</div>
</div>

</body>
</html>`

async function generate() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(HTML, { waitUntil: 'networkidle' })
  const outPath = `${REPORTS}/BizLogic-QRforPay.pdf`
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  await browser.close()
  console.log('Done:', outPath)
}

generate().catch(console.error)

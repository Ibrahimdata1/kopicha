import { chromium } from '@playwright/test'
import * as path from 'path'

const REPORTS = path.resolve(__dirname, 'reports')

const HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b;font-size:13px;line-height:1.7}

.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#0f172a,#1e3a8a)}
.cover h1{font-size:2.6rem;color:white;margin-bottom:10px;font-weight:800}
.cover .sub{color:#93c5fd;font-size:1.1rem;margin-bottom:28px}
.cover .badge{display:inline-block;padding:10px 28px;border-radius:20px;background:#3b82f6;color:white;font-size:1rem;font-weight:700;margin-bottom:12px}
.cover .date{color:#94a3b8;font-size:0.8rem;margin-top:24px}
.cover .emoji{font-size:4rem;margin-bottom:16px}

.page{padding:28px 32px;page-break-before:always}
.page:first-of-type{page-break-before:auto}
h2{font-size:1.3rem;color:#1e40af;margin-bottom:6px;padding-bottom:8px;border-bottom:3px solid #dbeafe;display:flex;align-items:center;gap:8px}
h3{font-size:1rem;color:#1e3a8a;margin:16px 0 8px;font-weight:700}
h4{font-size:0.88rem;color:#374151;margin:12px 0 5px;font-weight:700}
p{margin-bottom:8px;font-size:0.88rem;color:#374151}

.step-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:8px 0}
.step-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#3b82f6;color:white;font-weight:800;font-size:0.75rem;margin-right:8px;flex-shrink:0}
.step-row{display:flex;align-items:flex-start;gap:0;margin-bottom:8px}
.step-row:last-child{margin-bottom:0}
.step-text{font-size:0.85rem;color:#1e293b;padding-top:3px}
.step-text strong{color:#1e40af}

.tip{padding:8px 12px;border-radius:8px;font-size:0.8rem;line-height:1.5;margin:8px 0;display:flex;gap:8px;align-items:flex-start}
.tip.blue{background:#eff6ff;color:#1e40af;border-left:4px solid #3b82f6}
.tip.green{background:#f0fdf4;color:#166534;border-left:4px solid #22c55e}
.tip.yellow{background:#fef3c7;color:#92400e;border-left:4px solid #f59e0b}
.tip.red{background:#fef2f2;color:#991b1b;border-left:4px solid #ef4444}
.tip-icon{font-size:1rem;flex-shrink:0;margin-top:1px}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:white}
.card-title{font-weight:700;color:#1e40af;font-size:0.88rem;margin-bottom:6px}
.card p{font-size:0.8rem;color:#475569;margin-bottom:4px}

.role-card{border:2px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:6px 0}
.role-title{font-weight:800;font-size:0.9rem;margin-bottom:4px}
.role-can{font-size:0.78rem;color:#374151}

table{width:100%;border-collapse:collapse;font-size:0.8rem;margin:8px 0}
th{text-align:left;padding:7px 10px;background:#1e3a8a;color:white;font-weight:600}
td{padding:7px 10px;border:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
th{border:1px solid #1e40af}

.plan-box{border-radius:12px;padding:16px;margin:8px 0;text-align:center}
.plan-free{background:#eff6ff;border:2px solid #3b82f6}
.plan-paid{background:#f0fdf4;border:2px solid #22c55e}
.plan-price{font-size:2rem;font-weight:800;color:#1e40af}
.plan-price.green{color:#166534}
.plan-name{font-size:0.9rem;font-weight:700;margin-bottom:8px}
.plan-desc{font-size:0.78rem;color:#64748b}

.sep{height:1px;background:#e2e8f0;margin:16px 0}
.mono{font-family:monospace;background:#f1f5f9;padding:2px 5px;border-radius:3px;font-size:0.75rem}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="emoji">☕</div>
  <div class="badge">คู่มือการใช้งาน</div>
  <h1>QRforPay</h1>
  <div class="sub">ระบบรับออเดอร์ผ่าน QR Code สำหรับร้านอาหารและคาเฟ่<br>สำหรับเจ้าของร้าน (Owner)</div>
  <div class="date">อัปเดต: มีนาคม 2569 · qrforpaytest.vercel.app</div>
</div>

<!-- PAGE 1: เริ่มต้นใช้งาน -->
<div class="page">
<h2>🚀 เริ่มต้นใช้งาน</h2>

<h3>QRforPay คืออะไร?</h3>
<p>QRforPay คือระบบรับออเดอร์ผ่าน QR Code — ลูกค้าสแกน QR ที่โต๊ะแล้วสั่งอาหารได้เลย โดยไม่ต้องรอพนักงาน เจ้าของร้านและพนักงานเห็นออเดอร์แบบ Real-time ทันที</p>

<div class="grid2">
<div class="card">
<div class="card-title">👤 เหมาะกับใคร</div>
<p>✅ ร้านอาหาร</p>
<p>✅ คาเฟ่</p>
<p>✅ ร้านเครื่องดื่ม</p>
<p>✅ ร้านที่มีโต๊ะนั่ง</p>
</div>
<div class="card">
<div class="card-title">📱 ใช้งานได้บน</div>
<p>✅ มือถือ (Android/iPhone)</p>
<p>✅ แท็บเล็ต</p>
<p>✅ คอมพิวเตอร์</p>
<p>✅ ไม่ต้องติดตั้งแอป</p>
</div>
</div>

<h3>ขั้นตอนเริ่มต้น</h3>
<div class="step-box">
<div class="step-row"><div class="step-num">1</div><div class="step-text"><strong>สมัครสมาชิก</strong> — ไปที่ qrforpaytest.vercel.app แล้วกด "สมัครใช้งาน" กรอกชื่อ อีเมล และรหัสผ่าน</div></div>
<div class="step-row"><div class="step-num">2</div><div class="step-text"><strong>ตั้งค่าร้าน</strong> — กรอกชื่อร้าน เบอร์โทร และหมายเลข PromptPay ของร้าน</div></div>
<div class="step-row"><div class="step-num">3</div><div class="step-text"><strong>เพิ่มสินค้า</strong> — ไปที่เมนู "สินค้า" แล้วเพิ่มรายการอาหาร/เครื่องดื่ม พร้อมราคา (การเพิ่มสินค้าชิ้นแรกจะเริ่มนับช่วงทดลองใช้ 7 วัน)</div></div>
<div class="step-row"><div class="step-num">4</div><div class="step-text"><strong>ตั้งจำนวนโต๊ะ</strong> — ไปที่ "การตั้งค่า" ใส่จำนวนโต๊ะในร้าน</div></div>
<div class="step-row"><div class="step-num">5</div><div class="step-text"><strong>พิมพ์ QR Code</strong> — ไปที่ "โต๊ะ" กดโต๊ะที่ต้องการ แล้ว print QR วางที่โต๊ะ</div></div>
<div class="step-row"><div class="step-num">6</div><div class="step-text"><strong>เริ่มรับออเดอร์!</strong> — ลูกค้าสแกน QR → สั่งอาหาร → ออเดอร์เข้าระบบทันที</div></div>
</div>

<div class="tip blue"><div class="tip-icon">💡</div><div>ช่วงทดลองใช้ฟรี 7 วัน นับจากวันที่เพิ่มสินค้าชิ้นแรก — ไม่ใช่วันสมัคร ทดลองได้เต็มที่ก่อน!</div></div>
</div>

<!-- PAGE 2: หน้าต่างๆ -->
<div class="page">
<h2>📋 หน้าต่างๆ ในระบบ</h2>

<h3>🏠 Dashboard — ภาพรวมยอดขาย</h3>
<p>ดูยอดขายวันนี้ สัปดาห์นี้ หรือเดือนนี้ — กราฟแสดงยอดรวม จำนวนออเดอร์ และสินค้าขายดี ใช้วางแผนธุรกิจได้</p>

<h3>🍽️ สินค้า (Products)</h3>
<div class="step-box">
<div class="step-row"><div class="step-num">+</div><div class="step-text"><strong>เพิ่มสินค้า</strong> — ใส่ชื่อ ราคา หมวดหมู่ และรูปภาพ</div></div>
<div class="step-row"><div class="step-num">✏</div><div class="step-text"><strong>แก้ไข</strong> — กดที่สินค้าเพื่อแก้ไขราคาหรือรายละเอียด</div></div>
<div class="step-row"><div class="step-num">🏷</div><div class="step-text"><strong>หมวดหมู่</strong> — จัดกลุ่มสินค้าให้ลูกค้าหาง่ายขึ้น เช่น กาแฟ, ชา, ของว่าง</div></div>
</div>

<h3>🪑 โต๊ะ (Tables)</h3>
<div class="step-box">
<div class="step-row"><div class="step-num">1</div><div class="step-text">กดโต๊ะที่ต้องการเปิด → ระบบสร้าง QR Code ให้อัตโนมัติ</div></div>
<div class="step-row"><div class="step-num">2</div><div class="step-text">พิมพ์ QR วางไว้ที่โต๊ะ หรือแสดงบนมือถือให้ลูกค้าสแกน</div></div>
<div class="step-row"><div class="step-num">3</div><div class="step-text">ดูสถานะโต๊ะ — ว่าง / มีลูกค้า / รอชำระเงิน</div></div>
</div>
<div class="tip green"><div class="tip-icon">✅</div><div>สามารถย้ายโต๊ะได้ถ้าลูกค้าต้องการเปลี่ยนที่นั่ง โดยออเดอร์ทั้งหมดจะย้ายตามไปด้วย</div></div>

<h3>📝 ออเดอร์ (Orders)</h3>
<p>เห็นออเดอร์ทุกรายการแบบ Real-time — กดออเดอร์เพื่อดูรายละเอียด ยืนยัน หรือยกเลิกรายการได้</p>
<table>
<tr><th>สถานะ</th><th>ความหมาย</th></tr>
<tr><td>🟡 รอดำเนินการ</td><td>ลูกค้าสั่งแล้ว รอครัวรับ</td></tr>
<tr><td>🟢 กำลังทำ</td><td>ครัวรับออเดอร์แล้ว</td></tr>
<tr><td>✅ เสร็จแล้ว</td><td>เสิร์ฟให้ลูกค้าแล้ว</td></tr>
<tr><td>❌ ยกเลิก</td><td>ยกเลิกรายการนี้</td></tr>
</table>

<h3>🧾 บิล (Sessions)</h3>
<p>หนึ่งบิล = หนึ่งโต๊ะ — เห็นยอดรวมทั้งโต๊ะ เพิ่มส่วนลดได้ และปิดบิลเมื่อลูกค้าชำระเงิน</p>

<div class="tip yellow"><div class="tip-icon">⚡</div><div>รองรับ 2 โหมดชำระเงิน: <strong>จ่ายที่เคาน์เตอร์</strong> (พนักงานกดยืนยัน) และ <strong>จ่ายเองอัตโนมัติ</strong> (ลูกค้าสแกน QR PromptPay แล้วระบบ confirm เอง)</div></div>
</div>

<!-- PAGE 3: การตั้งค่า + ทีม -->
<div class="page">
<h2>⚙️ การตั้งค่าร้าน</h2>

<h3>ข้อมูลร้าน</h3>
<table>
<tr><th>ข้อมูล</th><th>รายละเอียด</th></tr>
<tr><td>ชื่อร้าน</td><td>ชื่อที่ลูกค้าเห็นในหน้าสั่งอาหาร</td></tr>
<tr><td>หมายเลข PromptPay</td><td>เบอร์มือถือ 10 หลัก หรือเลขนิติบุคคล 13 หลัก — ใช้รับเงินจากลูกค้า</td></tr>
<tr><td>จำนวนโต๊ะ</td><td>ระบบสร้าง QR ให้ตามจำนวน (สูงสุด 999 โต๊ะ)</td></tr>
<tr><td>โหมดชำระเงิน</td><td>เลือกว่าให้ลูกค้าจ่ายเองหรือจ่ายที่เคาน์เตอร์</td></tr>
<tr><td>โลโก้ร้าน</td><td>อัปโหลดรูปโลโก้ (ไม่เกิน 2MB)</td></tr>
</table>

<div class="sep"></div>
<h2>👥 จัดการทีมงาน</h2>

<div class="grid2">
<div class="role-card" style="border-color:#3b82f6">
<div class="role-title" style="color:#1e40af">👤 เจ้าของร้าน (Owner — คุณ)</div>
<div class="role-can">✅ เข้าได้ทุกหน้า<br>✅ เพิ่ม/แก้ไขสินค้า<br>✅ ดูรายงานและยอดขาย<br>✅ เพิ่ม/ลบพนักงาน<br>✅ ตั้งค่าร้านทุกอย่าง</div>
</div>
<div class="role-card" style="border-color:#94a3b8">
<div class="role-title" style="color:#475569">💼 พนักงานแคชเชียร์ (Cashier)</div>
<div class="role-can">✅ ดูและจัดการออเดอร์<br>✅ ดูและปิดบิล<br>❌ แก้ไขสินค้าไม่ได้<br>❌ ดูรายงานไม่ได้<br>❌ เข้าการตั้งค่าไม่ได้</div>
</div>
</div>

<h3>เพิ่มพนักงาน</h3>
<div class="step-box">
<div class="step-row"><div class="step-num">1</div><div class="step-text">ไปที่ <strong>การตั้งค่า → เพิ่มพนักงาน</strong></div></div>
<div class="step-row"><div class="step-num">2</div><div class="step-text">กรอก <strong>ชื่อผู้ใช้</strong> (ภาษาอังกฤษ/ตัวเลข) และ <strong>รหัสผ่าน</strong> (อย่างน้อย 8 ตัว มีตัวเลขด้วย)</div></div>
<div class="step-row"><div class="step-num">3</div><div class="step-text">ระบบสร้าง account ให้ทันที — แจกให้พนักงานใช้ login ด้วย <strong>ชื่อผู้ใช้ + รหัสผ่าน</strong></div></div>
</div>
<div class="tip blue"><div class="tip-icon">🔑</div><div>พนักงาน login ด้วยชื่อผู้ใช้ (ไม่ใช่อีเมล) ที่หน้า login ในช่อง "อีเมล หรือ ชื่อผู้ใช้"</div></div>
<div class="tip yellow"><div class="tip-icon">⚠️</div><div>ถ้าพนักงานลืมรหัสผ่าน — กดปุ่ม "รีเซ็ต PW" ข้างชื่อพนักงาน ระบบจะสร้างรหัสใหม่ให้</div></div>
</div>

<!-- PAGE 4: การชำระเงิน + subscription -->
<div class="page">
<h2>💳 ค่าบริการและการชำระเงิน</h2>

<div class="grid2">
<div class="plan-box plan-free">
<div class="plan-name">🆓 ทดลองใช้ฟรี</div>
<div class="plan-price">7 วัน</div>
<div class="plan-desc">นับจากวันที่เพิ่มสินค้าชิ้นแรก<br>ใช้งานได้ทุกฟีเจอร์</div>
</div>
<div class="plan-box plan-paid">
<div class="plan-name">✅ แพ็กเกจ Basic</div>
<div class="plan-price green">฿199</div>
<div class="plan-desc">ต่อเดือน — หลังชำระค่าแรกเข้า<br>ใช้งานไม่จำกัด</div>
</div>
</div>

<h3>วิธีสมัคร</h3>
<table>
<tr><th>ช่องทาง</th><th>ค่าแรกเข้า</th><th>ค่ารายเดือน</th></tr>
<tr><td>🌐 สมัครเอง (Direct)</td><td>฿1,399 (จ่ายครั้งเดียว)</td><td>฿199/เดือน</td></tr>
<tr><td>🤝 ผ่านตัวแทน (Referral)</td><td>ฟรี (ตัวแทนออกให้)</td><td>฿199/เดือน</td></tr>
</table>

<h3>วิธีชำระเงินค่าบริการ</h3>
<div class="step-box">
<div class="step-row"><div class="step-num">1</div><div class="step-text">ไปที่ <strong>การตั้งค่า → สถานะการใช้งาน</strong></div></div>
<div class="step-row"><div class="step-num">2</div><div class="step-text">กดปุ่ม <strong>"แสดง QR"</strong> — ระบบสร้าง QR PromptPay ให้</div></div>
<div class="step-row"><div class="step-num">3</div><div class="step-text"><strong>สแกน QR</strong> ผ่านแอปธนาคารหรือ True Money Wallet แล้วโอนเงิน</div></div>
<div class="step-row"><div class="step-num">4</div><div class="step-text">ระบบ <strong>อัปเดตอัตโนมัติ</strong> ภายใน 30 วินาที — ไม่ต้องแจ้งใคร!</div></div>
</div>

<div class="tip green"><div class="tip-icon">✅</div><div>ชำระผ่าน PromptPay — ยืนยันอัตโนมัติ ไม่ต้องรอ staff ยืนยันด้วยตนเอง</div></div>

<h3>วันหมดอายุคิดยังไง?</h3>
<table>
<tr><th>จ่ายตอนไหน</th><th>วันหมดอายุใหม่</th><th>ตัวอย่าง</th></tr>
<tr><td>ก่อนหมดอายุ</td><td>ต่อจากวันหมดเดิม</td><td>หมด 30 เม.ย. จ่าย 28 เม.ย. → ถึง 30 พ.ค.</td></tr>
<tr><td>หลังหมดอายุ (ไม่ว่ากี่วัน)</td><td>ต่อจากวันที่จ่าย</td><td>หมด 14 มี.ค. จ่าย 21 มี.ค. → ถึง 21 เม.ย.</td></tr>
</table>

<div class="tip yellow"><div class="tip-icon">⏰</div><div><strong>Grace Period 7 วัน</strong> — หมดอายุแล้วยังใช้งานได้ต่ออีก 7 วัน ระบบแสดง banner แดงเตือน กดจ่ายได้เลยในการตั้งค่า</div></div>
<div class="tip red"><div class="tip-icon">🔴</div><div>เกิน 7 วันหลังหมดอายุ — ระบบล็อคการใช้งาน ต้องชำระก่อนถึงจะกลับมาใช้ได้</div></div>
</div>

<!-- PAGE 5: FAQ -->
<div class="page">
<h2>❓ คำถามที่พบบ่อย</h2>

<h3>การใช้งานทั่วไป</h3>

<h4>Q: ลูกค้าต้องติดตั้งแอปไหม?</h4>
<p>ไม่ต้องครับ — ลูกค้าแค่สแกน QR Code ด้วยกล้องมือถือปกติ ก็เปิดหน้าสั่งอาหารได้เลยในเบราว์เซอร์</p>

<h4>Q: ถ้า QR หมดอายุหรือโต๊ะเปลี่ยนต้องทำอะไร?</h4>
<p>ไปที่หน้า "โต๊ะ" แล้วกดสร้าง session ใหม่ — ระบบจะ generate QR ใหม่ให้ QR เก่าจะใช้งานไม่ได้อัตโนมัติ</p>

<h4>Q: ลูกค้าสั่งแล้วเปลี่ยนใจ ยกเลิกได้ไหม?</h4>
<p>ได้ครับ — เจ้าของร้านหรือพนักงานสามารถยกเลิกรายการในออเดอร์ได้ ระบบคำนวณยอดใหม่ให้อัตโนมัติ</p>

<h4>Q: ถ้าอินเทอร์เน็ตหลุดระหว่างลูกค้าสั่ง?</h4>
<p>ออเดอร์ที่ส่งแล้วจะบันทึกในระบบ — แต่ถ้าหลุดก่อนกด "ยืนยัน" ลูกค้าต้องสั่งใหม่ แนะนำให้ใช้ WiFi ที่เสถียร</p>

<h4>Q: ใช้งานได้กี่โต๊ะ?</h4>
<p>ไม่จำกัดจำนวนโต๊ะ — ตั้งค่าได้สูงสุด 999 โต๊ะต่อร้าน</p>

<div class="sep"></div>
<h3>การชำระเงินของร้าน</h3>

<h4>Q: ลูกค้าโอนเงินให้ร้านผ่านช่องทางไหน?</h4>
<p>ลูกค้าจ่ายผ่าน PromptPay ของร้าน (หมายเลขที่ตั้งค่าไว้) หรือจ่ายเงินสดที่เคาน์เตอร์ ขึ้นอยู่กับโหมดที่เลือก</p>

<h4>Q: ค่าบริการรายเดือนจ่ายยังไง?</h4>
<p>ไปที่การตั้งค่า → กด "แสดง QR" → สแกนโอนเงิน → ระบบอัปเดตอัตโนมัติ ไม่ต้องแจ้งใคร</p>

<h4>Q: ถ้ามีรหัสตัวแทน กรอกตอนไหน?</h4>
<p>กรอกได้ตอนสมัครสมาชิก หรือในหน้า "การตั้งค่า → สถานะการใช้งาน" ก่อนหมดช่วงทดลอง</p>

<div class="sep"></div>
<h3>ติดต่อและช่วยเหลือ</h3>
<div class="tip blue"><div class="tip-icon">📧</div><div>ติดต่อทีมงาน: <strong>contact.runawaytech@gmail.com</strong></div></div>
<div class="tip blue"><div class="tip-icon">🌐</div><div>เว็บไซต์: <strong>qrforpaytest.vercel.app</strong></div></div>
</div>

</body>
</html>`

async function generate() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(HTML, { waitUntil: 'networkidle' })
  const outPath = `${REPORTS}/CustomerGuide-Owner.pdf`
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

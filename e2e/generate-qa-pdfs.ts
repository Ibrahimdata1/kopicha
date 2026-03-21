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
  if (!src) return `<div class="sc missing"><div class="sc-label">MISSING: ${file} — ${label}</div></div>`
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
.sc.missing{border:2px dashed #f87171;background:#fef2f2}
.sc img{width:100%;max-height:220px;object-fit:contain;object-position:top;display:block;background:#f8fafc}
.sc-label{padding:3px 6px;background:#f1f5f9;font-size:0.6rem;color:#475569;text-align:center;border-top:1px solid #e2e8f0;font-weight:500}
.sc-row{display:flex;gap:6px;max-width:480px;margin-left:auto;margin-right:auto}
.sc-row .sc{flex:1;min-width:0;max-width:none}

.note{padding:5px 8px;border-radius:4px;font-size:0.68rem;line-height:1.3;margin:4px 0}
.note.i{background:#eff6ff;color:#1e40af;border-left:2px solid #3b82f6}
.note.w{background:#fef3c7;color:#92400e;border-left:2px solid #f59e0b}
.note.d{background:#fef2f2;color:#991b1b;border-left:2px solid #ef4444}

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

// ═══════════════════════════════════════════════════════════════
// OWNER PDF
// ═══════════════════════════════════════════════════════════════
const CREDS_PAGE = `
<div class="page" style="page-break-before:always">
<h2 style="color:#dc2626;margin-bottom:12px">🔐 Test Credentials — CONFIDENTIAL</h2>
<div class="note d" style="margin-bottom:16px">ห้ามแชร์สาธารณะ — สำหรับทีม QA เท่านั้น</div>

<table>
<tr><th colspan="3" style="background:#1e3a8a;color:white;text-align:center;padding:8px">🌐 URL: qrforpaytest.vercel.app</th></tr>
<tr><th style="width:25%">Role</th><th style="width:37%">Email / Username</th><th style="width:38%">Password</th></tr>
<tr style="background:#fef3c7"><td><strong>Super Admin</strong></td><td><span class="mono">superadmin@admin.com</span></td><td><span class="mono">admin123</span></td></tr>
<tr><td><strong>Owner</strong></td><td><span class="mono">admin@admin.com</span></td><td><span class="mono">admin</span></td></tr>
<tr style="background:#f0fdf4"><td><strong>Cashier</strong></td><td><span class="mono">newken</span></td><td><span class="mono">newken123</span></td></tr>
<tr><td></td><td colspan="2" style="font-size:0.65rem;color:#64748b">ร้าน kennyshop — login ด้วย username ในช่อง "อีเมล หรือ ชื่อผู้ใช้"</td></tr>
</table>

<div style="margin-top:16px">
<h4 style="color:#1e40af;margin-bottom:8px">🤝 Agent (ตัวแทนขาย)</h4>
<table>
<tr><th>Agent Code</th><th>Referral Link (สมัครร้านผ่านตัวแทน)</th></tr>
<tr><td><span class="mono" style="font-size:0.9rem;letter-spacing:2px">AG-TEST-0001</span></td><td><span class="mono">qrforpaytest.vercel.app/register?ref=AG-TEST-0001</span></td></tr>
<tr style="background:#fafafa"><td><span class="mono" style="font-size:0.9rem;letter-spacing:2px">AG-KEN-V9IT</span></td><td><span class="mono">qrforpaytest.vercel.app/register?ref=AG-KEN-V9IT</span></td></tr>
</table>
<div class="note i" style="margin-top:8px">ร้านที่สมัครผ่าน referral link → setup_fee_paid=true → trial 7 วัน (นับจากสินค้าชิ้นแรก) → จ่าย ฿199/เดือน</div>
</div>

<div style="margin-top:16px">
<h4 style="color:#1e40af;margin-bottom:6px">📋 Role Access Summary</h4>
<table>
<tr><th>Role</th><th>หน้าที่เข้าได้</th></tr>
<tr><td>Super Admin</td><td>/pos/admin, /pos/dashboard, /pos/settings, /pos/products, /pos/sessions, /pos/orders, /pos/tables</td></tr>
<tr><td>Owner</td><td>/pos/* ทุกหน้า</td></tr>
<tr><td>Cashier</td><td>/pos/sessions, /pos/orders เท่านั้น</td></tr>
</table>
</div>
</div>
`

function ownerQA(): string {
  const c = '#2563eb'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Owner (เจ้าของร้าน)</div><div class="sub">QRforPay POS — S-01, S-03, S-04, S-12</div><div class="date">Generated 21/03/2026 (CE) | QA — verified from source code</div></div>
${CREDS_PAGE}

<!-- ═══ S-01 Registration ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Owner สมัครร้านใหม่</h2>
<div class="desc">เจ้าของร้านอาหารเปิดใช้ QRforPay ครั้งแรก — ลงทะเบียน + Login + Paywall</div>
<div class="pre">Precondition: ยังไม่มี account ในระบบ</div>

${S('1', c, 'เปิดหน้าเว็บ (Landing Page)', 'Nav bar มี 2 ปุ่ม: "เข้าสู่ระบบ" + "สมัครเลย" — ไม่มีลิงก์ "ตัวแทนขาย" ใน nav (มีแค่ section ล่างสุดของ landing)')}
${sc('S01-1-landing.png', 'Landing Page — nav: เข้าสู่ระบบ + สมัครเลย')}
${sc2('S01-01-landing-features.png', 'Features section', 'S01-01-landing-pricing.png', 'Pricing section')}

<div class="note i">Landing page มี section "สนใจเป็นตัวแทนขาย" ข้างล่างสุด พร้อมลิงก์ไป /register (เปลี่ยน tab เป็น agent mode)</div>
</div>

<div class="page">
${S('2', c, 'กด "สมัครเลย" → หน้า /register', 'แสดง Mode Selector 2 tabs: "สมัครร้านค้า" (default) / "สมัครตัวแทนขาย"')}
${sc('S01-2-register-step1.png', 'Register — Mode Selector + Step 1/2')}

<div class="note i">Mode selector tabs:<br>
- <strong>สมัครร้านค้า</strong> (Store icon) — สำหรับเจ้าของร้าน<br>
- <strong>สมัครตัวแทนขาย</strong> (Handshake icon) — สำหรับ agent (ไม่ต้อง login, ได้รหัส AG-xxx)</div>

${S('3', c, 'กรอก Step 1/2: ข้อมูลบัญชี', 'กรอก ชื่อ-นามสกุล + อีเมล + รหัสผ่าน → กด "ถัดไป"')}
${sc2('S01-02-register-step1-empty.png', 'Step 1 ว่าง', 'S01-02-register-step1-filled.png', 'Step 1 กรอกแล้ว')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation Rules — Step 1 (ข้อมูลบัญชี)</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อ-นามสกุล</strong></td><td>Required, trim(), min 2, max 100 ตัวอักษร</td><td>
"กรุณากรอกชื่อ-นามสกุล" (ว่าง/whitespace)<br>
"ชื่อสั้นเกินไป" (&lt;2 หลัง trim)<br>
"ชื่อยาวเกินไป" (&gt;100)</td></tr>
<tr><td><strong>อีเมล</strong></td><td>Required, trim(), regex: <span class="mono">/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/</span></td><td>
"กรุณากรอกอีเมล" (ว่าง)<br>
"รูปแบบอีเมลไม่ถูกต้อง" (regex fail)</td></tr>
<tr><td><strong>รหัสผ่าน</strong></td><td>Min 8 ตัวอักษร + ต้องมีตัวเลขอย่างน้อย 1 ตัว (regex <span class="mono">/[0-9]/</span>)<br>
ภาษาไทย + อักขระพิเศษใช้ได้ แค่ตัวอักษรล้วนไม่ผ่าน</td><td>
"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" (&lt;8)<br>
"รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" (ไม่มี digit)</td></tr>
</table>
${sc('S01-04-register-validation.png', 'Validation error ตัวอย่าง')}
</div>

<div class="page">
${S('4', c, 'กรอก Step 2/2: ข้อมูลร้านค้า', 'กรอก ชื่อร้านค้า + PromptPay ID → กด "สมัครสมาชิก"')}
${sc2('S01-03-register-step2-empty.png', 'Step 2 ว่าง', 'S01-03-register-step2-filled.png', 'Step 2 กรอกแล้ว')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation Rules — Step 2 (ข้อมูลร้านค้า)</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อร้านค้า</strong></td><td>Required, trim(), 2-100 ตัวอักษร</td><td>
"กรุณากรอกชื่อร้าน" (ว่าง)<br>
"ชื่อร้านต้องมี 2-100 ตัวอักษร" (len &lt;2 หรือ &gt;100)</td></tr>
<tr><td><strong>PromptPay ID</strong></td><td>Required, trim(), ลบ non-digit (<span class="mono">replace(/\\D/g, '')</span>) แล้วนับ<br>
ต้องเป็น 10 หลัก (เบอร์โทร) หรือ 13 หลัก (นิติบุคคล)<br>
ใส่ขีด "-" ได้ ระบบลบให้อัตโนมัติ</td><td>
"กรุณากรอกหมายเลข PromptPay" (ว่าง)<br>
"PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Referral Code Handling</h4>
<table>
<tr><th>กรณี</th><th>ผลลัพธ์</th></tr>
<tr><td>URL มี <span class="mono">?ref=CODE</span></td><td>แสดง banner: "รหัสตัวแทน: <strong>CODE</strong> — ไม่ต้องเสียค่าแรกเข้า ฿1,399"<br>ส่ง <span class="mono">p_referral_code</span> ไป RPC</td></tr>
<tr><td>URL ไม่มี <span class="mono">?ref</span></td><td>ไม่แสดง banner, ส่ง <span class="mono">p_referral_code: null</span></td></tr>
</table>
<div class="note w">Referral code จาก URL (?ref=CODE) ถูกส่งไปที่ self_register_shop RPC — ถ้า code ถูกต้อง shop.setup_fee_paid = true ทันที ไม่ต้องจ่าย ฿1,399</div>
</div>

<div class="page">
${S('5', c, 'ระบบสร้าง account + ร้าน', 'supabase.auth.signUp() → self_register_shop RPC → สร้าง shop + profile ทันที')}
${S('6', c, 'Redirect หลังสมัคร', 'สมัครสำเร็จ → redirect ไป /pos/sessions ทันที')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Registration Flow (Code Path)</h4>
<table>
<tr><th>Step</th><th>Code</th><th>ผลลัพธ์</th></tr>
<tr><td>1</td><td><span class="mono">supabase.auth.signUp({ email, password })</span></td><td>สร้าง auth user</td></tr>
<tr><td>2</td><td><span class="mono">supabase.rpc('self_register_shop', { p_shop_name, p_promptpay, p_referral_code })</span></td><td>สร้าง shop + profile (role=owner)</td></tr>
<tr><td>3</td><td><span class="mono">router.push('/pos/sessions')</span></td><td>เข้าหน้าบิลทันที</td></tr>
</table>

<div class="note i">ถ้า RPC คืน error → แสดง error message บนหน้าจอ (ไม่ redirect)</div>

${S('7', c, 'Login เข้าระบบ', 'กรอก อีเมล หรือ ชื่อผู้ใช้ + password → กด "เข้าสู่ระบบ"')}
${sc2('S01-05-login-page.png', 'หน้า Login', 'S01-05-login-filled.png', 'Login กรอกแล้ว')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Login Input — 2 รูปแบบ</h4>
<table>
<tr><th>กรอก</th><th>ตัวอย่าง</th><th>ระบบทำอะไร</th></tr>
<tr><td><strong>อีเมล</strong> (มี @)</td><td>john@gmail.com</td><td>ใช้ email ตรงๆ กับ Supabase auth</td></tr>
<tr><td><strong>Username</strong> (ไม่มี @)</td><td>cashier01</td><td>เรียก <span class="mono">POST /api/resolve-username</span> → ค้นหา fake email (<span class="mono">cashier01@xxx.cashier</span>) จาก profiles table → ใช้ email นั้น login</td></tr>
</table>
<div class="note i">ข้อความใต้ input: "เจ้าของร้านใช้อีเมล / พนักงานใช้ชื่อผู้ใช้"</div>
<div class="note i">API <span class="mono">/api/resolve-username</span> ใช้ Service Role Key (server-side only) ค้นเฉพาะ email ที่ลงท้าย .cashier — ปลอดภัย ไม่ expose ข้อมูลอื่น</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Google Login (OAuth)</h4>
<table>
<tr><th>กรณี</th><th>ผลลัพธ์</th></tr>
<tr><td><strong>สมัครใหม่ด้วย Google</strong><br>(ยังไม่มี account)</td><td>กดปุ่ม "เข้าสู่ระบบด้วย Google" → Supabase สร้าง user อัตโนมัติ → role = null → redirect ไป <span class="mono">/register/shop</span> กรอกชื่อร้าน + PromptPay → self_register_shop RPC → เข้า POS ได้เลย</td></tr>
<tr><td><strong>Login ด้วย Google</strong><br>(เคยสมัครแล้ว)</td><td>กด Google → เข้า POS ได้ทันที (ตาม role redirect logic ด้านล่าง)</td></tr>
<tr><td><strong>Cashier ใช้ Google ไม่ได้</strong></td><td>Cashier ไม่มี Google account ผูกกับระบบ (ใช้ fake email) → ต้อง login ด้วย username + password เท่านั้น</td></tr>
</table>
<div class="note w">ข้อความใต้ปุ่ม Google: "สมัครใหม่หรือเข้าสู่ระบบด้วย Google ได้เลย (เฉพาะเจ้าของร้าน)"</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Login Redirect Logic (จาก /login/page.tsx)</h4>
<table>
<tr><th>Condition</th><th>Redirect ไป</th></tr>
<tr><td><span class="mono">!profile?.role</span> (role = null)</td><td><span class="mono">/pending</span></td></tr>
<tr><td><span class="mono">profile.role === 'super_admin'</span></td><td><span class="mono">/pos/admin</span></td></tr>
<tr><td><span class="mono">profile.role</span> มีค่าอื่น (owner, cashier)</td><td><span class="mono">/pos/sessions</span></td></tr>
<tr><td>Login ผิด (Invalid login credentials)</td><td>แสดง "อีเมลหรือรหัสผ่านไม่ถูกต้อง"</td></tr>
<tr><td>Username ไม่พบ (resolve-username 404)</td><td>แสดง "ไม่พบชื่อผู้ใช้นี้ในระบบ"</td></tr>
</table>
${sc2('S01-05-login-error.png', 'Login error', 'S01-8-after-login.png', 'หลัง Login สำเร็จ → /pos/sessions')}
</div>

<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Pending Page (/pending)</h2>
<div class="desc">หน้านี้แสดงเมื่อ user มี role = null — แยก 2 กรณี</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Pending Page Logic (จาก /pending/page.tsx)</h4>
<table>
<tr><th>Condition</th><th>Action</th><th>UI</th></tr>
<tr><td><span class="mono">profile.pending_shop_name</span> มีค่า</td><td><strong>Redirect ไป /register/shop ทันที</strong><br>ให้ user กรอกข้อมูลร้านต่อ (ชื่อร้าน + PromptPay)</td><td>ไม่แสดงหน้า pending — พาไปกรอกต่อเลย<br>(เหมือน Stripe/Shopify onboarding ที่ไม่เสร็จ)</td></tr>
<tr><td><span class="mono">!profile.pending_shop_name</span> (null)</td><td><strong>แสดงหน้า "บัญชีถูกระงับ"</strong></td><td>ShieldOff icon สีแดง + "ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน" + ปุ่มติดต่อผู้ดูแลระบบ (mailto: contact.runawaytech@gmail.com) + ปุ่ม "ออกจากระบบ"</td></tr>
</table>

${sc2('S01-09-register-shop.png', 'กรอกร้านไม่เสร็จ → redirect มาหน้านี้อัตโนมัติ', 'S01-06-pending-page.png', 'บัญชีถูกระงับ (ถูก admin ลบร้าน)')}

<div class="note i">กรณี pending_shop_name มีค่า = user สมัครผ่าน Google แล้วปิดก่อนกรอกร้าน → ระบบพากลับไปกรอกต่อที่ /register/shop อัตโนมัติ</div>
<div class="note d">กรณีถูกระงับ: admin กด "กู้คืน" → role กลับเป็น owner/cashier → user login ใหม่เข้า POS ได้ปกติ</div>
</div>

<div class="page">
<h2><span class="num" style="background:${c}">S-01</span> Subscription / Paywall (SubscriptionGuard)</h2>
<div class="desc">ระบบ Paywall ตรวจสอบสถานะ trial + subscription ทุกครั้งที่เข้าหน้า POS</div>
${sc('S01-07-paywall-setupfee.png', 'Paywall — ค่าแรกเข้า ฿1,399 (direct user หมด trial)')}

<div class="note i"><strong>2 ประเภทผู้ใช้:</strong><br>
<strong>Direct user</strong> (setup_fee_paid=false): สมัครผ่านเว็บโดยตรง — trial 7 วันฟรี → ต้องจ่าย ฿1,399 เมื่อหมด<br>
<strong>Referral user</strong> (setup_fee_paid=true, subscription_paid_until=null): สมัครผ่านตัวแทน — trial 7 วันฟรีเช่นกัน → ต้องจ่าย ฿199/เดือน เมื่อหมด<br>
<strong>ทั้งคู่:</strong> trial เริ่มนับจาก <span class="mono">first_product_at</span> (สินค้าชิ้นแรก) ไม่ใช่วันสมัคร</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Direct User (setup_fee_paid=false) — ต้องจ่าย ฿1,399 เมื่อหมด trial</h4>
<table>
<tr><th>สถานะ</th><th>Condition (code)</th><th>ผลลัพธ์</th></tr>
<tr><td>ร้านถูกลบ</td><td><span class="mono">shop.is_deleted === true</span></td><td><span class="tag r">BLOCKED</span> "ร้านค้าถูกระงับ" + mailto</td></tr>
<tr><td>ยังไม่มีสินค้า</td><td><span class="mono">!first_product_at</span></td><td><span class="tag g">OK</span> ใช้ได้ไม่จำกัด trial ยังไม่เริ่ม</td></tr>
<tr><td>Trial เหลือ 4-7 วัน</td><td><span class="mono">!setupFeePaid && !subDate && trialDaysLeft &gt;= 4</span></td><td><span class="tag g">OK</span> ใช้งานปกติ ไม่แสดงอะไร</td></tr>
<tr><td>Trial เหลือ 1-3 วัน</td><td><span class="mono">!setupFeePaid && !subDate && trialDaysLeft 1-3</span></td><td><span class="tag y">Banner</span> "ทดลองใช้ฟรีเหลืออีก X วัน — หลังจากนั้นต้องชำระ ฿1,399"</td></tr>
<tr><td>Trial หมดแล้ว</td><td><span class="mono">trialExpiredNaturally</span></td><td><span class="tag r">BLOCKED</span> Paywall ฿1,399 ทันที — ไม่มี grace period</td></tr>
<tr><td>Admin ยืด trial — เหลือ 0-2 วัน</td><td><span class="mono">!setupFeePaid && subDate && daysUntilExpiry 0-2</span></td><td><span class="tag y">Banner</span> "การทดลองใช้ฟรีจะหมดในอีก X วัน / หมดอายุวันนี้"</td></tr>
<tr><td>Admin ยืด trial — หมดแล้ว</td><td><span class="mono">trialExpiredByExtension</span></td><td><span class="tag r">BLOCKED</span> Paywall ฿1,399 ทันที</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Referral User (setup_fee_paid=true, subscription_paid_until=null) — trial 7 วัน → ฿199/เดือน</h4>
<table>
<tr><th>สถานะ</th><th>Condition (code)</th><th>ผลลัพธ์</th></tr>
<tr><td>ยังไม่มีสินค้า</td><td><span class="mono">setupFeePaid && !subDate && !first_product_at</span></td><td><span class="tag g">OK</span> Settings แสดง "เพิ่มสินค้าชิ้นแรกเพื่อเริ่มนับ trial 7 วัน"</td></tr>
<tr><td>Trial เหลือ 4-7 วัน</td><td><span class="mono">setupFeePaid && !subDate && paidTrialDaysLeft &gt;= 4</span></td><td><span class="tag g">OK</span> Settings มีปุ่ม "จ่ายก่อนหมด trial?" (collapsible) QR ฿199</td></tr>
<tr><td>Trial เหลือ 1-3 วัน</td><td><span class="mono">paidTrialDaysLeft 1-3</span></td><td><span class="tag y">Banner</span> "ระยะทดลองใช้จะหมดในอีก X วัน — ฿199" + Settings แสดง QR ฿199</td></tr>
<tr><td>Trial หมดแล้ว</td><td><span class="mono">paidTrialExpired</span></td><td><span class="tag r">BLOCKED</span> Paywall ฿199 ทันที — ไม่มี grace period</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Paid User (setup_fee_paid=true, subscription_paid_until set) — ต่ออายุ ฿199/เดือน</h4>
<table>
<tr><th>สถานะ</th><th>Condition (code)</th><th>ผลลัพธ์</th></tr>
<tr><td>Active เหลือ &gt; 3 วัน</td><td><span class="mono">setupFeePaid && daysOverdue === 0 && daysUntilExpiry &gt; 3</span></td><td><span class="tag g">OK</span> ใช้งานปกติ badge สีเขียว</td></tr>
<tr><td>เหลือ 0-3 วัน</td><td><span class="mono">paidNearExpiry: daysUntilExpiry &lt;= 3</span></td><td><span class="tag y">Banner</span> "จะหมดในอีก X วัน — ฿199" + Settings แสดง QR ฿199</td></tr>
<tr><td>Grace period (หมดแล้ว 1-7 วัน)</td><td><span class="mono">inGrace: daysOverdue &gt;= 1 &amp;&amp; daysOverdue &lt;= 7</span></td><td><span class="tag y">Banner แดง</span> "หมดอายุแล้ว — ชำระภายใน X วันก่อนถูกระงับ" แต่ยังใช้งานได้ปกติ</td></tr>
<tr><td>หมดอายุเกิน 7 วัน</td><td><span class="mono">isBlocked: setupFeePaid && daysOverdue &gt; 7</span></td><td><span class="tag r">BLOCKED</span> Paywall ฿199 — จ่ายแล้วต่อจากวันที่จ่าย (ไม่ใช่ original)</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">คำนวณวันต่ออายุ — calcFairExpiry (ยุติธรรม ไม่เสียวัน)</h4>
<table>
<tr><th>กรณี</th><th>Logic</th><th>ตัวอย่าง (จ่ายวันที่ 5 มี.ค.)</th></tr>
<tr><td>Direct/Referral — trial ยังไม่หมด</td><td><span class="mono">max(trialEnd, today) + 1 month = trialEnd + 1 month</span></td><td>trial หมด 8 มี.ค. → จ่าย 5 มี.ค. → หมดอายุ 8 เม.ย. ✓</td></tr>
<tr><td>Direct/Referral — trial หมดแล้ว</td><td><span class="mono">max(trialEnd, today) + 1 month = today + 1 month</span></td><td>จ่าย 5 มี.ค. → หมดอายุ 5 เม.ย.</td></tr>
<tr><td>Paid user จ่ายหลังหมด (ไม่ว่ากี่วัน)</td><td><span class="mono">today + 1 month</span></td><td>หมดอายุ 10 มี.ค. → จ่าย 21 มี.ค. (ช้า 11 วัน) → ต่อถึง 21 เม.ย.</td></tr>
</table>
<div class="note i">สูตร: <strong>max(วันหมดเดิม, วันนี้) + 1 เดือน</strong> — จ่ายก่อนหมด: ต่อจากวันหมดเดิม / จ่ายหลังหมด: ต่อจากวันที่จ่ายเสมอ (ไม่ว่าช้ากี่วัน) · Grace period 7 วัน ยังใช้งานได้แต่ไม่ได้วันคืน</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Timing — Referral/Paid user trial หมด 17/03</h4>
<table>
<tr><th>วัน</th><th>ตัวอย่าง</th><th>สถานะ</th><th>ถ้าจ่ายวันนี้</th></tr>
<tr><td>-3 วัน</td><td>14/03</td><td>🟡 Banner "เหลืออีก 3 วัน — ฿199"</td><td>หมดอายุใหม่: 17/04</td></tr>
<tr><td>-1 วัน</td><td>16/03</td><td>🟡 Banner "เหลืออีก 1 วัน — ฿199"</td><td>หมดอายุใหม่: 17/04</td></tr>
<tr><td>วันหมด</td><td>17/03</td><td>🟡 Banner "หมดอายุวันนี้ — ฿199"</td><td>หมดอายุใหม่: 17/04</td></tr>
<tr><td>+1 วัน</td><td>18/03</td><td>❌ BLOCKED Paywall ฿199 ทันที</td><td>หมดอายุใหม่: 18/04</td></tr>
<tr><td>+11 วัน</td><td>28/03</td><td>❌ BLOCKED Paywall ฿199</td><td>หมดอายุใหม่: 28/04</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Paywall — Direct User (฿1,399)</h4>
<table>
<tr><th>Element</th><th>Detail</th></tr>
<tr><td>Icon / Title</td><td>🕐 Clock / "หมดระยะทดลองใช้ฟรี"</td></tr>
<tr><td>QR Code</td><td>PromptPay QR ฿1,399 (company PromptPay via get_company_promptpay RPC)</td></tr>
<tr><td>Button</td><td>"แสดง QR ฿1,399" → Omise PromptPay QR → webhook auto-confirm → setup_fee_paid=true + subscription_paid_until = calcNewExpiry</td></tr>
<tr><td>Referral field</td><td>ใส่รหัสตัวแทน + ✓ → setup_fee_paid=true, referral_code=CODE, subscription_paid_until = calcNewExpiry</td></tr>
<tr><td>Referral validation</td><td>agents table: code + active=true — Error: "กรุณากรอกรหัสตัวแทน" / "รหัสตัวแทนไม่ถูกต้อง"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Paywall — Referral/Paid User (฿199)</h4>
<table>
<tr><th>Element</th><th>Detail</th></tr>
<tr><td>Icon / Title</td><td>⚠️ AlertTriangle / "หมดระยะทดลองใช้แล้ว"</td></tr>
<tr><td>Package info</td><td>shop.name + "Pro (รายเดือน)" + วันหมดอายุ (trial expired: แสดงวัน trial หมด)</td></tr>
<tr><td>QR Code</td><td>PromptPay QR ฿199</td></tr>
<tr><td>Button</td><td>"ชำระแล้ว" → subscription_paid_until = calcNewExpiry</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Constants</h4>
<table>
<tr><th>Constant</th><th>Value</th></tr>
<tr><td><span class="mono">TRIAL_DAYS</span></td><td>7 (นับจาก first_product_at ทั้ง direct และ referral user)</td></tr>
<tr><td><span class="mono">SETUP_FEE</span></td><td>฿1,399 (direct user สมัครผ่านเว็บ)</td></tr>
<tr><td><span class="mono">MONTHLY_FEE</span></td><td>฿199 (referral user + paid member รายเดือน)</td></tr>
</table>
</div>

<!-- ═══ S-03 Settings ═══ -->
<div class="page">
<h2><span class="num" style="background:#7c3aed">S-03</span> Owner ตั้งค่าร้าน + เพิ่มพนักงาน</h2>
<div class="pre">Precondition: Owner login แล้ว, อยู่ที่แท็บ "ตั้งค่า"</div>

${S('1', '#7c3aed', 'Subscription Status Box (ด้านบนสุดของหน้า Settings)', 'แสดงสถานะ trial / paid / expired — เฉพาะ Owner เท่านั้น')}
${sc('S03-1-settings-top.png', 'Settings — Subscription status box ด้านบน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Subscription Status Display (จาก settings/page.tsx)</h4>
<div class="note i"><strong>หลักการ:</strong> setup_fee_paid=false = Direct / setup_fee_paid=true = Referral หรือ Paid — trial ทั้งคู่นับจาก first_product_at</div>
<table>
<tr><th>Condition</th><th>แสดงผล</th><th>Border สี</th></tr>
<tr><td>Direct: <span class="mono">!subDate && !setup_fee_paid && !first_product_at</span></td><td>"ทดลองใช้ฟรี 7 วัน — เริ่มนับหลังสร้างสินค้าชิ้นแรก"</td><td>Green</td></tr>
<tr><td>Referral: <span class="mono">setup_fee_paid && !subDate && !first_product_at</span></td><td>"เพิ่มสินค้าชิ้นแรกเพื่อเริ่มนับระยะทดลองใช้ 7 วัน"</td><td>Green</td></tr>
<tr><td>Direct trial active: <span class="mono">isInTrial</span></td><td>"ทดลองใช้ฟรี" + "หมดอายุ {date th-TH} (เหลือ X วัน)"</td><td>Amber</td></tr>
<tr><td>Referral trial active: <span class="mono">isPaidTrial && !isPaidTrialExpired</span></td><td>"ทดลองใช้ฟรี (สมาชิก)" + "หมดอายุ {date} (เหลือ X วัน)" + ปุ่ม "จ่ายก่อน?"</td><td>Green/Amber</td></tr>
<tr><td>Referral/Paid near expiry/expired</td><td>"แสดง QR ฿199" → Omise PromptPay QR → webhook auto-confirm → subscription_paid_until = calcNewExpiry</td><td>Amber/Red</td></tr>
<tr><td>Paid active: <span class="mono">subDate && !subExpired && setup_fee_paid</span></td><td>"สมาชิก" + "ถึง {date}" + badge วันที่เหลือ</td><td>Green</td></tr>
<tr><td>Direct early pay: <span class="mono">!setup_fee_paid</span></td><td>ปุ่ม "ต้องการชำระก่อนหมด trial?" (collapsible) → QR ฿1,399</td><td>-</td></tr>
</table>
<div class="note w">ปุ่ม "ต่ออายุ" ใช้ calcFairExpiry — สูตร max(วันหมดเดิม, วันนี้) + 1 เดือน: จ่ายก่อนหมด → ต่อจาก trialEnd / จ่ายหลังหมด → ต่อจาก today เสมอ</div>
<div class="note i">Grace period 7 วัน — ยังใช้ได้ระหว่าง grace แต่แสดง banner แดง</div>
</div>

<div class="page">
${S('2', '#7c3aed', 'Shop Settings — ข้อมูลร้านค้า', 'โลโก้ + ชื่อร้าน + PromptPay + จำนวนโต๊ะ + โหมดชำระเงิน')}
${sc('S03-1-settings-top.png', 'Shop settings form')}
${sc('S03-2-settings-payment-mode.png', 'Payment mode selector: จ่ายที่เคาน์เตอร์ / จ่ายเองอัตโนมัติ')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation Rules — Shop Settings</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อร้าน</strong></td><td>Required, trim(), min 2, max 100</td><td>"ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร"<br>"ชื่อร้านยาวเกินไป"</td></tr>
<tr><td><strong>PromptPay</strong></td><td>Required, 10 or 13 digits (after removing non-digit)</td><td>"กรุณากรอกหมายเลข PromptPay"<br>"PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก"</td></tr>
<tr><td><strong>จำนวนโต๊ะ</strong></td><td>Integer, 0-999 (default 0 if empty)<br>❌ ติดลบไม่ได้ (blocked ที่ keyboard + onChange)</td><td>"จำนวนโต๊ะต้องเป็นตัวเลข 0-999"</td></tr>
<tr><td><strong>โลโก้ร้าน</strong></td><td>Image file only, max 2MB, owner only</td><td>"กรุณาเลือกไฟล์รูปภาพ" (not image)<br>"ขนาดไฟล์ต้องไม่เกิน 2MB"</td></tr>
<tr><td><strong>โหมดชำระเงิน</strong></td><td>"จ่ายที่เคาน์เตอร์" (counter) or "จ่ายเองอัตโนมัติ" (auto)</td><td>No error (toggle)</td></tr>
</table>

${sc('S03-3-settings-account.png', 'Account info section')}
</div>

<div class="page">
${S('3', '#7c3aed', 'Team Management + Add Cashier', 'เห็นสมาชิกทั้งหมด + ฟอร์มเพิ่ม Cashier')}
${sc2('S03-4-settings-team.png', 'ทีมงาน — list of members', 'S03-5-settings-addcashier.png', 'ฟอร์มเพิ่มพนักงาน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — เพิ่มพนักงาน (Cashier)</h4>
<div class="note i">ฟอร์มมีเพียง 2 field: <strong>Username</strong> + <strong>Password</strong> — ไม่มีชื่อ-นามสกุล</div>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อผู้ใช้ (Username)</strong></td><td>Required, 3-30 ตัว<br>
✅ เฉพาะ a-z, 0-9, _ เท่านั้น<br>
❌ พิมพ์ตัวอักษรอื่นไม่ได้ (auto-strip)<br>
❌ ภาษาไทย/อักษรพิเศษพิมพ์ไม่ได้<br>
auto-lowercase<br>
maxLength=30<br>
regex: <span class="mono">/^[a-z0-9_]{3,30}$/</span></td><td>"ชื่อผู้ใช้ต้องมี 3-30 ตัว (a-z, 0-9, _ เท่านั้น)"</td></tr>
<tr><td><strong>รหัสผ่าน</strong></td><td>Min 8 ตัว + ต้องมีตัวเลข 1 ตัว<br>maxLength=100</td><td>"รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"<br>"รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Cashier Account ภายใน</h4>
<table>
<tr><th>รายการ</th><th>รายละเอียด</th></tr>
<tr><td>Email จริงใน Supabase</td><td><span class="mono">{username}@{shopId.slice(0,8)}.cashier</span> (auto-generate ไม่แสดงให้ user เห็น)</td></tr>
<tr><td>Login ด้วย</td><td><strong>Username + Password</strong> ที่หน้า /login<br>กรอก username ในช่อง "อีเมล หรือ ชื่อผู้ใช้" → ระบบ resolve เป็น fake email ผ่าน <span class="mono">POST /api/resolve-username</span> อัตโนมัติ</td></tr>
<tr><td>สร้างสำเร็จ</td><td>แสดง <strong>Credential Card</strong> (กล่องสีเหลือง) — Username + Password พร้อมปุ่ม Copy แต่ละช่อง — <strong>แสดงครั้งเดียวเท่านั้น</strong></td></tr>
<tr><td>ดู Username ภายหลัง</td><td>ในรายชื่อทีม แสดง @username (ตัดส่วน @xxx.cashier ออก)</td></tr>
<tr><td>ดู Password ภายหลัง</td><td>❌ ดูไม่ได้ — ให้กด <strong>"รีเซ็ต PW"</strong> เพื่อ generate รหัสใหม่ + แสดง Credential Card</td></tr>
<tr><td>รีเซ็ต Password</td><td>Owner กดปุ่ม "รีเซ็ต PW" → confirm → POST /api/reset-cashier-password → แสดง Credential Card ใหม่</td></tr>
<tr><td>Role Icon ในรายชื่อทีม</td><td>🛡️ ShieldAlert (super_admin / สีม่วง), ShieldCheck (owner / สีฟ้า), User (cashier / สีเทา)</td></tr>
<tr><td>Badge "คุณ"</td><td>แสดงบน row ของ user ที่ login อยู่ — ไม่มีปุ่มลบตัวเอง</td></tr>
<tr><td>Google Login</td><td>❌ ใช้ไม่ได้ — Cashier ไม่มี Google account ผูกกับระบบ</td></tr>
</table>

<div class="note w">รหัสผ่านแสดงเพียงครั้งเดียวตอนสร้าง — ถ้าลืมให้กด "รีเซ็ต PW" เพื่อ generate ใหม่</div>
<div class="note i">กดบันทึก Shop Settings สำเร็จ → ปุ่มเปลี่ยนเป็นสีเขียว "บันทึกแล้ว ✓" เป็นเวลา 3 วินาที</div>
<div class="note i">ลบสมาชิก: Owner กด trash icon → confirm → RPC remove_team_member. ไม่สามารถลบตัวเองได้ (ปุ่มซ่อน)</div>
</div>

<!-- ═══ S-04 Products ═══ -->
<div class="page">
<h2><span class="num" style="background:#ea580c">S-04</span> Owner จัดการสินค้า + เมนู</h2>
<div class="pre">Precondition: Owner login แล้ว (Cashier/Super Admin ทำไม่ได้)</div>

${S('1', '#ea580c', 'ไปแท็บ "สินค้า"', 'เห็นรายการสินค้า + ปุ่ม "+" (Owner เท่านั้น)')}
${sc('S04-1-products-list.png', 'หน้าสินค้า — Owner')}
${sc('S04-2-products-scroll.png', 'สินค้า scroll down')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — เพิ่ม/แก้ไขสินค้า</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อสินค้า</strong></td><td>Required, max 100<br>
No stacked Thai combining marks (regex: <span class="mono">/[\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E]{2,}/</span>)<br>
Must have at least 1 alphanumeric character</td><td>
"กรุณากรอกชื่อสินค้า"<br>
"ชื่อสินค้ายาวเกินไป (สูงสุด 100 ตัวอักษร)"<br>
"ชื่อสินค้ามีสระหรือวรรณยุกต์ซ้อนกัน"<br>
"ชื่อสินค้าต้องมีตัวอักษรหรือตัวเลข"</td></tr>
<tr><td><strong>ราคา</strong></td><td>Required, regex <span class="mono">/^\\d+(\\.\\d{1,2})?$/</span><br>
Must be &gt; 0 and &le; 999,999</td><td>
"กรุณากรอกราคา"<br>
"ราคาต้องเป็นตัวเลขเท่านั้น (เช่น 50 หรือ 49.99)"<br>
"ราคาต้องมากกว่า 0"<br>
"ราคาสูงเกินไป (สูงสุด 999,999 บาท)"</td></tr>
<tr><td><strong>Stock</strong></td><td>Required (default: 999), regex <span class="mono">/^\\d+$/</span><br>
0-99,999</td><td>
"กรุณากรอก Stock"<br>
"Stock ต้องเป็นจำนวนเต็มบวกเท่านั้น"<br>
"Stock ติดลบไม่ได้"<br>
"Stock สูงเกินไป (สูงสุด 99,999)"</td></tr>
<tr><td><strong>รูปภาพ</strong></td><td>Optional, กดปุ่มอัพโหลด → POST /api/upload-product-image<br>รองรับ JPG, PNG, WEBP, GIF เท่านั้น, max 5MB<br>แสดง preview + ปุ่ม × ล้างรูป</td><td>
"ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ GIF เท่านั้น"<br>
"ขนาดไฟล์ต้องไม่เกิน 5 MB"</td></tr>
<tr><td><strong>หมวดหมู่</strong></td><td>Optional (dropdown) + ปุ่ม "+" สร้างหมวดหมู่ใหม่ inline ได้เลย<br>กด "+" → พิมพ์ชื่อ → กด ✓ → insert ลง DB + select ทันที</td><td>No error</td></tr>
<tr><td><strong>ซ่อนสินค้าชั่วคราว</strong></td><td>Checkbox (default: ไม่ติ๊ก = แสดงในเมนู)<br>❗ Logic กลับด้าน: <strong>ติ๊ก = ซ่อน (is_active=false)</strong>, ไม่ติ๊ก = แสดง (is_active=true)</td><td>No error</td></tr>
</table>

<div class="note w">Stock = 0 → สินค้า<strong>ซ่อนอัตโนมัติ</strong>จากเมนูลูกค้า (ไม่แสดงเลย ไม่ใช่แค่ disabled)</div>
<div class="note w">is_active=false → หายจากเมนูลูกค้า แต่ยังอยู่ใน DB (soft hide)</div>
<div class="note i">สร้างสินค้าชิ้นแรก → ระบบตั้ง shop.first_product_at = now() → เริ่มนับ trial 7 วัน</div>
</div>

<!-- ═══ S-12 Dashboard ═══ -->
<div class="page">
<h2><span class="num" style="background:#059669">S-12</span> Owner ดู Dashboard + รายงาน</h2>
<div class="pre">Precondition: Owner login, มีออเดอร์ในระบบ (Cashier ไม่เห็นแท็บนี้)</div>

${S('1', '#059669', 'ไปแท็บ "สรุป"', 'เห็น: ยอดขายรวม, จำนวนออเดอร์, เงินสด/โอน, ค่าเฉลี่ย, Top 5 สินค้า')}
${sc('S12-1-dashboard-today.png', 'Dashboard — วันนี้')}
${sc2('S12-2-dashboard-week.png', 'Dashboard — 7 วัน', 'S12-3-dashboard-month.png', 'Dashboard — เดือนนี้')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Date Range Logic</h4>
<table>
<tr><th>Button</th><th>Start Date</th><th>End Date</th><th>Filter</th></tr>
<tr><td>"วันนี้"</td><td>Today 00:00:00</td><td>Tomorrow 00:00:00</td><td rowspan="3">status = 'completed'<br>completed_at within range</td></tr>
<tr><td>"7 วัน"</td><td>7 days ago</td><td>Tomorrow 00:00:00</td></tr>
<tr><td>"เดือนนี้"</td><td>1st of current month</td><td>Tomorrow 00:00:00</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Metrics</h4>
<table>
<tr><th>Metric</th><th>Calculation</th></tr>
<tr><td>ยอดขายรวม</td><td>sum(orders.total_amount) — completed only</td></tr>
<tr><td>จำนวนออเดอร์</td><td>count(orders) — completed only</td></tr>
<tr><td>เงินสด</td><td>sum(payments where method='cash')</td></tr>
<tr><td>เงินโอน</td><td>sum(payments where method != 'cash')</td></tr>
<tr><td>ค่าเฉลี่ย</td><td>total / count (or 0 if no orders)</td></tr>
<tr><td>Top 5 สินค้า</td><td>group by product_id, sort qty desc, item_status='active'</td></tr>
</table>

${SL('2', '#059669', 'ดูประวัติบิล', 'หน้าบิล → กด "ประวัติ" → กรองตามสถานะ')}
${sc('S12-4-history.png', 'ประวัติบิลทั้งหมด')}
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER PDF
// ═══════════════════════════════════════════════════════════════
function customerQA(): string {
  const c = '#0d9488'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Customer (ลูกค้า)</div><div class="sub">QRforPay POS — S-05, S-06, S-07</div><div class="date">Generated 21/03/2026 (CE) | QA — verified from source code</div></div>
${CREDS_PAGE}

<!-- ═══ S-05 QR Ordering ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-05</span> ลูกค้าสั่งอาหารเอง (Self-Order via QR)</h2>
<div class="desc">ลูกค้าสแกน QR Code จากโต๊ะ → เปิดเมนูร้าน → สั่ง → ส่งครัว</div>
<div class="pre">Precondition: ร้านมีสินค้า + QR Code ติดบนโต๊ะ | ไม่ต้อง login</div>

${S('1', c, 'สแกน QR Code → เปิด /order?session={uuid}', 'ระบบตรวจ session UUID → validate → โหลดเมนูร้าน')}
${sc('S05-1-order-no-session.png', 'ถ้าไม่มี session → error page')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Session Validation (5 cases)</h4>
<table>
<tr><th>Case</th><th>Condition</th><th>Result</th><th>Error Message (Thai)</th></tr>
<tr><td>1</td><td>No <span class="mono">?session</span> param in URL</td><td><span class="tag r">ERROR</span></td><td>"ไม่พบ QR Session — กรุณาขอ QR ใหม่จากพนักงาน"</td></tr>
<tr><td>2</td><td>UUID not found in DB</td><td><span class="tag r">ERROR</span></td><td>"QR code ไม่ถูกต้องหรือหมดอายุ — กรุณาขอ QR ใหม่"</td></tr>
<tr><td>3</td><td>session status = <span class="mono">cancelled</span></td><td><span class="tag r">ERROR</span></td><td>"QR code นี้ถูกยกเลิก — กรุณาขอ QR ใหม่จากพนักงาน"</td></tr>
<tr><td>4</td><td>session status = <span class="mono">paid</span></td><td><span class="tag g">SUCCESS</span></td><td>แสดงหน้า "ชำระเงินสำเร็จ" (thank you page)</td></tr>
<tr><td>5</td><td>session status = <span class="mono">active</span></td><td><span class="tag g">OK</span></td><td>แสดงเมนูร้าน → สั่งได้</td></tr>
</table>

${S('2', c, 'เห็นเมนูร้าน', 'แสดงสินค้าแบ่งตามหมวดหมู่ — สินค้าที่ is_active=true AND stock > 0 เท่านั้น (stock=0 ซ่อนอัตโนมัติ)')}
${sc('S05-2-order-menu.png', 'หน้าเมนูร้าน — สินค้าจริง')}
${sc('S05-3-order-menu-scroll.png', 'เมนู scroll down')}
</div>

<div class="page">
${S('3', c, 'กด "+" เพิ่มตะกร้า', 'เช็คสต็อก → เพิ่มจำนวน → ยอดรวมด้านล่าง')}
${sc2('S05-4-order-added-item.png', 'หลังกด "+" เพิ่มสินค้า', 'S05-5-order-cart-summary.png', 'สรุปยอด + ปุ่มดูตะกร้า')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Cart Logic</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>Result</th></tr>
<tr><td>กด "+"</td><td>stock &gt; 0 AND qty &lt; stock</td><td>qty +1</td></tr>
<tr><td>กด "+"</td><td>qty &ge; stock</td><td>ไม่เพิ่ม (หมดสต็อก)</td></tr>
<tr><td>กด "-" เมื่อ qty = 1</td><td>-</td><td>Confirm dialog: 'ต้องการลบ "ชื่อ" ออกจากตะกร้า?'</td></tr>
<tr><td>กด "-" เมื่อ qty &gt; 1</td><td>-</td><td>qty -1</td></tr>
<tr><td>สินค้าถูก deactivate (Realtime)</td><td>Owner ปิดสินค้า (is_active=false)</td><td>ลบจากตะกร้าอัตโนมัติ</td></tr>
<tr><td>Stock ลดเหลือ 0 (Realtime)</td><td>Owner แก้ stock เป็น 0</td><td>ลบจากตะกร้าอัตโนมัติ + ซ่อนจากเมนู</td></tr>
</table>

<div class="note i">Cart storage: localStorage key <span class="mono">qrforpay_cart_{session_id}</span> — synced across tabs via Realtime broadcast</div>

${S('4', c, 'ดูตะกร้า → กดยืนยันออเดอร์', 'Confirm: "X รายการ รวม ฿Y ออเดอร์จะส่งไปยังครัวทันที"')}
${sc('S05-6-order-cart-view.png', 'ตะกร้า → ยืนยัน')}

${SL('5', c, 'ออเดอร์สำเร็จ → POS ได้รับ Realtime notification', 'สร้าง order (status=pending, order_source=customer) + order_items + payment (pending)')}

<h4 style="color:#1e40af;margin:8px 0 4px;">DB Operations on Order Submit</h4>
<table>
<tr><th>Table</th><th>Fields</th></tr>
<tr><td><strong>orders</strong></td><td>shop_id, cashier_id=<strong>NULL</strong>, subtotal, tax_amount, total_amount, payment_method='qr', status='pending', order_source='<strong>customer</strong>', customer_session_id, table_number</td></tr>
<tr><td><strong>order_items</strong></td><td>order_id, product_id, quantity, unit_price, subtotal (price x qty)</td></tr>
<tr><td><strong>payments</strong></td><td>order_id, method='qr', amount, status='pending'</td></tr>
</table>
<div class="note i">Tax: subtotal x (taxRate / (1 + taxRate)) — from shop.tax_rate (default 7%)</div>
</div>

<!-- ═══ S-06 Payment ═══ -->
<div class="page">
<h2><span class="num" style="background:#d97706">S-06</span> ลูกค้าจ่ายเงิน PromptPay QR</h2>
<div class="pre">Precondition: ลูกค้าสั่งอาหารแล้ว (S-05 เสร็จ)</div>

${S('1', '#d97706', 'กด "ชำระเงิน"', 'State → paying → สร้าง QR PromptPay EMV standard')}
${S('2', '#d97706', 'แสดง QR Code + countdown 600 วินาที', 'EMV QR ตาม BOT standard + CRC16-CCITT checksum')}
${SL('3', '#d97706', 'ลูกค้าสแกนจ่ายผ่าน Banking App', 'ตรวจชื่อร้าน + จำนวนเงิน → ยืนยัน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">QR PromptPay Validation</h4>
<table>
<tr><th>Check</th><th>Rule</th><th>Error</th></tr>
<tr><td>PromptPay ID</td><td>Required, 10 or 13 digits</td><td>"PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก"</td></tr>
<tr><td>Amount</td><td>&gt; 0, &le; 999,999</td><td>"Amount must be greater than 0" / "Amount must not exceed 999,999"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Payment Mode (set by Owner in Settings)</h4>
<table>
<tr><th>Mode</th><th>Customer Flow</th><th>Confirmed By</th></tr>
<tr><td><span class="tag b">auto</span> จ่ายเองอัตโนมัติ</td><td>QR → scan → Realtime detect → auto complete</td><td>System automatic</td></tr>
<tr><td><span class="tag y">counter</span> จ่ายที่เคาน์เตอร์</td><td>Go to cashier → cashier presses "ยืนยันรับเงิน"</td><td>Cashier manual confirm</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">QR Countdown Timer (600 seconds total)</h4>
<table>
<tr><th>Time Remaining</th><th>Display</th></tr>
<tr><td>&gt; 60 seconds</td><td>"หมดอายุใน MM:SS" (normal color)</td></tr>
<tr><td>&le; 60 seconds</td><td>"หมดอายุใน MM:SS" (red color / warning)</td></tr>
<tr><td>0 seconds</td><td>"QR หมดอายุ" → button to generate new QR or cancel</td></tr>
</table>

${sc('S08-2-session-detail.png', 'ตัวอย่าง QR Code + รายการ (ฝั่ง POS)')}
</div>

<!-- ═══ S-07 Multi-Order ═══ -->
<div class="page">
<h2><span class="num" style="background:#db2777">S-07</span> ลูกค้าสั่งเพิ่ม (Multi-Order)</h2>
<div class="desc">ลูกค้าสั่งเพิ่มได้ไม่จำกัดบน session เดียวกัน</div>
<div class="pre">Precondition: สั่งไปแล้ว 1+ ออเดอร์ (S-05), ยังอยู่หน้าเมนูเดิม, session status=active</div>

${S('1', '#db2777', 'หน้าเมนูเดิม (session ยังอยู่)', 'ตะกร้าว่าง + เห็น confirmedItems + สถานะครัว realtime')}
${S('2', '#db2777', 'เลือกเมนูเพิ่ม → ยืนยัน', 'สร้าง order_id ใหม่ + order_number ใหม่ บนโต๊ะเดิม (same customer_session_id)')}
${SL('3', '#db2777', 'POS เห็น Realtime notification', 'Highlight 8 sec + vibrate notification')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Order Status Labels (Thai)</h4>
<table>
<tr><th>Status</th><th>Label Thai</th><th>Color</th></tr>
<tr><td>pending</td><td>รอครัว</td><td><span class="tag y">yellow</span></td></tr>
<tr><td>preparing</td><td>กำลังทำ</td><td><span class="tag p">purple</span></td></tr>
<tr><td>ready</td><td>พร้อมเสิร์ฟ</td><td><span class="tag g">green</span></td></tr>
<tr><td>completed</td><td>เสร็จแล้ว</td><td>gray</td></tr>
<tr><td>cancelled</td><td>ยกเลิก</td><td><span class="tag r">red</span></td></tr>
</table>

<div class="note i">Bill Merging: เมนูเดียวกันจากหลาย order รวมเป็นบรรทัดเดียว (merge by product_id) ในหน้าสรุปบิล</div>
<div class="note i">ทุก order ใน session เดียวกัน share customer_session_id เดียวกัน → แคชเชียร์ดูรวมได้</div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// CASHIER PDF
// ═══════════════════════════════════════════════════════════════
function cashierQA(): string {
  const c = '#0891b2'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Cashier (แคชเชียร์)</div><div class="sub">QRforPay POS — S-08, S-09, S-10, S-11</div><div class="date">Generated 21/03/2026 (CE) | QA — verified from source code</div></div>
${CREDS_PAGE}

<!-- ═══ S-08a Cashier Login ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-08</span> แคชเชียร์ Login เข้าระบบ</h2>
<div class="desc">แคชเชียร์ใช้ Username + Password ที่ Owner สร้างให้ (S-03) login ที่หน้า /login</div>
<div class="pre">Precondition: Owner สร้าง cashier account แล้ว (S-03), cashier ได้ username + password</div>

${S('1', c, 'เปิดเว็บ → หน้า Landing Page', 'เห็น nav bar มีปุ่ม "เข้าสู่ระบบ" + "สมัครเลย"')}
${S('2', c, 'กดปุ่ม "เข้าสู่ระบบ" → หน้า /login', 'เห็นฟอร์ม: "อีเมล หรือ ชื่อผู้ใช้" + "รหัสผ่าน" + ปุ่ม Google')}
${S('3', c, 'กรอก Username + Password', 'ช่อง "อีเมล หรือ ชื่อผู้ใช้" → กรอก username เช่น cashier01<br>ช่อง "รหัสผ่าน" → กรอก password ที่ได้ตอนสร้าง')}
${S('4', c, 'กด "เข้าสู่ระบบ"', 'ระบบตรวจว่า input ไม่มี @ → เรียก POST /api/resolve-username → ได้ fake email → login กับ Supabase')}
${SL('5', c, 'Redirect → /pos/sessions', 'profile.role = "cashier" → เข้าหน้าบิลที่เปิดอยู่')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Cashier Login — Error Cases</h4>
<table>
<tr><th>กรณี</th><th>Error Message</th></tr>
<tr><td>Username ไม่มีในระบบ</td><td>"ไม่พบชื่อผู้ใช้นี้ในระบบ"</td></tr>
<tr><td>Username ถูก แต่ password ผิด</td><td>"อีเมลหรือรหัสผ่านไม่ถูกต้อง"</td></tr>
<tr><td>Cashier ถูก Owner ลบออกจากทีม</td><td>"ไม่พบชื่อผู้ใช้นี้ในระบบ" (fake email ถูกลบแล้ว)</td></tr>
<tr><td>ร้านถูก Admin soft delete</td><td>Login สำเร็จ แต่ role=null → redirect ไป /pending → "บัญชีถูกระงับ"</td></tr>
</table>

<div class="note i">Cashier ใช้ Google Login ไม่ได้ — ต้องใช้ username + password เท่านั้น</div>
<div class="note w">Cashier เห็นแท็บ: บิล, โต๊ะ, ออเดอร์ เท่านั้น — ไม่เห็น สินค้า, ตั้งค่า, สรุป</div>
</div>

<!-- ═══ S-08 Sessions / Orders ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-08</span> แคชเชียร์รับออเดอร์ + จัดการ</h2>
<div class="desc">แคชเชียร์เห็น Realtime notifications เมื่อลูกค้าสั่ง → จัดการ payment</div>
<div class="pre">Precondition: Cashier/Owner login, มีออเดอร์จากลูกค้า (S-05)</div>

${S('1', c, 'Realtime Notification', 'Vibration + Toast "ออเดอร์ #XX โต๊ะ Y" (6 sec auto-dismiss) + highlight row 8 sec')}
${sc('S08-1-sessions-list.png', 'หน้าบิลที่เปิดอยู่ — sessions list')}

${S('2', c, 'กดดูรายละเอียดบิล', 'QR Code + รายการ + ยอด + ปุ่มจัดการ')}
${sc('S08-2-session-detail.png', 'Session Detail — QR + orders + items')}

${S('3', c, 'ดูหน้า Orders', 'รายการออเดอร์ทั้งหมด + สถานะ + filter')}
${sc('S08-4-orders-page.png', 'Orders page — all orders')}

${SL('4', c, 'ยืนยัน Payment + ปิดบิล', 'เลือกวิธีจ่าย → confirm → complete')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Payment Methods — 2 options</h4>
<table>
<tr><th>Method</th><th>Flow</th><th>Validation</th><th>DB Fields</th></tr>
<tr><td><span class="tag b">โอนเงิน</span> (promptpay)</td><td>กด "ยืนยันรับโอนเงิน" → confirm dialog "ยอด ฿X" → ยืนยัน</td><td>No input validation</td><td>method='promptpay', confirmation_type='manual', confirmed_by=profile.id</td></tr>
<tr><td><span class="tag g">เงินสด</span> (cash)</td><td>กรอก "เงินรับ" → auto-calculate change → confirm "รับ ฿X ทอน ฿Y"</td><td>เงินรับ &ge; ยอดรวม<br>Error: "เงินไม่พอ ยอดที่ต้องชำระ ฿X"</td><td>method='cash', cash_received, cash_change</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Discount (ส่วนลด)</h4>
<table>
<tr><th>Type</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td>percent (%)</td><td>0-100%</td><td>"ส่วนลดเกิน 100%"</td></tr>
<tr><td>fixed (฿)</td><td>0 to subtotal</td><td>"ส่วนลดเกินยอดรวม"</td></tr>
<tr><td>Either</td><td>Must be &gt; 0</td><td>"กรุณาใส่ส่วนลด"</td></tr>
</table>
</div>

<!-- ═══ S-09 Create Bill + QR ═══ -->
<div class="page">
<h2><span class="num" style="background:#4f46e5">S-09</span> แคชเชียร์สร้างบิล + ให้ QR ลูกค้า</h2>
<div class="desc">ระบบ QRforPay เป็น Self-Service — แคชเชียร์สร้างบิล + ให้ QR แล้วลูกค้าสั่งเอง</div>
<div class="pre">Precondition: Cashier/Owner login แล้ว</div>

${S('1', '#4f46e5', 'สร้างบิลใหม่', '2 วิธี: หน้า "บิล" กด "+ บิลใหม่" หรือ หน้า "โต๊ะ" กดที่โต๊ะว่าง')}
${sc('S08-1-sessions-list.png', 'Sessions page — กด "+ บิลใหม่" มุมขวาบน')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Create Session from Tables Page</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>Result</th></tr>
<tr><td>กดโต๊ะว่าง (available)</td><td>No active session on table</td><td>Confirm: "เปิดโต๊ะ X - สร้างบิลใหม่และ QR Code?"<br>→ Create customer_session (status=active) → open detail modal with QR</td></tr>
<tr><td>กดโต๊ะไม่ว่าง (occupied)</td><td>Has active session</td><td>Open detail modal of existing session</td></tr>
</table>

${S('2', '#4f46e5', 'ระบบแสดง QR Code', 'QR contains URL: /order?session={uuid}')}
${sc('S11-2-table-detail.png', 'QR Code สำหรับลูกค้าสแกน')}

${S('3', '#4f46e5', 'ให้ QR ลูกค้า', 'พิมพ์ QR (80mm receipt) หรือให้ลูกค้าสแกนจากหน้าจอ')}
${SL('4', '#4f46e5', 'ลูกค้าสแกน QR → สั่งเอง (S-05)', 'ลูกค้าเห็นเมนู → สั่ง → เข้าครัว → แคชเชียร์ได้รับ Realtime (S-08)')}

<div class="note d">แคชเชียร์ไม่สามารถสั่งอาหารแทนลูกค้าได้ — ไม่มีหน้า POS ordering ในระบบ</div>
<div class="note i">หน้า "สินค้า" ใช้สำหรับ Owner จัดการเมนูเท่านั้น ไม่ใช่หน้าสั่งอาหาร</div>
</div>

<!-- ═══ S-10 Cancel Items / Bills ═══ -->
<div class="page">
<h2><span class="num" style="background:#dc2626">S-10</span> ยกเลิกรายการ / ยกเลิกบิล</h2>
<div class="pre">Precondition: มีบิลเปิดอยู่ที่มีออเดอร์</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Case A: ยกเลิกรายเมนู (Cancel Individual Item)</h4>
<table>
<tr><th>Step</th><th>Action</th><th>DB Update</th></tr>
<tr><td>1</td><td>เปิด Session Detail → เห็นทุก item</td><td>-</td></tr>
<tr><td>2</td><td>กดปุ่ม "ลบ" ข้าง item → confirm: "ยกเลิกรายการนี้?"</td><td>order_items: item_status='cancelled', item_cancelled_by=profile.id, item_cancelled_at=now()</td></tr>
<tr><td>3</td><td>ระบบคำนวณยอดใหม่ (เฉพาะ active items)</td><td>orders: recalculate total_amount, subtotal</td></tr>
<tr><td>4</td><td>ถ้าทุก item ถูกลบ → auto ยกเลิกทั้ง order</td><td>orders: status='cancelled'</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Case B: ยกเลิกทั้งบิล (Cancel Entire Session)</h4>
<table>
<tr><th>Step</th><th>Action</th><th>DB Update</th></tr>
<tr><td>1</td><td>เปิด Table Detail หรือ Session Detail</td><td>-</td></tr>
<tr><td>2</td><td>กด "ยกเลิกบิล" → confirm: "ยกเลิกบิลนี้?"</td><td>orders: status='cancelled', cancelled_at, cancelled_by<br>payments: status='failed'<br>customer_sessions: status='cancelled'</td></tr>
</table>

${sc('S08-2-session-detail.png', 'Session Detail — กด "ลบ" ข้างรายการ')}
</div>

<!-- ═══ S-11 Tables ═══ -->
<div class="page">
<h2><span class="num" style="background:#475569">S-11</span> จัดการโต๊ะ + ย้ายโต๊ะ</h2>
<div class="pre">Precondition: Cashier/Owner login, มีโต๊ะตั้งค่าแล้ว (table_count > 0)</div>

${S('1', '#475569', 'ไปแท็บ "โต๊ะ"', 'Grid โต๊ะ 1..N + สถานะ (available/occupied) + ยอดเงิน + ปุ่ม swap ย้ายโต๊ะ')}
${sc('S11-1-tables-grid.png', 'Grid โต๊ะ — ปุ่ม swap ย้ายโต๊ะ')}

${S('2', '#475569', 'กดที่ตัวเลขโต๊ะ → Detail modal', 'QR Code + ออเดอร์ทั้งหมด + ปุ่มยกเลิกบิล')}
${sc('S11-2-table-detail.png', 'Table Detail — QR + orders')}

${SL('3', '#475569', 'ย้ายโต๊ะ — กดปุ่ม swap จาก Grid ได้เลย (ไม่ต้องเปิด detail ก่อน)', '')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Move Table Logic</h4>
<table>
<tr><th>Action</th><th>Condition</th><th>Result</th></tr>
<tr><td>กด swap ที่โต๊ะต้นทาง</td><td>โต๊ะมี session อยู่</td><td>Enter move mode: banner "ย้ายจากโต๊ะ X" appears at top</td></tr>
<tr><td>กดโต๊ะปลายทาง (ว่าง)</td><td>Target table = available</td><td><span class="tag g">SUCCESS</span> Toast: "ย้ายจากโต๊ะ X ไปโต๊ะ Y สำเร็จ"</td></tr>
<tr><td>กดโต๊ะปลายทาง (ไม่ว่าง)</td><td>Target table = occupied</td><td><span class="tag r">ERROR</span> "โต๊ะ Y ไม่ว่าง — ย้ายได้เฉพาะโต๊ะว่าง"</td></tr>
<tr><td>Cancel move</td><td>กด X บน banner</td><td>Exit move mode</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">DB Update on Move</h4>
<table>
<tr><th>Table</th><th>Update</th></tr>
<tr><td>customer_sessions</td><td>table_label = new table number</td></tr>
<tr><td>orders (active only)</td><td>table_number = new table (only status != cancelled, completed)</td></tr>
</table>

<div class="note i">ถ้า table_count = 0 → แสดง "ยังไม่ได้ตั้งจำนวนโต๊ะ" + ลิงก์ไปตั้งค่า</div>
<div class="note w">ปุ่ม swap อยู่บน Grid card ของแต่ละโต๊ะ — กดได้เลยไม่ต้องเปิด detail modal ก่อน</div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PDF
// ═══════════════════════════════════════════════════════════════
function adminQA(): string {
  const c = '#16a34a'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Super Admin</div><div class="sub">QRforPay POS — S-02 + RBAC + Subscription</div><div class="date">Generated 21/03/2026 (CE) | QA — verified from source code</div></div>
${CREDS_PAGE}

<!-- ═══ S-02 Admin Panel ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Super Admin — Login + Admin Panel</h2>
<div class="pre">Precondition: User has role = super_admin in profiles table</div>

${S('1', c, 'เปิดเว็บ → Landing Page', 'เห็น nav bar มีปุ่ม "เข้าสู่ระบบ" + "สมัครเลย"')}
${sc('S01-1-landing.png', 'Landing Page — nav: เข้าสู่ระบบ + สมัครเลย')}

${S('2', c, 'กดปุ่ม "เข้าสู่ระบบ" → หน้า /login', 'เห็นฟอร์ม: "อีเมล หรือ ชื่อผู้ใช้" + "รหัสผ่าน" + ปุ่ม Google')}
${sc('S01-05-login-page.png', 'หน้า Login — อีเมล หรือ ชื่อผู้ใช้')}

${S('3', c, 'Login ด้วย super admin email', 'กรอก email + password → กด "เข้าสู่ระบบ"')}

${S('4', c, 'Redirect → /pos/admin', 'Login logic: profile.role === "super_admin" → router.push("/pos/admin")')}
${sc('S02-2-admin-after-login.png', 'หลัง Login — nav bar แสดงแท็บ "Admin" เท่านั้น')}

<div class="note i">Super Admin nav bar แสดงเฉพาะแท็บ "Admin" — ไม่เห็น บิล/โต๊ะ/สินค้า/ตั้งค่า/สรุป</div>

${S('5', c, 'Admin Panel — PromptPay Settings', 'เปลี่ยน PromptPay QR ของบริษัท (ใช้รับเงินจาก Owner)')}
${sc('S02-3-admin-panel.png', 'Admin Panel — PromptPay + shop list')}

<h4 style="color:#1e40af;margin:8px 0 4px;">PromptPay Validation (มาตรฐาน BOT)</h4>
<table>
<tr><th>ประเภท</th><th>จำนวนหลัก</th><th>เงื่อนไขเพิ่มเติม</th><th>Error Message</th></tr>
<tr><td><strong>เบอร์โทร</strong></td><td>10 หลัก</td><td>
ต้องขึ้นต้นด้วย 0<br>
✅ มือถือ: 06x, 08x, 09x<br>
✅ บ้าน: 02x, 03x, 04x, 05x<br>
❌ 01x, 07x ไม่ผ่าน<br>
❌ ไม่ขึ้นต้นด้วย 0 ไม่ผ่าน</td><td>
"เบอร์โทรต้องขึ้นต้นด้วย 0"<br>
"เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 06, 08, 09 สำหรับมือถือ หรือ 02-05 สำหรับบ้าน)"</td></tr>
<tr><td><strong>บัตรประชาชน / นิติบุคคล</strong></td><td>13 หลัก</td><td>
Checksum validation (mod 11)<br>
❌ 0000000000000 ไม่ผ่าน<br>
❌ เลขสุ่ม 13 หลักที่ checksum ผิดไม่ผ่าน</td><td>
"เลขบัตรประชาชนไม่ถูกต้อง"<br>
"เลขบัตรประชาชน/นิติบุคคลไม่ถูกต้อง (checksum ผิด)"</td></tr>
<tr><td colspan="4"><strong>Input:</strong> รับเฉพาะตัวเลข (พิมพ์ตัวอักษรไม่ได้) maxLength=13 | inputMode=numeric</td></tr>
</table>
<div class="note i">Validation ใช้ <span class="mono">lib/validate-promptpay.ts</span> — ใช้ร่วมกันทั้ง register, settings, admin panel</div>
</div>

<div class="page">
${S('6', c, 'Shop List + Search', 'แสดงร้านค้าทั้งหมด + search box + สถานะ')}
${sc('S02-3-admin-panel.png', 'Shop list with search')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Search Logic</h4>
<div class="pre">Search filters by: shop.name, owner.email, owner.full_name, shop.promptpay_id<br>Case-insensitive (toLowerCase)</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Shop Card Info</h4>
<table>
<tr><th>Field</th><th>Source</th><th>Format</th></tr>
<tr><td>Shop name</td><td>shops.name</td><td>Bold, strikethrough if deleted</td></tr>
<tr><td>Status badge</td><td>shops.is_deleted</td><td>"ใช้งาน" (green) / "ถูกลบ" (red)</td></tr>
<tr><td>Owner</td><td>profiles where role=owner OR role=null + has shop_id</td><td>full_name + email</td></tr>
<tr><td>PromptPay</td><td>shops.promptpay_id</td><td>-</td></tr>
<tr><td>Created</td><td>shops.created_at</td><td><span class="mono">toLocaleDateString('en-GB')</span> — CE, NOT BE</td></tr>
<tr><td>Subscription</td><td>shops.subscription_paid_until + setup_fee_paid + first_product_at</td><td>subStatusText(): "ชำระแล้ว ถึง {date}" / "หมดอายุ {date}" / "ทดลองใช้ เหลือ X วัน" / "ยังไม่มีสินค้า"<br>สี: green (paid active), amber (trial active), red (expired)</td></tr>
</table>
</div>

<div class="page">
${S('7', c, 'Set Subscription Date (Calendar Picker)', 'เลือกวันหมดอายุ → กด "ตั้งวันหมดอายุ"')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Subscription Date Picker</h4>
<table>
<tr><th>Element</th><th>Detail</th></tr>
<tr><td>Input type</td><td><span class="mono">&lt;input type="date"&gt;</span></td></tr>
<tr><td>Min date</td><td><span class="mono">min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())}</span> — today in Asia/Bangkok timezone (cannot pick past dates)</td></tr>
<tr><td>Validation</td><td>"กรุณาเลือกวันที่" (empty) / "วันที่ต้องไม่น้อยกว่าวันนี้" (past date)</td></tr>
<tr><td>Confirm dialog</td><td>Title: 'ตั้งวันหมดอายุร้าน "{shopName}"?'<br>Message: "หมดอายุวันที่ {dateStr}"<br>Button: "ยืนยัน"</td></tr>
<tr><td>Success</td><td>'ตั้งวันหมดอายุร้าน "{shopName}" เป็น {dateStr}'</td></tr>
</table>

<div class="note w">ไม่มีปุ่ม "+30 วัน" อีกแล้ว — เปลี่ยนเป็น date picker เลือกวันเองได้ (with min=today)</div>

${S('8', c, 'Soft Delete Shop (ลบร้าน)', 'กด "ลบร้าน" → confirm → deactivate all users + soft delete shop')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Soft Delete Flow</h4>
<table>
<tr><th>Step</th><th>Action</th><th>Code</th></tr>
<tr><td>1</td><td>Confirm dialog</td><td>Title: 'ลบร้าน "{shopName}"?'<br>Message: "ร้านจะถูกซ่อน (soft delete) สามารถกู้คืนได้ภายหลัง"<br>Button: "ลบร้าน" (danger=true)</td></tr>
<tr><td>2</td><td>Deactivate ALL users in shop</td><td><span class="mono">profiles.update({ role: null }).eq('shop_id', shopId)</span></td></tr>
<tr><td>3</td><td>Soft delete shop</td><td><span class="mono">shops.update({ is_deleted: true, deleted_at: now() })</span></td></tr>
</table>

<div class="note d">NO separate deactivate/reactivate buttons — only "ลบร้าน" (soft delete) and "กู้คืน" (undelete)</div>

${SL('9', c, 'Undelete Shop (กู้คืน)', 'กด "กู้คืน" → confirm → reactivate owner + cashiers + undelete shop')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Undelete Flow</h4>
<table>
<tr><th>Step</th><th>Action</th><th>Code</th></tr>
<tr><td>1</td><td>Confirm dialog</td><td>Title: 'กู้คืนร้าน "{shopName}"?'<br>Message: "ร้านจะกลับมาใช้งานได้ตามปกติ"<br>Button: "กู้คืน"</td></tr>
<tr><td>2</td><td>Undelete shop</td><td><span class="mono">shops.update({ is_deleted: false, deleted_at: null })</span></td></tr>
<tr><td>3</td><td>Get owner_id from shop</td><td><span class="mono">shops.select('owner_id').eq('id', shopId)</span></td></tr>
<tr><td>4</td><td>Reactivate owner</td><td><span class="mono">profiles.update({ role: 'owner' }).eq('id', owner_id).is('role', null)</span></td></tr>
<tr><td>5</td><td>Reactivate cashiers</td><td><span class="mono">profiles.update({ role: 'cashier' }).eq('shop_id', shopId).is('role', null)</span></td></tr>
</table>
<div class="note i">Uses shops.owner_id to correctly identify the owner (not just any user with shop_id)</div>
</div>

<!-- ═══ What Happens When Shop is Deleted ═══ -->
<div class="page">
<h2><span class="num" style="background:#dc2626">S-02</span> What Happens When Shop is Deleted</h2>

<h4 style="color:#1e40af;margin:8px 0 4px;">Detailed Impact Table</h4>
<table>
<tr><th>Entity</th><th>On Delete</th><th>On Undelete</th></tr>
<tr><td><strong>Owner</strong></td><td>role → null<br>Sees /pending page: <strong>"บัญชีถูกระงับ"</strong><br>"ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน"<br>+ mailto: contact.runawaytech@gmail.com</td><td>role → 'owner' (using shops.owner_id)<br>Can login normally again</td></tr>
<tr><td><strong>Cashier</strong></td><td>role → null<br>Sees /pending page: <strong>"บัญชีถูกระงับ"</strong><br>"ร้านค้าของคุณถูกยกเลิกสิทธิ์การใช้งาน"<br>+ mailto: contact.runawaytech@gmail.com</td><td>role → 'cashier' (all users with shop_id + role=null)<br>Can login normally again</td></tr>
<tr><td><strong>Shop</strong></td><td>is_deleted = true<br>deleted_at = timestamp<br>SubscriptionGuard shows: <strong>"ร้านค้าถูกระงับ"</strong><br>"ร้านค้าของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"<br>+ mailto: contact.runawaytech@gmail.com</td><td>is_deleted = false<br>deleted_at = null<br>Normal operation resumes</td></tr>
</table>

<div class="note d">Owner on /pending sees: "บัญชีถูกระงับ" (ShieldOff icon)<br>
If user lands on POS with shop.is_deleted=true, SubscriptionGuard shows: "ร้านค้าถูกระงับ" (ShieldOff icon)</div>
<div class="note i">The distinction: /pending checks profile.pending_shop_name — if null, shows deactivated message. SubscriptionGuard checks shop.is_deleted — if true, shows suspended message.</div>
</div>

<!-- ═══ Role-Based Access Control ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">S-02</span> Role-Based Access Control (RBAC)</h2>

<h4 style="color:#1e40af;margin:8px 0 4px;">Complete RBAC Matrix</h4>
<table>
<tr><th>Feature</th><th>Customer</th><th>Cashier</th><th>Owner</th><th>Super Admin</th></tr>
<tr><td>QR Self-Order (สั่งอาหาร)</td><td><span class="tag g">Y</span></td><td>-</td><td>-</td><td>-</td></tr>
<tr><td>Sessions / Bills (บิล)</td><td>-</td><td><span class="tag g">Y</span></td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Orders (ออเดอร์)</td><td>-</td><td><span class="tag g">Y</span></td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Tables (โต๊ะ)</td><td>-</td><td><span class="tag g">Y</span></td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Products (สินค้า)</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Settings (ตั้งค่า)</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Add Cashier (เพิ่มพนักงาน)</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Dashboard (สรุป)</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td><td>-</td></tr>
<tr><td>Admin Panel (จัดการร้านค้า)</td><td>-</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td></tr>
<tr><td>Change Company PromptPay</td><td>-</td><td>-</td><td>-</td><td><span class="tag g">Y</span></td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Super Admin Limitations</h4>
<table>
<tr><th>Cannot Do</th><th>Reason</th></tr>
<tr><td><span class="tag r">X</span> Add Cashier</td><td>Owner responsibility — owner adds their own staff (S-03)</td></tr>
<tr><td><span class="tag r">X</span> Manage Products</td><td>Owner responsibility — owner manages their own menu</td></tr>
<tr><td><span class="tag r">X</span> View Tables / Sessions / Orders</td><td>Super Admin has no shop_id — cannot see any shop data</td></tr>
<tr><td><span class="tag r">X</span> View Dashboard</td><td>No shop_id — no sales data available</td></tr>
</table>

<div class="note i">Customer does NOT need a login — they scan QR and order directly</div>
<div class="note i">Login redirects: no role → /pending, super_admin → /pos/admin, owner/cashier → /pos/sessions</div>
</div>

<!-- ═══ Subscription / Paywall Conditions ═══ -->
<div class="page">
<h2><span class="num" style="background:#7c3aed">S-02</span> Subscription + Paywall System (SubscriptionGuard)</h2>
<div class="desc">Complete paywall logic from SubscriptionGuard.tsx — all conditions (updated 20/03/2026)</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">User Types</h4>
<table>
<tr><th>Type</th><th>setup_fee_paid</th><th>subscription_paid_until</th><th>Trial Source</th><th>Paywall Cost</th></tr>
<tr><td><strong>Direct user</strong></td><td>false</td><td>null (or admin-extended)</td><td>first_product_at + 7 days</td><td>฿1,399 one-time</td></tr>
<tr><td><strong>Referral user</strong></td><td>true</td><td>null (in trial)</td><td>first_product_at + 7 days</td><td>฿199/month</td></tr>
<tr><td><strong>Paid member</strong></td><td>true</td><td>set</td><td>N/A (already paid)</td><td>฿199/month</td></tr>
</table>
<div class="note w">Trial เริ่มนับจาก first_product_at (สินค้าชิ้นแรก) ทั้ง direct และ referral — ไม่นับจากวันสมัคร</div>

<h4 style="color:#1e40af;margin:8px 0 4px;">Paywall Conditions (isBlocked)</h4>
<table>
<tr><th>Condition</th><th>Result</th></tr>
<tr><td>Direct trial expired naturally (<span class="mono">trialExpiredNaturally</span>)</td><td><span class="tag r">BLOCKED</span> Paywall ฿1,399 — ไม่มี grace</td></tr>
<tr><td>Direct admin-extended trial expired (<span class="mono">trialExpiredByExtension</span>)</td><td><span class="tag r">BLOCKED</span> Paywall ฿1,399</td></tr>
<tr><td>Referral trial expired (<span class="mono">paidTrialExpired</span>)</td><td><span class="tag r">BLOCKED</span> Paywall ฿199 ทันที — ไม่มี grace</td></tr>
<tr><td>Paid member grace (<span class="mono">inGrace: daysOverdue 1-7</span>)</td><td><span class="tag y">Banner แดง</span> ยังใช้งานได้ — "หมดอายุแล้ว ชำระภายใน X วัน"</td></tr>
<tr><td>Paid member overdue &gt; 7 วัน (<span class="mono">isBlocked: daysOverdue &gt; 7</span>)</td><td><span class="tag r">BLOCKED</span> Paywall ฿199 — ต่อจากวันที่จ่าย</td></tr>
<tr><td>shop.is_deleted</td><td><span class="tag r">BLOCKED</span> "ร้านค้าถูกระงับ" + contact email</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Warning Banners (top of all POS pages)</h4>
<table>
<tr><th>Condition</th><th>Banner Text</th></tr>
<tr><td>Direct trial last 1-3 days (<span class="mono">trialDaysLeft 1-3</span>)</td><td>🟡 "ทดลองใช้ฟรีเหลืออีก X วัน — หลังจากนั้นต้องชำระ ฿1,399"</td></tr>
<tr><td>Admin extended, last 0-2 days (<span class="mono">nearExpiry</span>)</td><td>🟡 "การทดลองใช้ฟรีจะหมดในอีก X วัน / หมดอายุวันนี้"</td></tr>
<tr><td>Referral/Paid near expiry (<span class="mono">paidNearExpiry</span>, last 0-3 days)</td><td>🟡 "ระยะทดลองใช้จะหมดในอีก X วัน — ชำระ ฿199 · ชำระเงิน[link]"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Fair Expiry Calculation (calcFairExpiry)</h4>
<table>
<tr><th>กรณี</th><th>Formula</th></tr>
<tr><td>Direct/Referral — trial ยังเหลือ</td><td><span class="mono">trialEnd + 1 month</span> (ไม่เสียวัน trial ที่เหลือ)</td></tr>
<tr><td>Direct/Referral — trial หมดแล้ว</td><td><span class="mono">today + 1 month</span></td></tr>
<tr><td>Paid user จ่ายหลังหมด (ไม่ว่ากี่วัน)</td><td><span class="mono">today + 1 month</span></td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Referral Code Validation (on ฿1,399 paywall)</h4>
<table>
<tr><th>Input</th><th>Result</th></tr>
<tr><td>Empty</td><td>"กรุณากรอกรหัสตัวแทน"</td></tr>
<tr><td>Invalid / inactive</td><td>"รหัสตัวแทนไม่ถูกต้อง"</td></tr>
<tr><td>Valid (agents.code + active=true)</td><td>setup_fee_paid=true, referral_code=CODE, subscription_paid_until=calcNewExpiry → ปิด paywall</td></tr>
</table>

<div class="pre">getDaysOverdue(shop): if (!subscription_paid_until) return 0; else Math.max(0, floor((today - paidUntil) / 1day))<br>
paidTrialEnd: if (setupFeePaid &amp;&amp; !subPaidUntil &amp;&amp; first_product_at) → first_product_at + 7 days (normalized to midnight)</div>
<div class="note i">วันที่ทุกตัวใช้ <strong>Asia/Bangkok fixed timezone</strong> เสมอ (<span class="mono">Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })</span>) — ไม่ขึ้นกับ timezone ของ browser/owner ไม่ว่าจะเปิดจากประเทศไหน</div>
<div class="note i">Omise webhook auto-confirm — เมื่อ user scan QR แล้วจ่ายเงิน Omise จะส่ง <span class="mono">charge.complete</span> event → ระบบอัปเดต DB อัตโนมัติ → frontend poll ทุก 4 วินาที → reload หน้าเอง ไม่ต้องรอ admin ยืนยัน</div>
<div class="note i">Grace period 7 วัน สำหรับ paid member เท่านั้น — trial หมด (ทั้ง direct และ referral) = BLOCKED ทันที ไม่มี grace</div>
</div>

</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// AGENT (ตัวแทนขาย) PDF
// ═══════════════════════════════════════════════════════════════
function agentQA(): string {
  const c = '#d97706'
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
<div class="cover"><h1>QA Test Document</h1><div class="badge" style="background:${c}">Agent (ตัวแทนขาย)</div><div class="sub">QRforPay POS — ระบบตัวแทนขาย + Referral</div><div class="date">Generated 21/03/2026 (CE) | QA — verified from source code</div></div>
${CREDS_PAGE}

<!-- ═══ สมัครตัวแทนขาย ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">AG-01</span> สมัครเป็นตัวแทนขาย</h2>
<div class="desc">สมัครจากหน้า /register โดยกดแท็บ "สมัครตัวแทนขาย" — ไม่ต้อง login, ไม่ต้องสร้าง account</div>
<div class="pre">Precondition: ไม่ต้องมี account ในระบบ เปิดหน้าเว็บได้เลย</div>

${S('1', c, 'เปิดเว็บ → Landing Page', 'เห็น nav bar มีปุ่ม "เข้าสู่ระบบ" + "สมัครเลย" + scroll ล่างสุดมี section "สนใจเป็นตัวแทนขาย"')}
${sc('S01-1-landing.png', 'Landing Page — nav: เข้าสู่ระบบ + สมัครเลย')}

${S('2', c, 'กดปุ่ม "สมัครเลย" → หน้า /register', 'เห็น Mode Selector 2 tabs: "สมัครร้านค้า" (default) / "สมัครตัวแทนขาย"')}
${sc('S01-2-register-step1.png', 'หน้า Register — default เลือก "สมัครร้านค้า"')}

${S('3', c, 'กดแท็บ "สมัครตัวแทนขาย"', 'เปลี่ยนฟอร์มในหน้าเดียว ไม่ redirect — ไอคอนเปลี่ยนเป็น Handshake สีส้ม')}
${sc('partner-register.png', 'แท็บ "สมัครตัวแทนขาย" — ฟอร์มกรอกชื่อ + เบอร์')}

${S('4', c, 'กรอกข้อมูล + กด "รับรหัสตัวแทน"', 'กรอก ชื่อ-นามสกุล + เบอร์โทร → กดสมัคร')}

${SL('5', c, 'ได้รหัสตัวแทน + Referral Link', 'แสดงรหัส AG-xxx + ลิงก์สมัครร้านค้า /register?ref=CODE + ปุ่ม copy')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Validation — สมัครตัวแทน</h4>
<table>
<tr><th>Field</th><th>Rule</th><th>Error Message (Thai)</th></tr>
<tr><td><strong>ชื่อ-นามสกุล</strong></td><td>Required, trim(), min 2 ตัวอักษร</td><td>"กรุณากรอกชื่อ (อย่างน้อย 2 ตัว)"</td></tr>
<tr><td><strong>เบอร์โทร</strong></td><td>Required, 10 หลักเท่านั้น<br>
ต้องขึ้นต้นด้วย 0<br>
✅ มือถือ: 06x, 08x, 09x<br>
❌ บ้าน (02-05) ไม่รับ — ตัวแทนต้องใช้มือถือ<br>
❌ พิมพ์ตัวอักษรไม่ได้ (digits only)<br>
maxLength=10</td><td>
"กรุณากรอกเบอร์โทร" (ว่าง)<br>
"เบอร์โทรต้อง 10 หลัก"<br>
"เบอร์โทรต้องขึ้นต้นด้วย 0"<br>
"เบอร์โทรต้องขึ้นต้นด้วย 06, 08 หรือ 09"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Agent Code Generation</h4>
<table>
<tr><th>ส่วน</th><th>Logic</th><th>ตัวอย่าง</th></tr>
<tr><td>Prefix</td><td>คงที่ "AG-"</td><td>AG-</td></tr>
<tr><td>ชื่อ</td><td>trim → UPPERCASE → ลบ space → ตัด 8 ตัวแรก</td><td>SOMCHAI</td></tr>
<tr><td>Random</td><td>4 ตัว alphanumeric (base36)</td><td>X4K2</td></tr>
<tr><td><strong>ผลลัพธ์</strong></td><td></td><td><strong>AG-SOMCHAI-X4K2</strong></td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Edge Cases</h4>
<table>
<tr><th>กรณี</th><th>ผลลัพธ์</th></tr>
<tr><td>Code ซ้ำใน DB (duplicate)</td><td>ระบบ retry สร้าง code ใหม่อัตโนมัติ (random suffix ใหม่)</td></tr>
<tr><td>Retry ซ้ำอีก</td><td>แสดง error</td></tr>
<tr><td>ชื่อสั้น 1 ตัว</td><td>Error: "กรุณากรอกชื่อ (อย่างน้อย 2 ตัว)"</td></tr>
<tr><td>เบอร์โทร 9 หลัก</td><td>Error: "เบอร์โทรต้อง 10 หลัก"</td></tr>
<tr><td>เบอร์ขึ้นต้น 02</td><td>Error: "เบอร์โทรต้องขึ้นต้นด้วย 06, 08 หรือ 09"</td></tr>
<tr><td>เบอร์ขึ้นต้น 1</td><td>Error: "เบอร์โทรต้องขึ้นต้นด้วย 0"</td></tr>
<tr><td>พิมพ์ตัวอักษร</td><td>พิมพ์ไม่ได้ (input รับเฉพาะตัวเลข)</td></tr>
<tr><td>พิมพ์เกิน 10 ตัว</td><td>พิมพ์ไม่ได้ (maxLength=10)</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">DB Operations</h4>
<table>
<tr><th>Table</th><th>Action</th><th>Fields</th></tr>
<tr><td><span class="mono">agents</span></td><td>INSERT</td><td>name, phone, line_id (null), code, active (default true)</td></tr>
</table>

<div class="note i">ตัวแทนขายไม่ต้องสร้าง account หรือ login — แค่กรอกชื่อ+เบอร์ก็ได้รหัสเลย</div>
</div>

<!-- ═══ Referral Flow ═══ -->
<div class="page">
<h2><span class="num" style="background:${c}">AG-02</span> ระบบ Referral — แนะนำร้านค้า</h2>
<div class="desc">ตัวแทนขายแชร์ลิงก์ให้ร้านอาหาร สมัครผ่านลิงก์ → ไม่ต้องจ่ายค่าแรกเข้า ฿1,399 (ตัวแทนรับ ฿999 โดยตรง)</div>

${S('1', c, 'ตัวแทนได้ Referral Link', 'หลังสมัครสำเร็จ ได้ลิงก์: /register?ref=AG-SOMCHAI-X4K2')}
${S('2', c, 'ตัวแทนส่งลิงก์ให้เจ้าของร้าน', 'ส่งผ่าน LINE / Facebook / ช่องทางอื่น')}
${S('3', c, 'เจ้าของร้านกดลิงก์ → หน้า /register', 'ระบบจับ ?ref=CODE จาก URL อัตโนมัติ')}
${S('4', c, 'เจ้าของร้านสมัครตามปกติ', 'กรอก Step 1 (account) → Step 2 (shop) → แสดง banner "รหัสตัวแทน: CODE — ไม่ต้องเสียค่าแรกเข้า ฿1,399"')}
${SL('5', c, 'สมัครสำเร็จ → setup_fee_paid=true + trial 7 วัน', 'self_register_shop RPC: shop.referral_code=CODE, setup_fee_paid=true — trial เริ่มนับเมื่อเพิ่มสินค้าชิ้นแรก (first_product_at) เหมือน direct user — หลังหมด trial จ่าย ฿199/เดือน (ไม่ใช่ ฿1,399)')}

<h4 style="color:#1e40af;margin:8px 0 4px;">Referral URL Cases</h4>
<table>
<tr><th>URL</th><th>ผลลัพธ์</th></tr>
<tr><td><span class="mono">/register?ref=AG-SOMCHAI-X4K2</span></td><td>แสดง banner สีเหลือง "รหัสตัวแทน: AG-SOMCHAI-X4K2 — ไม่ต้องเสียค่าแรกเข้า ฿1,399"<br>ส่ง p_referral_code ไปที่ RPC</td></tr>
<tr><td><span class="mono">/register</span> (ไม่มี ?ref)</td><td>ไม่แสดง banner, ส่ง p_referral_code=null → ต้องจ่าย ฿1,399 เมื่อหมด trial</td></tr>
<tr><td><span class="mono">/register?ref=INVALID</span></td><td>ส่ง code ไป RPC — ถ้า code ไม่มีใน agents table ระบบอาจ ignore หรือ error (ขึ้นกับ RPC logic)</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">Referral Code ในหน้า Paywall (หลังหมด trial)</h4>
<table>
<tr><th>กรณี</th><th>ผลลัพธ์</th></tr>
<tr><td>ไม่ได้สมัครผ่าน referral + หมด trial</td><td>Paywall ขึ้น — มีช่องกรอก "รหัสตัวแทน" + ปุ่ม ✓</td></tr>
<tr><td>กรอก code ถูกต้อง (agents table, active=true)</td><td>setup_fee_paid=true → ปิด paywall → ใช้งานต่อได้</td></tr>
<tr><td>กรอก code ไม่ถูก</td><td>Error: "รหัสตัวแทนไม่ถูกต้อง"</td></tr>
<tr><td>กรอก code ว่าง</td><td>Error: "กรุณากรอกรหัสตัวแทน"</td></tr>
</table>

<h4 style="color:#1e40af;margin:8px 0 4px;">รายได้ตัวแทน</h4>
<table>
<tr><th>รายการ</th><th>จำนวน</th><th>วิธีเก็บ</th></tr>
<tr><td>ค่าแนะนำต่อร้าน</td><td>฿999</td><td>ตัวแทนเก็บจากเจ้าของร้านโดยตรง</td></tr>
<tr><td>ค่ารายเดือน</td><td>-</td><td>ไม่ได้ส่วนแบ่ง (฿199/เดือน จ่ายให้ระบบ)</td></tr>
</table>

<div class="note w">ตัวแทนขายไม่มี dashboard ดูยอด — แค่ได้รหัส + ลิงก์ แล้วเก็บเงินจากร้านค้าโดยตรง</div>
<div class="note i">Banner ในหน้า register: "รับ ฿999 ทุกร้านที่แนะนำสำเร็จ" + "แนะนำร้านอาหาร/คาเฟ่ เก็บค่าแนะนำโดยตรง"</div>
</div>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// MAIN — Generate PDFs
// ═══════════════════════════════════════════════════════════════
async function main() {
  if (!fs.existsSync(REPORTS)) fs.mkdirSync(REPORTS, { recursive: true })

  const roles = [
    { name: 'owner', fn: ownerQA },
    { name: 'customer', fn: customerQA },
    { name: 'cashier', fn: cashierQA },
    { name: 'admin', fn: adminQA },
    { name: 'agent', fn: agentQA },
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
      format: 'A4',
      printBackground: true,
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
    })
    await page.close()
    console.log(`Done: QA-UserFlow-${role.name}.pdf`)
  }
  await browser.close()
  console.log('\nAll 4 PDFs generated!')
}

main()

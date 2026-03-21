import { chromium } from '@playwright/test'
import * as path from 'path'

const REPORTS = path.resolve(__dirname, 'reports')

const HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1e293b;font-size:11.5px;line-height:1.5}
.cover{page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#0f172a,#0f2b1a)}
.cover h1{font-size:2.4rem;color:white;margin-bottom:8px;font-weight:800}
.cover .sub{color:#86efac;font-size:1rem;margin-bottom:24px}
.cover .badge{display:inline-block;padding:8px 24px;border-radius:20px;background:#22c55e;color:white;font-size:0.9rem;font-weight:700;margin-bottom:10px}
.cover .date{color:#6b7280;font-size:0.75rem;margin-top:20px}
.cover .stack{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.cover .stack span{background:#1e3a8a;color:#93c5fd;padding:4px 12px;border-radius:12px;font-size:0.72rem;font-weight:600}

.page{padding:22px 26px;page-break-before:always}
.page:first-of-type{page-break-before:auto}
h2{font-size:1.15rem;color:#15803d;margin-bottom:4px;padding-bottom:6px;border-bottom:2px solid #dcfce7}
h3{font-size:0.92rem;color:#166534;margin:12px 0 5px;font-weight:700}
h4{font-size:0.8rem;color:#374151;margin:8px 0 3px;font-weight:700}

table{width:100%;border-collapse:collapse;font-size:0.72rem;margin:6px 0}
th{text-align:left;padding:5px 8px;background:#166534;color:white;font-weight:600;border:1px solid #15803d}
td{padding:5px 8px;border:1px solid #e2e8f0;vertical-align:top}
tr:nth-child(even) td{background:#f0fdf4}

.note{padding:5px 9px;border-radius:5px;font-size:0.7rem;line-height:1.4;margin:5px 0}
.note.blue{background:#eff6ff;color:#1e40af;border-left:3px solid #3b82f6}
.note.green{background:#f0fdf4;color:#166534;border-left:3px solid #22c55e}
.note.yellow{background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b}
.note.red{background:#fef2f2;color:#991b1b;border-left:3px solid #ef4444}

.mono{font-family:'SF Mono',monospace;font-size:0.68rem;background:#f1f5f9;padding:1px 4px;border-radius:3px;color:#0f172a}
.code-block{background:#0f172a;color:#e2e8f0;padding:10px 12px;border-radius:6px;font-family:'SF Mono',monospace;font-size:0.68rem;line-height:1.6;margin:6px 0;white-space:pre}
.code-block .k{color:#86efac}.code-block .s{color:#fca5a5}.code-block .c{color:#6b7280}.code-block .f{color:#93c5fd}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}
.card{border:1px solid #e2e8f0;border-radius:7px;padding:10px}
.card h4{margin-top:0;color:#166534}

.flow{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:6px 0;font-size:0.72rem}
.flow-box{background:#f0fdf4;border:1px solid #86efac;border-radius:5px;padding:3px 8px;color:#166534;font-weight:600}
.flow-arrow{color:#86efac;font-weight:700}

.sep{height:1px;background:#e2e8f0;margin:12px 0}
.tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:0.62rem;font-weight:700;color:white}
.tag.g{background:#22c55e}.tag.b{background:#3b82f6}.tag.r{background:#ef4444}.tag.y{background:#f59e0b}.tag.p{background:#8b5cf6}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="badge">Developer Documentation</div>
  <h1>QRforPay (Kopicha)</h1>
  <div class="sub">Technical Reference — Architecture, APIs, DB Schema, Business Logic</div>
  <div class="stack">
    <span>Next.js 15</span><span>React 19</span><span>TypeScript</span>
    <span>Supabase</span><span>Tailwind CSS</span><span>Omise</span><span>Vercel</span>
  </div>
  <div class="date">อัปเดต: มีนาคม 2569 · github.com/Ibrahimdata1/kopicha · qrforpaytest.vercel.app</div>
</div>

<!-- PAGE 1: Architecture -->
<div class="page">
<h2>1. Architecture Overview</h2>

<h3>1.1 Tech Stack</h3>
<table>
<tr><th>Layer</th><th>Technology</th><th>Version</th><th>Purpose</th></tr>
<tr><td>Framework</td><td>Next.js (App Router)</td><td>15.5.12</td><td>SSR + API Routes + Middleware</td></tr>
<tr><td>UI</td><td>React</td><td>19.0.0</td><td>Component-based UI</td></tr>
<tr><td>Language</td><td>TypeScript</td><td>5.6.3</td><td>Type safety</td></tr>
<tr><td>Styling</td><td>Tailwind CSS</td><td>3.4.15</td><td>Utility-first CSS</td></tr>
<tr><td>Database</td><td>Supabase (PostgreSQL)</td><td>2.45.0</td><td>DB + Auth + Realtime + Storage</td></tr>
<tr><td>Payment</td><td>Omise / Opn Payments</td><td>1.1.0</td><td>PromptPay QR auto-confirm</td></tr>
<tr><td>Deploy</td><td>Vercel</td><td>—</td><td>Edge functions + CDN</td></tr>
<tr><td>Testing</td><td>Playwright</td><td>1.58.2</td><td>E2E + adversarial QA</td></tr>
</table>

<h3>1.2 Project Structure</h3>
<div class="grid2">
<div class="card">
<h4>App Router (Next.js)</h4>
<div class="mono">/app</div><br>
<div class="mono">&nbsp;├─ page.tsx</div> Landing page<br>
<div class="mono">&nbsp;├─ login/</div> Auth pages<br>
<div class="mono">&nbsp;├─ register/</div> Signup flow<br>
<div class="mono">&nbsp;├─ order/</div> Customer order page<br>
<div class="mono">&nbsp;├─ pos/</div> Owner/Cashier POS<br>
<div class="mono">&nbsp;├─ api/</div> 9 API routes<br>
<div class="mono">&nbsp;└─ agent/</div> Partner lookup
</div>
<div class="card">
<h4>Shared Code</h4>
<div class="mono">/components</div> Reusable UI<br>
<div class="mono">/lib</div> Supabase clients, types<br>
<div class="mono">/middleware.ts</div> Route protection<br>
<div class="mono">/e2e</div> Playwright tests + PDF gen<br>
<div class="mono">/supabase</div> SQL migrations<br>
<div class="mono">/public</div> Static assets
</div>
</div>

<h3>1.3 Request Flow</h3>
<div class="flow">
  <div class="flow-box">Browser</div><div class="flow-arrow">→</div>
  <div class="flow-box">Vercel Edge</div><div class="flow-arrow">→</div>
  <div class="flow-box">middleware.ts (Auth check)</div><div class="flow-arrow">→</div>
  <div class="flow-box">Next.js App Router</div><div class="flow-arrow">→</div>
  <div class="flow-box">Server Component / API Route</div><div class="flow-arrow">→</div>
  <div class="flow-box">Supabase (PostgreSQL + RLS)</div>
</div>

<h3>1.4 Auth Architecture</h3>
<div class="note blue">Supabase Auth (JWT) — SSR cookie-based session via <span class="mono">@supabase/ssr</span><br>
• <span class="mono">lib/supabase-server.ts</span> — Server-side client (reads cookies, for API routes)<br>
• <span class="mono">lib/supabase-browser.ts</span> — Browser client singleton (for client components)<br>
• <span class="mono">middleware.ts</span> — Refreshes session token on every request, enforces route access</div>

<h3>1.5 Role-Based Access</h3>
<table>
<tr><th>Role</th><th>Protected Routes</th><th>Supabase RLS</th></tr>
<tr><td><span class="tag p">super_admin</span></td><td>All <span class="mono">/pos/*</span> + <span class="mono">/pos/admin</span></td><td>Full access, no subscription check</td></tr>
<tr><td><span class="tag b">owner</span></td><td>All <span class="mono">/pos/*</span></td><td>Own shop data only, passes SubscriptionGuard</td></tr>
<tr><td><span class="tag g">cashier</span></td><td><span class="mono">/pos/sessions</span>, <span class="mono">/pos/orders</span></td><td>Own shop sessions/orders only</td></tr>
<tr><td><span class="tag y">null</span></td><td><span class="mono">/pending</span> only</td><td>Awaiting approval</td></tr>
<tr><td>anon</td><td><span class="mono">/order</span> (customer)</td><td>Active session read + order insert</td></tr>
</table>
</div>

<!-- PAGE 2: API Routes + DB -->
<div class="page">
<h2>2. API Routes</h2>

<table>
<tr><th>Route</th><th>Method</th><th>Auth</th><th>Purpose</th><th>Key Logic</th></tr>
<tr><td><span class="mono">/api/omise/create-charge</span></td><td>POST</td><td>Authenticated</td><td>Create PromptPay QR</td><td>Omise charges.create({type:'promptpay', metadata:{shopId}})</td></tr>
<tr><td><span class="mono">/api/omise/webhook</span></td><td>POST</td><td>Public (HMAC)</td><td>Payment auto-confirm</td><td>charge.complete + status=successful → update subscription_paid_until</td></tr>
<tr><td><span class="mono">/api/create-cashier</span></td><td>POST</td><td>Owner/Admin</td><td>Create cashier account</td><td>Supabase admin.createUser + store creds in storage bucket</td></tr>
<tr><td><span class="mono">/api/cashier-credentials</span></td><td>GET</td><td>Owner/Admin</td><td>Retrieve cashier creds</td><td>Read from <span class="mono">cashier-creds</span> storage bucket (scoped to shopId)</td></tr>
<tr><td><span class="mono">/api/reset-cashier-password</span></td><td>POST</td><td>Owner/Admin</td><td>Reset cashier password</td><td>admin.updateUserById + update creds JSON in storage</td></tr>
<tr><td><span class="mono">/api/resolve-username</span></td><td>POST</td><td>Public</td><td>Username → email</td><td>SELECT email FROM profiles WHERE email LIKE '%@shopId.cashier'</td></tr>
<tr><td><span class="mono">/api/check-email</span></td><td>POST</td><td>Public</td><td>Email uniqueness</td><td>Check auth.users via admin API</td></tr>
<tr><td><span class="mono">/api/check-shop-name</span></td><td>POST</td><td>Public</td><td>Shop name uniqueness</td><td>SELECT from shops WHERE lower(name) = lower(input)</td></tr>
<tr><td><span class="mono">/api/upload-product-image</span></td><td>POST</td><td>Authenticated</td><td>Upload product photo</td><td>5MB limit, jpg/png/webp/gif → <span class="mono">product-images</span> bucket</td></tr>
</table>

<div class="sep"></div>
<h2>3. Database Schema</h2>

<h3>3.1 Core Tables</h3>
<table>
<tr><th>Table</th><th>Key Columns</th><th>Purpose</th></tr>
<tr><td><span class="mono">profiles</span></td><td>id, role, shop_id, email, full_name</td><td>User roles & shop assignment (linked to auth.users)</td></tr>
<tr><td><span class="mono">shops</span></td><td>id, name, owner_id, promptpay_id, table_count, payment_mode, setup_fee_paid, subscription_paid_until, first_product_at, is_deleted</td><td>Shop config + subscription state</td></tr>
<tr><td><span class="mono">products</span></td><td>id, shop_id, name, price, category_id, image_url, is_available</td><td>Menu items per shop</td></tr>
<tr><td><span class="mono">categories</span></td><td>id, shop_id, name, sort_order</td><td>Product grouping</td></tr>
<tr><td><span class="mono">customer_sessions</span></td><td>id, shop_id, table_number, status, created_at</td><td>QR session lifecycle per table visit</td></tr>
<tr><td><span class="mono">orders</span></td><td>id, shop_id, customer_session_id, status, total_amount, order_source, payment_method</td><td>Order transactions</td></tr>
<tr><td><span class="mono">order_items</span></td><td>id, order_id, product_id, quantity, unit_price, item_status</td><td>Line items per order</td></tr>
<tr><td><span class="mono">payments</span></td><td>id, order_id, method, status, confirmed_by</td><td>Payment records</td></tr>
<tr><td><span class="mono">agents</span></td><td>id, code, active</td><td>Referral/partner codes</td></tr>
<tr><td><span class="mono">system_config</span></td><td>key, value</td><td>Company PromptPay, global settings</td></tr>
</table>

<h3>3.2 Storage Buckets</h3>
<table>
<tr><th>Bucket</th><th>Access</th><th>Content</th></tr>
<tr><td><span class="mono">product-images</span></td><td>Public read, auth write</td><td>Product photos (5MB max, jpg/png/webp/gif)</td></tr>
<tr><td><span class="mono">cashier-creds</span></td><td>Owner + admin only</td><td>JSON {username, password} per cashier, path: {shopId}/{userId}.json</td></tr>
<tr><td><span class="mono">shop-logos</span></td><td>Public read, owner write</td><td>Shop logo images (2MB max)</td></tr>
</table>
</div>

<!-- PAGE 3: Business Logic -->
<div class="page">
<h2>4. Subscription Business Logic</h2>

<h3>4.1 Constants</h3>
<div class="code-block"><span class="k">const</span> TRIAL_DAYS  = <span class="s">7</span>   <span class="c">// นับจาก first_product_at</span>
<span class="k">const</span> GRACE_DAYS  = <span class="s">7</span>   <span class="c">// วันหลังหมดอายุที่ยังใช้งานได้ (แสดง banner)</span>
<span class="k">const</span> SETUP_FEE   = <span class="s">1399</span> <span class="c">// ฿ — direct user one-time fee</span>
<span class="k">const</span> MONTHLY_FEE = <span class="s">199</span>  <span class="c">// ฿ — monthly renewal</span></div>

<h3>4.2 User Types & States</h3>
<table>
<tr><th>Type</th><th>setup_fee_paid</th><th>subscription_paid_until</th><th>first_product_at</th><th>State</th></tr>
<tr><td>Direct — no products yet</td><td>false</td><td>null</td><td>null</td><td>Trial not started</td></tr>
<tr><td>Direct — in trial</td><td>false</td><td>null</td><td>set</td><td>trialDaysLeft > 0</td></tr>
<tr><td>Direct — trial expired</td><td>false</td><td>null / set+overdue</td><td>set</td><td>BLOCKED → paywall ฿1,399</td></tr>
<tr><td>Referral — in trial</td><td>true</td><td>null</td><td>set</td><td>paidTrialDaysLeft > 0</td></tr>
<tr><td>Referral — trial expired</td><td>true</td><td>null</td><td>set (+ 7d past)</td><td>BLOCKED → paywall ฿199</td></tr>
<tr><td>Paid — active</td><td>true</td><td>future date</td><td>set</td><td>Normal operation</td></tr>
<tr><td>Paid — grace period</td><td>true</td><td>past 1–7 days</td><td>set</td><td>Banner shown, still works</td></tr>
<tr><td>Paid — blocked</td><td>true</td><td>past > 7 days</td><td>set</td><td>BLOCKED → paywall ฿199</td></tr>
</table>

<h3>4.3 Fair Expiry Formula</h3>
<div class="code-block"><span class="c">// สูตร: max(originalExpiry, today) + 1 calendar month</span>
<span class="c">// ใช้ทั้ง webhook และ frontend (calcFairExpiry / calcNewExpiry)</span>

<span class="k">function</span> <span class="f">calcNewExpiry</span>(currentExpiry, firstProductAt) {
  <span class="k">const</span> today = <span class="f">getBangkokToday</span>() <span class="c">// Asia/Bangkok fixed tz</span>

  <span class="c">// Trial user (no subscription yet)</span>
  <span class="k">if</span> (!currentExpiry) {
    <span class="k">const</span> trialEnd = firstProductAt + TRIAL_DAYS
    <span class="k">const</span> base = trialEnd > today ? trialEnd : today
    <span class="k">return</span> <span class="f">addOneMonth</span>(base)
  }

  <span class="c">// Paid user: max(original, today) → no paradox</span>
  <span class="k">const</span> orig = <span class="f">parse</span>(currentExpiry)
  <span class="k">const</span> base = orig > today ? orig : today
  <span class="k">return</span> <span class="f">addOneMonth</span>(base)
}</div>

<div class="note yellow">ก่อนหน้านี้ใช้ <span class="mono">daysLate &lt;= GRACE_DAYS → orig+1 / else today+1</span> ซึ่งทำให้คนจ่ายช้า 8 วันได้วันมากกว่าคนจ่ายช้า 7 วัน → แก้เป็น max() แล้ว</div>

<h3>4.4 Timezone</h3>
<div class="code-block"><span class="c">// ใช้ Asia/Bangkok fixed timezone เสมอ — รองรับ owner ต่างประเทศ</span>
<span class="k">function</span> <span class="f">getBangkokToday</span>(): Date {
  <span class="k">const</span> str = <span class="k">new</span> Intl.DateTimeFormat(<span class="s">'en-CA'</span>, { timeZone: <span class="s">'Asia/Bangkok'</span> }).<span class="f">format</span>(<span class="k">new</span> Date())
  <span class="k">return</span> <span class="k">new</span> Date(str + <span class="s">'T00:00:00+07:00'</span>) <span class="c">// +07:00 required!</span>
}
<span class="k">function</span> <span class="f">parseBangkokDate</span>(str: string): Date {
  <span class="k">return</span> <span class="k">new</span> Date(str.<span class="f">slice</span>(0,10) + <span class="s">'T00:00:00+07:00'</span>)
}</div>
</div>

<!-- PAGE 4: Payment Flow + Order Flow -->
<div class="page">
<h2>5. Omise Payment Integration</h2>

<h3>5.1 Subscription Payment Flow</h3>
<div class="flow">
  <div class="flow-box">Owner กด "แสดง QR"</div><div class="flow-arrow">→</div>
  <div class="flow-box">POST /api/omise/create-charge</div><div class="flow-arrow">→</div>
  <div class="flow-box">Omise API: charges.create(promptpay)</div><div class="flow-arrow">→</div>
  <div class="flow-box">QR image URL returned</div><div class="flow-arrow">→</div>
  <div class="flow-box">Owner scans + pays</div><div class="flow-arrow">→</div>
  <div class="flow-box">Omise fires charge.complete webhook</div><div class="flow-arrow">→</div>
  <div class="flow-box">POST /api/omise/webhook</div><div class="flow-arrow">→</div>
  <div class="flow-box">UPDATE shops SET subscription_paid_until</div><div class="flow-arrow">→</div>
  <div class="flow-box">Frontend poll (4s) detects change → reload</div>
</div>

<h3>5.2 Webhook Logic</h3>
<div class="code-block"><span class="c">// POST /api/omise/webhook</span>
<span class="k">if</span> (body.key !== <span class="s">'charge.complete'</span>) <span class="k">return</span> ok
<span class="k">if</span> (charge.status !== <span class="s">'successful'</span>) <span class="k">return</span> ok

<span class="k">const</span> shopId = charge.metadata?.shopId
<span class="k">const</span> shop = <span class="k">await</span> supabase.from(<span class="s">'shops'</span>).<span class="f">select</span>(<span class="s">'subscription_paid_until, setup_fee_paid, first_product_at'</span>)
<span class="k">const</span> amountBaht = charge.amount / <span class="s">100</span>

<span class="k">const</span> updates = { subscription_paid_until: <span class="f">calcNewExpiry</span>(shop) }
<span class="k">if</span> (amountBaht >= <span class="s">1399</span>) updates.setup_fee_paid = <span class="k">true</span> <span class="c">// Direct user first payment</span>

<span class="k">await</span> supabase.from(<span class="s">'shops'</span>).<span class="f">update</span>(updates).<span class="f">eq</span>(<span class="s">'id'</span>, shopId)
<span class="c">// Service role key used — bypasses RLS</span></div>

<h3>5.3 Frontend Polling</h3>
<div class="code-block"><span class="c">// Poll every 4s after QR shown — detect webhook update</span>
<span class="k">const</span> interval = <span class="f">setInterval</span>(<span class="k">async</span> () => {
  <span class="k">const</span> { data } = <span class="k">await</span> supabase.from(<span class="s">'shops'</span>)
    .<span class="f">select</span>(<span class="s">'subscription_paid_until, setup_fee_paid'</span>).<span class="f">eq</span>(<span class="s">'id'</span>, shopId)
  <span class="k">if</span> (data.subscription_paid_until !== prev.expiry || data.setup_fee_paid !== prev.paid) {
    <span class="f">setOmisePaid</span>(<span class="k">true</span>)
    <span class="f">setTimeout</span>(() => window.location.<span class="f">reload</span>(), <span class="s">1500</span>)
  }
}, <span class="s">4000</span>)</div>

<div class="sep"></div>
<h2>6. Order & Session Flow</h2>

<h3>6.1 Customer Order Flow</h3>
<div class="flow">
  <div class="flow-box">Staff opens table → QR generated</div><div class="flow-arrow">→</div>
  <div class="flow-box">customer_sessions INSERT (status=active)</div><div class="flow-arrow">→</div>
  <div class="flow-box">Customer scans /order?session=UUID</div><div class="flow-arrow">→</div>
  <div class="flow-box">Customer selects items + submits</div><div class="flow-arrow">→</div>
  <div class="flow-box">orders INSERT (source=customer)</div><div class="flow-arrow">→</div>
  <div class="flow-box">Staff sees via Realtime subscription</div><div class="flow-arrow">→</div>
  <div class="flow-box">Payment confirmed → orders.status=completed</div><div class="flow-arrow">→</div>
  <div class="flow-box">customer_sessions.status=paid</div>
</div>

<h3>6.2 Payment Modes</h3>
<table>
<tr><th>Mode</th><th>payment_mode</th><th>Flow</th><th>Confirmed By</th></tr>
<tr><td>จ่ายที่เคาน์เตอร์</td><td><span class="mono">counter</span></td><td>ลูกค้าไปจ่าย cashier → cashier กด "ยืนยันรับเงิน"</td><td>Cashier (manual)</td></tr>
<tr><td>จ่ายเองอัตโนมัติ</td><td><span class="mono">auto</span></td><td>ลูกค้าสแกน PromptPay QR ของร้าน → Realtime detect</td><td>System (auto)</td></tr>
</table>
</div>

<!-- PAGE 5: Key Patterns + Testing -->
<div class="page">
<h2>7. Key Code Patterns</h2>

<h3>7.1 SubscriptionGuard Component</h3>
<div class="note blue"><span class="mono">components/SubscriptionGuard.tsx</span> — wraps all <span class="mono">/pos/*</span> pages via <span class="mono">app/pos/layout.tsx</span><br>
Computes: trialDaysLeft, daysOverdue, daysUntilExpiry, inGrace, isBlocked, paidTrialExpired<br>
Renders: children (normal) / yellow banner (near expiry) / red banner (grace) / paywall fullscreen (blocked)</div>

<h3>7.2 Cashier Login Pattern</h3>
<div class="code-block"><span class="c">// Cashier email format stored in auth.users:</span>
<span class="s">"{username}@{shopId.slice(0,8)}.cashier"</span>

<span class="c">// Login: user types "username" → resolve-username API converts to email</span>
POST /api/resolve-username { username: <span class="s">"ken"</span>, shopPattern: <span class="s">"%.cashier"</span> }
<span class="c">// → returns full email for Supabase auth.signInWithPassword()</span></div>

<h3>7.3 RLS Policies (key examples)</h3>
<table>
<tr><th>Table</th><th>Policy</th><th>Condition</th></tr>
<tr><td>shops</td><td>Owner read/write</td><td><span class="mono">auth.uid() = owner_id OR profile.role = 'super_admin'</span></td></tr>
<tr><td>products</td><td>Public read (customer menu)</td><td><span class="mono">is_available = true AND shop is active</span></td></tr>
<tr><td>orders</td><td>Anon insert</td><td><span class="mono">customer_session.status = 'active'</span></td></tr>
<tr><td>system_config</td><td>Super admin only</td><td><span class="mono">profile.role = 'super_admin'</span></td></tr>
</table>

<h3>7.4 Validation Rules</h3>
<table>
<tr><th>Field</th><th>Rule</th><th>Code Pattern</th></tr>
<tr><td>PromptPay</td><td>10 digits (mobile) or 13 digits (tax ID)</td><td>Strip non-digits → check length</td></tr>
<tr><td>Phone</td><td>10 digits, starts 06/08/09</td><td><span class="mono">/^(06|08|09)\d{8}$/</span></td></tr>
<tr><td>Password</td><td>≥8 chars + ≥1 digit + ASCII only</td><td><span class="mono">/[0-9]/.test(pw) && /^[\x20-\x7E]+$/</span></td></tr>
<tr><td>Username</td><td>3–30 chars, a-z 0-9 _ only</td><td><span class="mono">/^[a-z0-9_]{3,30}$/</span></td></tr>
</table>

<div class="sep"></div>
<h2>8. Testing</h2>

<h3>8.1 E2E Test Commands</h3>
<div class="code-block">npx playwright test                              <span class="c"># All tests</span>
npx playwright test e2e/adversarial.spec.ts      <span class="c"># Security + edge cases</span>
npx playwright test e2e/user-journey.spec.ts     <span class="c"># Happy paths</span>
npx playwright test --headed                     <span class="c"># Headed (visual)</span>

npx tsx e2e/generate-bizlogic-pdf.ts             <span class="c"># BizLogic PDF</span>
npx tsx e2e/generate-qa-pdfs.ts                  <span class="c"># User Journey PDFs (4 roles)</span>
npx tsx e2e/generate-customer-doc.ts             <span class="c"># Customer guide PDF</span>
npx tsx e2e/generate-dev-doc.ts                  <span class="c"># This dev doc PDF</span></div>

<h3>8.2 QA Categories (adversarial.spec.ts)</h3>
<div class="grid2">
<div class="card"><h4>🔴 Security</h4>XSS injection, SQL injection, Auth bypass, Parameter tampering, API method enforcement</div>
<div class="card"><h4>🟠 Validation</h4>Boundary values, Empty submissions, Format rules (phone/email/PromptPay), 1000+ char overflow</div>
<div class="card"><h4>🟡 UX</h4>Double submit prevention, Loading states, Back button, State preservation, Error recovery</div>
<div class="card"><h4>🟢 Responsive</h4>320px / 375px / 768px / 1280px / 1920px + landscape mobile 812x375</div>
</div>

<div class="sep"></div>
<h2>9. Environment Variables</h2>
<table>
<tr><th>Variable</th><th>Usage</th></tr>
<tr><td><span class="mono">NEXT_PUBLIC_SUPABASE_URL</span></td><td>Supabase project URL (public)</td></tr>
<tr><td><span class="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span></td><td>Supabase anon key (public, RLS enforced)</td></tr>
<tr><td><span class="mono">SUPABASE_SERVICE_ROLE_KEY</span></td><td>Bypass RLS — used only in API routes (server-side only)</td></tr>
<tr><td><span class="mono">OMISE_SECRET_KEY</span></td><td>Omise server-side key — create charges, verify webhooks</td></tr>
<tr><td><span class="mono">OMISE_PUBLIC_KEY</span></td><td>Omise client-side key (not currently used server-side)</td></tr>
</table>
<div class="note red">⚠️ SUPABASE_SERVICE_ROLE_KEY และ OMISE_SECRET_KEY ต้องไม่ถูก expose ฝั่ง client เด็ดขาด — ใช้เฉพาะใน API routes เท่านั้น</div>

<h2>10. Deployment</h2>
<div class="code-block">vercel --prod          <span class="c"># Deploy to production</span>
<span class="c"># URL: qrforpaytest.vercel.app (NOT kopicha.vercel.app)</span>
<span class="c"># Auto-deploy: ทุกครั้งที่มี significant code change</span>
<span class="c"># Post-deploy: test API routes with curl on production</span></div>
</div>

</body>
</html>`

async function generate() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(HTML, { waitUntil: 'networkidle' })
  const outPath = `${REPORTS}/DevDoc-QRforPay.pdf`
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

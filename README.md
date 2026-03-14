# Kopicha POS

ระบบ POS สำหรับร้านกาแฟและร้านอาหาร พร้อมระบบสั่งอาหารผ่าน QR Code

**Production:** https://kopicha.vercel.app

---

## สำหรับลูกค้า (Customer Guide)

### วิธีใช้งาน

1. **สแกน QR Code** ที่โต๊ะ — เปิดหน้าเมนูอัตโนมัติ
2. **เลือกเมนู** — กดปุ่ม "+ เพิ่ม" แล้วเลือกจำนวน
3. **ดูตะกร้า** — กดปุ่ม "ดูตะกร้า" ด้านล่าง ตรวจสอบรายการ
4. **สั่งอาหาร** — กด "สั่งอาหาร" ออเดอร์จะส่งไปครัวทันที
5. **สั่งเพิ่ม** — กลับหน้าเมนู เลือกเมนูเพิ่ม แล้วกดสั่งอีกรอบได้เรื่อยๆ
6. **ชำระเงิน** — แจ้งพนักงานที่เคาน์เตอร์ (หรือสแกน QR PromptPay ถ้าร้านเปิดโหมดอัตโนมัติ)

### หมายเหตุ
- ลูกค้า **ไม่สามารถยกเลิก** ออเดอร์ได้ ต้องแจ้งพนักงาน
- ถ้า QR Code หาย แจ้งพนักงานพิมพ์ใหม่ได้
- รายการที่สั่งแล้วจะแสดงรวมเป็นเมนูเดียว (เช่น กาแฟ ×3) ไม่แยกรอบการสั่ง

---

## สำหรับร้านค้า (Shop Staff Guide)

### เข้าสู่ระบบ
- ไปที่ `/login` ล็อกอินด้วย email + password
- ร้านใหม่: สมัครที่ `/register` → รอ super admin อนุมัติ

### หน้าหลัก

| เมนู | เส้นทาง | คำอธิบาย |
|------|---------|----------|
| จัดการโต๊ะ | `/pos/tables` | ดูสถานะโต๊ะ, เปิดบิล, ย้ายโต๊ะ, ดูรายการ, รับชำระ |
| QR Sessions | `/pos/sessions` | สร้าง QR สำหรับลูกค้า, ดู session ที่ active |
| ประวัติ QR | `/pos/sessions/history` | ดู/พิมพ์ QR เก่า |
| บิลทั้งหมด | `/pos/orders` | ดูบิลแยกตามสถานะ (รอชำระ/ชำระแล้ว/ยกเลิก) |
| จัดการเมนู | `/pos/products` | เพิ่ม/แก้/ลบ เมนูอาหาร, หมวดหมู่, ราคา, รูปภาพ |
| แดชบอร์ด | `/pos/dashboard` | สรุปยอดขาย, สถิติ |
| ตั้งค่า | `/pos/settings` | ข้อมูลร้าน, จำนวนโต๊ะ, โลโก้, ทีมงาน |

### การจัดการโต๊ะ (`/pos/tables`)
- **โต๊ะว่าง (เขียว):** กดเพื่อเปิดบิลใหม่ → สร้าง QR อัตโนมัติ
- **โต๊ะไม่ว่าง (เหลือง):** กดเพื่อดูรายละเอียด
  - ดูรายการแยกเป็น **ชุดที่ 1, 2, 3...** ตามรอบที่ลูกค้าสั่ง
  - ลบเมนูได้ทีละรายการ (ไม่เด้งออกจากหน้า)
  - รับชำระเงิน: เงินสด หรือ รับโอน
  - พิมพ์ใบเสร็จ 80mm
  - ย้ายโต๊ะ
  - ยกเลิกบิล
- **ย้ายโต๊ะ:** กดไอคอน ⇄ → เลือกโต๊ะว่างที่ต้องการย้ายไป

### แจ้งเตือนออเดอร์
- เมื่อลูกค้าสั่งอาหาร จะมี **popup แจ้งเตือน** พร้อมเสียง
- แสดงโต๊ะ, รายการ, ยอดเงิน
- กด **"รับออเดอร์"** เพื่อปิดแจ้งเตือน (ออเดอร์ถูกบันทึกแล้วตั้งแต่ลูกค้ากดสั่ง)
- ถ้ามีหลายออเดอร์พร้อมกัน จะเข้าคิวแสดงทีละอัน

### Realtime
- ลูกค้าสั่ง → ร้านเห็นทันที (polling 3-5 วินาที + Supabase Realtime)
- ร้านลบเมนู → ลูกค้าเห็นทันที
- ร้านเปลี่ยนชื่อร้าน/เมนู → ลูกค้าเห็นทันที

---

## สำหรับ Developer

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (dark mode: `class`)
- **Database:** Supabase (PostgreSQL + Realtime + Storage + Auth)
- **Auth:** `@supabase/ssr` (cookie-based sessions)
- **Icons:** `lucide-react`
- **QR:** `qrcode.react`
- **Deployment:** Vercel

### Quick Start

```bash
git clone <repo>
cd kopicha
npm install
cp .env.example .env.local   # ใส่ Supabase keys
npm run dev                   # http://localhost:3000
```

### Project Structure

```
kopicha/
├── app/
│   ├── layout.tsx            # Root layout (Inter font, theme, viewport)
│   ├── globals.css           # Tailwind + custom styles
│   ├── page.tsx              # Redirect → /pos or /login
│   ├── login/                # Login page
│   ├── register/             # Register + shop setup
│   ├── pending/              # Awaiting approval
│   ├── order/                # Customer ordering (public, no auth)
│   ├── auth/callback/        # OAuth callback route
│   └── pos/
│       ├── layout.tsx        # POS layout (nav, auth guard, subscription, notifications)
│       ├── tables/           # Table management
│       ├── sessions/         # QR session management + history
│       ├── orders/           # Bills view
│       ├── products/         # Menu management
│       ├── dashboard/        # Sales stats
│       ├── settings/         # Shop settings
│       └── admin/            # Super admin panel
├── components/
│   ├── PosNav.tsx            # Side/bottom navigation
│   ├── SessionDetailModal.tsx # Table detail: items, payment, receipt
│   ├── SessionsView.tsx      # Active sessions list
│   ├── OrdersView.tsx        # Bills list with filters
│   ├── OrderNotification.tsx  # New order popup + sound
│   ├── GenerateSessionModal.tsx # Create new QR session
│   ├── ConfirmDialog.tsx     # Reusable confirm dialog hook
│   └── SubscriptionGuard.tsx  # Subscription paywall
├── lib/
│   ├── types.ts              # All TypeScript interfaces
│   ├── supabase-browser.ts   # Client-side Supabase client
│   ├── supabase-server.ts    # Server-side Supabase client
│   ├── pos-context.tsx       # PosProvider (profile + shop context)
│   ├── qr.ts                 # PromptPay QR generation + URL builder
│   └── theme-provider.tsx    # Dark/light mode toggle
├── middleware.ts             # Auth routing (public vs protected)
├── next.config.ts            # Compression, images, headers
└── tailwind.config.ts        # Theme colors, animations
```

### Database Schema (Supabase)

| Table | Key Fields |
|-------|-----------|
| `shops` | id, name, owner_id, promptpay_id, tax_rate, table_count, payment_mode, subscription_paid_until, logo_url |
| `profiles` | id, email, full_name, role (super_admin/owner/cashier), shop_id |
| `categories` | id, shop_id, name, sort_order |
| `products` | id, shop_id, category_id, name, price, image_url, stock, barcode, is_active |
| `customer_sessions` | id, shop_id, table_label, status (active/paid/cancelled), created_by |
| `orders` | id, shop_id, order_number, status, total_amount, order_source (pos/customer), customer_session_id, table_number |
| `order_items` | id, order_id, product_id, quantity, unit_price, subtotal, item_status (active/cancelled) |
| `payments` | id, order_id, method (cash/qr/card), amount, status, confirmation_type (manual/auto) |

### Realtime Configuration

Tables in `supabase_realtime` publication with `REPLICA IDENTITY FULL`:
- `orders`, `order_items`, `customer_sessions`, `payments`
- `products`, `shops`, `categories`

### Key Architecture Decisions

1. **Session-based QR ordering:** Staff creates `customer_session` → QR URL → customer scans → orders tied to session
2. **Polling + Realtime fallback:** All pages use both Supabase Realtime and polling (3-5s) because Realtime can miss events
3. **Totals calculated from active items:** Never trust `orders.total_amount` directly — always calculate from `order_items` where `item_status='active'` for consistency
4. **Modal manages own state:** `SessionDetailModal` has local state + `refreshLocal()` independent from parent to prevent data conflicts
5. **Click propagation protection:** All sub-modals use `stopPropagation` on backdrop to prevent accidental closure

### Deployment

```bash
npx vercel --prod --yes
npx vercel alias <deployment-url> kopicha.vercel.app
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://nooljfpynicvckfbsaba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_BASE_URL=https://kopicha.vercel.app
```

### User Roles

| Role | Access |
|------|--------|
| `super_admin` | Everything + admin panel + manage all shops + bypass subscription |
| `owner` | Full shop access + settings + team management + logo upload |
| `cashier` | POS operations (tables, orders, sessions) |

### Design System

- **Primary:** Teal (#14b8a6)
- **Dark mode:** slate-900 bg, slate-800 surface
- **Light mode:** gray-50 bg, white surface
- **Icons:** Lucide React only (no emoji)
- **Animations:** `animate-fade-in`, `animate-slide-up` (custom keyframes in tailwind.config)

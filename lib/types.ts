export interface Shop {
  id: string
  name: string
  promptpay_id: string
  tax_rate: number
  table_count: number
  payment_mode: 'auto' | 'counter'
  subscription_paid_until: string | null
  setup_fee_paid: boolean
  referral_code: string | null
  address?: string
  phone?: string
  logo_url?: string
  is_deleted?: boolean
  deleted_at?: string | null
  first_product_at?: string | null
  created_at: string
}

export interface Profile {
  id: string
  email?: string
  full_name: string
  role: 'super_admin' | 'owner' | 'cashier' | null
  shop_id: string | null
  avatar_url?: string
  pending_shop_name?: string | null
  pending_promptpay?: string | null
  created_at: string
}

export interface Category {
  id: string
  shop_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  shop_id: string
  category_id: string
  name: string
  price: number
  image_url?: string
  stock: number
  barcode?: string
  is_active: boolean
  created_at: string
}

export interface CustomerSession {
  id: string
  shop_id: string
  table_label: string | null
  status: 'active' | 'paid' | 'cancelled'
  created_by: string | null
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  discount_amount: number
  discount_type: 'percent' | 'fixed' | null
  discount_note: string | null
}

export interface Order {
  id: string
  shop_id: string
  order_number: number
  cashier_id: string | null
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number | null
  subtotal: number | null
  tax_amount: number | null
  discount_amount: number
  payment_method: 'cash' | 'qr' | 'card' | null
  table_number: string | null
  order_source: 'pos' | 'customer'
  customer_session_id: string | null
  preparing_at: string | null
  ready_at: string | null
  delivered_at: string | null
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  item_status?: 'active' | 'cancelled'
  item_cancelled_by?: string | null
  item_cancelled_at?: string | null
}

export interface Payment {
  id: string
  order_id: string
  method: 'cash' | 'qr' | 'card'
  amount: number
  status: 'pending' | 'success' | 'failed' | 'expired'
  qr_payload: string | null
  transaction_ref: string | null
  confirmation_type: 'manual' | 'auto' | null
  confirmed_by: string | null
  cash_received: number | null
  cash_change: number | null
  created_at: string
  updated_at: string
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { product?: { name: string } })[]
  payment?: Payment
  cancelledByProfile?: { full_name: string }
  confirmedByProfile?: { full_name: string }
}

export interface SessionWithOrders extends CustomerSession {
  orders: OrderWithItems[]
  total_amount: number
}

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

export interface PendingUser {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  created_at: string
  pending_shop_name?: string | null
  pending_promptpay?: string | null
}

export interface TeamMember {
  id: string
  email?: string
  full_name?: string
  role: 'super_admin' | 'owner' | 'cashier' | null
  avatar_url?: string
}

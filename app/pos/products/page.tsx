'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Category, Product, Shop } from '@/lib/types'
import Image from 'next/image'

interface ProductFormData {
  name: string
  price: string
  stock: string
  category_id: string
  barcode: string
  is_active: boolean
  image_url: string
}

const DEFAULT_FORM: ProductFormData = {
  name: '',
  price: '',
  stock: '999',
  category_id: '',
  barcode: '',
  is_active: true,
  image_url: '',
}

function validateProductForm(form: ProductFormData): string | null {
  const name = form.name.trim()

  // ── ชื่อสินค้า ──────────────────────────────────────────────────
  if (!name) return 'กรุณากรอกชื่อสินค้า'
  if (name.length > 100) return 'ชื่อสินค้ายาวเกินไป (สูงสุด 100 ตัวอักษร)'

  // ตรวจสระซ้อน: สระ/วรรณยุกต์ไทย 2 ตัวติดกัน
  if (/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{2,}/.test(name)) {
    return 'ชื่อสินค้ามีสระหรือวรรณยุกต์ซ้อนกัน'
  }
  // ชื่อที่เป็นอักขระพิเศษล้วนๆ (ไม่มีตัวอักษรหรือตัวเลขเลย)
  if (!/[\u0E00-\u0E7Fa-zA-Z0-9]/.test(name)) {
    return 'ชื่อสินค้าต้องมีตัวอักษรหรือตัวเลข'
  }

  // ── ราคา ────────────────────────────────────────────────────────
  const priceStr = form.price.trim()
  if (!priceStr) return 'กรุณากรอกราคา'
  // ต้องเป็นตัวเลขล้วน ทศนิยมได้ 2 หลัก
  if (!/^\d+(\.\d{1,2})?$/.test(priceStr)) return 'ราคาต้องเป็นตัวเลขเท่านั้น (เช่น 50 หรือ 49.99)'
  const price = parseFloat(priceStr)
  if (price < 1) return 'ราคาต้องมากกว่า 0'
  if (price > 999999) return 'ราคาสูงเกินไป (สูงสุด 999,999 บาท)'

  // ── Stock ────────────────────────────────────────────────────────
  const stockStr = form.stock.trim()
  if (stockStr === '') return 'กรุณากรอก Stock'
  if (!/^\d+$/.test(stockStr)) return 'Stock ต้องเป็นจำนวนเต็มบวกเท่านั้น'
  const stock = parseInt(stockStr)
  if (stock < 0) return 'Stock ติดลบไม่ได้'
  if (stock > 99999) return 'Stock สูงเกินไป (สูงสุด 99,999)'

  // ── Barcode ──────────────────────────────────────────────────────
  const barcode = form.barcode.trim()
  if (barcode) {
    if (barcode.length > 50) return 'Barcode ยาวเกินไป (สูงสุด 50 ตัวอักษร)'
    if (!/^[a-zA-Z0-9\-_.]+$/.test(barcode)) return 'Barcode ใช้ได้เฉพาะ a-z, 0-9, -, _, .'
  }

  // ── Image URL ────────────────────────────────────────────────────
  const imageUrl = form.image_url.trim()
  if (imageUrl) {
    if (!imageUrl.startsWith('https://')) return 'URL รูปภาพต้องขึ้นต้นด้วย https://'
    if (imageUrl.length > 500) return 'URL รูปภาพยาวเกินไป'
  }

  return null
}

export default function ProductsPage() {
  const supabase = createClient()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('role, shop_id').eq('id', user.id).single()
      setIsOwner(p?.role === 'owner' || p?.role === 'super_admin')
      if (p?.shop_id) {
        const { data: s } = await supabase.from('shops').select('*').eq('id', p.shop_id).single()
        setShop(s)
      }
    })
  }, [])

  const fetchData = useCallback(async () => {
    if (!shop?.id) return
    setLoading(true)
    try {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('shop_id', shop.id).order('sort_order'),
        supabase.from('products').select('*').eq('shop_id', shop.id).order('name'),
      ])
      setCategories(cats ?? [])
      setProducts(prods ?? [])
    } finally {
      setLoading(false)
    }
  }, [shop?.id])

  useEffect(() => { if (shop?.id) fetchData() }, [shop?.id, fetchData])

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category_id ?? '',
      barcode: product.barcode ?? '',
      is_active: product.is_active,
      image_url: product.image_url ?? '',
    })
    setShowForm(true)
  }

  const openCreate = () => {
    setEditingProduct(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop?.id) return

    const validationError = validateProductForm(form)
    if (validationError) { setError(validationError); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        shop_id: shop.id,
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        category_id: form.category_id || null,
        barcode: form.barcode.trim() || null,
        is_active: form.is_active,
        image_url: form.image_url.trim() || null,
      }

      if (editingProduct) {
        const { error: updateErr } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('products').insert(payload)
        if (insertErr) throw insertErr
      }
      setShowForm(false)
      fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
    fetchData()
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCat || p.category_id === selectedCat
    return matchSearch && matchCat
  })

  const categoryMap: Record<string, string> = {}
  categories.forEach((c) => { categoryMap[c.id] = c.name })

  const stockColor = (stock: number) => {
    if (stock === 0) return 'text-red-500'
    if (stock <= 5) return 'text-orange-500'
    if (stock <= 20) return 'text-blue-500'
    return 'text-gray-500'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="page-header">
        <h1 className="page-title">สินค้า / เมนู</h1>
        {isOwner && (
          <button
            onClick={openCreate}
            className="btn-primary px-4 py-2 text-sm"
          >
            + เพิ่มสินค้า
          </button>
        )}
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาสินค้า..."
          className="input flex-1 text-sm"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCat(null)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              !selectedCat
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCat === cat.id
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                  : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted">ไม่พบสินค้า</div>
      ) : (
        <div className="section-card divide-y divide-gray-50 dark:divide-slate-800">
          {filteredProducts.map((product) => (
            <div key={product.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors ${!product.is_active ? 'opacity-50' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 relative">
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{product.name}</p>
                <p className="text-sm text-muted">
                  {categoryMap[product.category_id] ?? 'ไม่มีหมวด'}
                  {product.barcode && <span className="ml-2 text-xs text-subtle">Barcode: {product.barcode}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary-600 dark:text-primary-400">฿{product.price.toLocaleString()}</p>
                <p className={`text-xs font-medium ${stockColor(product.stock)}`}>
                  Stock: {product.stock}
                </p>
              </div>
              {isOwner && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                      product.is_active
                        ? 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        : 'border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    {product.is_active ? 'ซ่อน' : 'แสดง'}
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    แก้ไข
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-colors text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">ชื่อสินค้า *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">ราคา (฿) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="input"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">หมวดหมู่</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input"
                >
                  <option value="">ไม่มีหมวด</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="input"
                  placeholder="รหัสสินค้า (ไม่บังคับ)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">URL รูปภาพ</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-primary-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-slate-300">แสดงในเมนู</label>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1 py-3">
                  ยกเลิก
                </button>
                <button type="submit" disabled={saving}
                  className="btn-primary flex-1 py-3">
                  {saving ? <span className="spinner-sm" /> : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

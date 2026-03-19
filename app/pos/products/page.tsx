'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { usePosContext } from '@/lib/pos-context'
import { useI18n } from '@/lib/i18n/context'
import type { Category, Product } from '@/lib/types'
import Image from 'next/image'
import { ImagePlus, Plus, X } from 'lucide-react'

interface ProductFormData {
  name: string
  price: string
  stock: string
  category_id: string
  is_active: boolean
  image_url: string
}

const DEFAULT_FORM: ProductFormData = {
  name: '',
  price: '',
  stock: '999',
  category_id: '',
  is_active: true,
  image_url: '',
}

function validateProductForm(form: ProductFormData, t: (key: string) => string): string | null {
  const name = form.name.trim()

  if (!name) return t('products.valNameRequired')
  if (name.length > 100) return t('products.valNameTooLong')
  if (/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{2,}/.test(name)) return t('products.valNameDupVowel')
  if (!/[\u0E00-\u0E7Fa-zA-Z0-9]/.test(name)) return t('products.valNameNeedAlphaNum')

  const priceStr = form.price.toString().trim()
  if (!priceStr || priceStr === '') return t('products.valPriceRequired')
  // ห้ามติดลบ, ห้ามตัวอักษร, ทศนิยมได้ 2 หลัก
  if (!/^\d+(\.\d{1,2})?$/.test(priceStr)) return t('products.valPriceInvalid')
  const price = parseFloat(priceStr)
  if (!isFinite(price) || price < 1) return t('products.valPriceMin')
  if (price > 999999) return t('products.valPriceMax')

  const stockStr = form.stock.toString().trim()
  if (stockStr === '' || stockStr === null) return t('products.valStockRequired')
  // ห้ามติดลบ, ห้ามทศนิยม, ห้ามตัวอักษร
  if (!/^\d+$/.test(stockStr)) return t('products.valStockInteger')
  const stock = parseInt(stockStr, 10)
  if (!isFinite(stock) || stock < 0) return t('products.valStockNegative')
  if (stock > 99999) return t('products.valStockMax')

  const imageUrl = form.image_url.trim()
  if (imageUrl) {
    if (!imageUrl.startsWith('https://')) return t('products.valImageUrlHttps')
    if (imageUrl.length > 500) return t('products.valImageUrlTooLong')
  }

  return null
}

export default function ProductsPage() {
  const supabase = createClient()
  const { profile, shop } = usePosContext()
  const { t } = useI18n()
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
  const isOwner = profile?.role === 'owner' || profile?.role === 'super_admin'

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Inline category creation state
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

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
      is_active: product.is_active,
      image_url: product.image_url ?? '',
    })
    setShowForm(true)
    setShowNewCat(false)
    setNewCatName('')
  }

  const openCreate = () => {
    setEditingProduct(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
    setShowNewCat(false)
    setNewCatName('')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-product-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'อัพโหลดไม่สำเร็จ')
      setForm((f) => ({ ...f, image_url: json.url }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'อัพโหลดรูปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCreateCategory = async () => {
    const name = newCatName.trim()
    if (!name || !shop?.id) return
    setCreatingCat(true)
    try {
      const { data, error: catErr } = await supabase
        .from('categories')
        .insert({ shop_id: shop.id, name, sort_order: categories.length })
        .select()
        .single()
      if (catErr || !data) throw catErr
      setCategories((prev) => [...prev, data])
      setForm((f) => ({ ...f, category_id: data.id }))
      setNewCatName('')
      setShowNewCat(false)
    } catch {
      // ignore — category already visible in list
    } finally {
      setCreatingCat(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop?.id) return

    const validationError = validateProductForm(form, t)
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
        is_active: form.is_active,
        image_url: form.image_url.trim() || null,
      }

      if (editingProduct) {
        const { error: updateErr } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('products').insert(payload)
        if (insertErr) throw insertErr

        if (!shop.first_product_at) {
          await supabase
            .from('shops')
            .update({ first_product_at: new Date().toISOString() })
            .eq('id', shop.id)
        }
      }
      setShowForm(false)
      fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
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
        <h1 className="page-title">{t('products.title')}</h1>
        {isOwner && (
          <button onClick={openCreate} className="btn-primary px-4 py-2 text-sm">
            + {t('products.addProduct')}
          </button>
        )}
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('products.searchPlaceholder')}
          className="input flex-1 text-sm"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCat(null)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              !selectedCat
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('common.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCat === cat.id
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                  : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-slate-800'
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
        <div className="text-center py-12 text-muted">{t('products.noProducts')}</div>
      ) : (
        <div className="section-card divide-y divide-gray-50 dark:divide-slate-800">
          {filteredProducts.map((product) => (
            <div key={product.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors ${!product.is_active ? 'opacity-50' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 relative">
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill className="object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-slate-600">
                    <ImagePlus size={18} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{product.name}</p>
                <p className="text-sm text-muted">
                  {categoryMap[product.category_id] ?? t('products.noCategory')}
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
                        ? 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                        : 'border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    {product.is_active ? t('products.hide') : t('products.show')}
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-stone-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t('common.edit')}
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
                {editingProduct ? t('products.editProduct') : t('products.addProduct')}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 transition-colors text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* ชื่อสินค้า */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('products.productName')} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {/* ราคา + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('products.price')} (฿) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || parseFloat(v) >= 0) setForm({ ...form, price: v })
                    }}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault() }}
                    className="input"
                    required
                    min="1"
                    max="999999"
                    step="0.01"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || parseInt(v) >= 0) setForm({ ...form, stock: v })
                    }}
                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault() }}
                    className="input"
                    min="0"
                    max="99999"
                    step="1"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* หมวดหมู่ + ปุ่มสร้างใหม่ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('products.category')}</label>
                <div className="flex gap-2">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="input flex-1 pr-10"
                  >
                    <option value="">{t('products.noCategory')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowNewCat(true); setNewCatName('') }}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary-500 transition-colors"
                    title="สร้างหมวดหมู่ใหม่"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Inline new category input */}
                {showNewCat && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } }}
                      placeholder="ชื่อหมวดหมู่ใหม่"
                      className="input flex-1 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCatName.trim() || creatingCat}
                      className="btn-primary text-sm px-3 py-2 shrink-0"
                    >
                      {creatingCat ? <span className="spinner-sm" /> : 'สร้าง'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCat(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* รูปภาพ — Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('products.imageUrl')}</label>

                {/* Preview */}
                {form.image_url && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden mb-2 border border-gray-200 dark:border-slate-700">
                    <Image src={form.image_url} alt="preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <ImagePlus size={16} />
                  {uploadingImage ? 'กำลังอัพโหลด...' : form.image_url ? 'เปลี่ยนรูปภาพ' : 'อัพโหลดรูปภาพ'}
                </button>
              </div>

              {/* ซ่อนสินค้าชั่วคราว (inverted: checked = hidden, unchecked = shown) */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="is_hidden"
                  checked={!form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: !e.target.checked })}
                  className="w-4 h-4 mt-0.5 accent-rose-500 shrink-0"
                />
                <div>
                  <label htmlFor="is_hidden" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                    ซ่อนสินค้าชั่วคราว
                  </label>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    ติ๊กเพื่อซ่อนจากเมนู QR ของลูกค้า — ยังเก็บข้อมูลไว้ แค่ไม่แสดง
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/40">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-3">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? <span className="spinner-sm" /> : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

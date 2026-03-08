'use client'

import { useState, useEffect, useRef } from 'react'
import { Input, Textarea } from './ui/Input'
import { Select } from './ui/Select'
import Toggle from './ui/Toggle'
import Button from './ui/Button'
import { SavedProduct } from '@/lib/types'

interface ProductFormData {
  product_name: string
  epa_registration_number: string
  product_type: string
  target_pest: string
  rate_applied: string
  carrier_type: string
  restricted_use_pesticide: boolean
  label_restriction_notes: string
  notes: string
}

const emptyForm: ProductFormData = {
  product_name: '',
  epa_registration_number: '',
  product_type: '',
  target_pest: '',
  rate_applied: '',
  carrier_type: '',
  restricted_use_pesticide: false,
  label_restriction_notes: '',
  notes: '',
}

function toFormData(p: SavedProduct): ProductFormData {
  return {
    product_name: p.product_name,
    epa_registration_number: p.epa_registration_number ?? '',
    product_type: p.product_type ?? '',
    target_pest: p.target_pest ?? '',
    rate_applied: p.rate_applied ?? '',
    carrier_type: p.carrier_type ?? '',
    restricted_use_pesticide: p.restricted_use_pesticide,
    label_restriction_notes: p.label_restriction_notes ?? '',
    notes: p.notes ?? '',
  }
}

const productTypeOptions = [
  { value: 'Herbicide', label: 'Herbicide' },
  { value: 'Fungicide', label: 'Fungicide' },
  { value: 'Insecticide', label: 'Insecticide' },
  { value: 'Acaricide / Miticide', label: 'Acaricide / Miticide' },
  { value: 'Bactericide', label: 'Bactericide' },
  { value: 'Rodenticide', label: 'Rodenticide' },
  { value: 'Plant Growth Regulator', label: 'Plant Growth Regulator' },
  { value: 'Adjuvant / Surfactant', label: 'Adjuvant / Surfactant' },
  { value: 'Other', label: 'Other' },
]

const carrierTypeOptions = [
  { value: 'Water', label: 'Water' },
  { value: 'UAN (Liquid Fertilizer)', label: 'UAN (Liquid Fertilizer)' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Vegetable Oil', label: 'Vegetable Oil' },
  { value: 'Mineral Oil', label: 'Mineral Oil' },
  { value: 'Other', label: 'Other' },
]

export default function ProductLibrary() {
  const [products, setProducts] = useState<SavedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // EPA lookup state
  const [epaQuery, setEpaQuery] = useState('')
  const [epaStatus, setEpaStatus] = useState<'idle' | 'loading' | 'not-found' | 'error'>('idle')
  const [epaResults, setEpaResults] = useState<Array<{
    product_name: string
    epa_registration_number: string | null
    product_type: string | null
    restricted_use_pesticide: boolean
    label_restriction_notes: string | null
  }>>([])
  const [epaDropdownOpen, setEpaDropdownOpen] = useState(false)
  const [showEpaNote, setShowEpaNote] = useState(false)
  const epaContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (epaContainerRef.current && !epaContainerRef.current.contains(e.target as Node)) {
        setEpaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function resetEpaState() {
    setEpaQuery('')
    setEpaStatus('idle')
    setEpaResults([])
    setEpaDropdownOpen(false)
    setShowEpaNote(false)
  }

  function applyEpaResult(item: typeof epaResults[0]) {
    setForm(f => ({
      ...f,
      product_name: item.product_name,
      epa_registration_number: item.epa_registration_number ?? '',
      product_type: item.product_type ?? '',
      restricted_use_pesticide: item.restricted_use_pesticide,
      label_restriction_notes: item.label_restriction_notes ?? '',
    }))
    setEpaQuery(item.product_name)
    setEpaDropdownOpen(false)
    setShowEpaNote(true)
  }

  async function handleEpaLookup() {
    const term = epaQuery.trim()
    if (!term) return

    setEpaStatus('loading')
    setShowEpaNote(false)
    setEpaResults([])
    setEpaDropdownOpen(false)

    const isRegNumber = /^\d+-\d+$/.test(term)
    const param = isRegNumber
      ? `reg=${encodeURIComponent(term)}`
      : `name=${encodeURIComponent(term)}`

    try {
      const res = await fetch(`/api/epa-lookup?${param}`)
      if (!res.ok) {
        setEpaStatus('not-found')
        return
      }

      const data = await res.json()

      if (isRegNumber) {
        applyEpaResult(data)
        setEpaStatus('idle')
      } else {
        const items = Array.isArray(data) ? data : [data]
        if (items.length === 0) {
          setEpaStatus('not-found')
        } else {
          setEpaResults(items)
          setEpaDropdownOpen(true)
          setEpaStatus('idle')
        }
      }
    } catch {
      setEpaStatus('error')
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setProducts(data)
      }
    } catch {}
    setLoading(false)
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  function startAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(product: SavedProduct) {
    setForm(toFormData(product))
    setEditingId(product.id)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    resetEpaState()
  }

  async function handleSave() {
    if (!form.product_name.trim()) {
      showMessage('error', 'Product name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Save failed')
      }
      showMessage('success', editingId ? 'Product updated' : 'Product saved')
      cancelForm()
      fetchProducts()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      showMessage('success', 'Product deleted')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch {
      showMessage('error', 'Failed to delete product')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = search
    ? products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.epa_registration_number ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : products

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Product Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading...' : `${products.length} saved product${products.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={startAdd}>
          + Add Product
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Search */}
      {products.length > 0 && (
        <Input
          placeholder="Search by name or EPA #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-[#141414] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>

          {/* EPA Search */}
          <div className="space-y-2" ref={epaContainerRef}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={epaQuery}
                  onChange={e => { setEpaQuery(e.target.value); setEpaStatus('idle'); setShowEpaNote(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEpaLookup() } }}
                  placeholder="Search EPA by name or reg # (e.g. 524-539)..."
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-300 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:focus:ring-green-400/30 dark:focus:border-green-400 transition-all duration-200 ease-out"
                />
                {epaDropdownOpen && epaResults.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[var(--shadow-2)] max-h-60 overflow-auto">
                    {epaResults.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); applyEpaResult(r) }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between gap-2 transition-colors duration-150"
                        >
                          <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 min-w-0 truncate">
                            <span className="text-xs font-normal text-blue-500 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md px-1">EPA</span>
                            {r.product_name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                            {[r.epa_registration_number, r.product_type].filter(Boolean).join(' \u00b7 ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={handleEpaLookup}
                disabled={!epaQuery.trim() || epaStatus === 'loading'}
                className="shrink-0 text-xs px-2.5 py-2.5 rounded-xl border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ease-out whitespace-nowrap"
              >
                {epaStatus === 'loading' ? 'Looking up...' : 'Look up on EPA'}
              </button>
            </div>
            {epaStatus === 'not-found' && (
              <p className="text-xs text-red-500 dark:text-red-400">
                No EPA record found. Check the registration number and try again.
              </p>
            )}
            {epaStatus === 'error' && (
              <p className="text-xs text-red-500 dark:text-red-400">
                EPA lookup failed. Try again or enter product details manually.
              </p>
            )}
            {showEpaNote && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                EPA filled product name, type, restricted use, and label notes. Application rates must be entered manually.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={form.product_name}
              onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
              placeholder="e.g. Roundup PowerMAX"
              required
            />
            <Input
              label="EPA Registration Number"
              value={form.epa_registration_number}
              onChange={e => setForm(f => ({ ...f, epa_registration_number: e.target.value }))}
              placeholder="e.g. 524-539"
            />
            <Select
              label="Product Type"
              value={form.product_type}
              onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))}
              placeholder="Select type..."
              options={productTypeOptions}
            />
            <Input
              label="Target Pest or Purpose"
              value={form.target_pest}
              onChange={e => setForm(f => ({ ...f, target_pest: e.target.value }))}
              placeholder="e.g. Broadleaf Weeds"
            />
            <Input
              label="Rate Applied"
              value={form.rate_applied}
              onChange={e => setForm(f => ({ ...f, rate_applied: e.target.value }))}
              placeholder="e.g. 22 oz/acre"
            />
            <Select
              label="Carrier Type"
              value={form.carrier_type}
              onChange={e => setForm(f => ({ ...f, carrier_type: e.target.value }))}
              placeholder="Select carrier..."
              options={carrierTypeOptions}
            />
            <div className="sm:col-span-2">
              <Toggle
                label="Restricted Use Pesticide (RUP)"
                description="Check if this product is classified as restricted use"
                checked={form.restricted_use_pesticide}
                onChange={val => setForm(f => ({ ...f, restricted_use_pesticide: val }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Label or Restriction Notes"
                value={form.label_restriction_notes}
                onChange={e => setForm(f => ({ ...f, label_restriction_notes: e.target.value }))}
                placeholder="Buffer zones, restrictions, special requirements..."
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any other notes about this product..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editingId ? 'Update Product' : 'Save Product'}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Product List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          {search ? 'No products match your search.' : 'No saved products yet. Add one above, or save products from the spray log form.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => (
            <div
              key={product.id}
              className="bg-white dark:bg-[#141414] border border-gray-200/80 dark:border-white/5 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {product.product_name}
                    </h3>
                    {product.restricted_use_pesticide && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                        RUP
                      </span>
                    )}
                    {product.product_type && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-white/5 dark:text-gray-400 dark:ring-white/10">
                        {product.product_type}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {product.epa_registration_number && (
                      <span>EPA: {product.epa_registration_number}</span>
                    )}
                    {product.target_pest && (
                      <span>Target: {product.target_pest}</span>
                    )}
                    {product.rate_applied && (
                      <span>Rate: {product.rate_applied}</span>
                    )}
                    {product.carrier_type && (
                      <span>Carrier: {product.carrier_type}</span>
                    )}
                  </div>
                  {product.label_restriction_notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2">
                      {product.label_restriction_notes}
                    </p>
                  )}
                  {product.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic line-clamp-2">
                      {product.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleting === product.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

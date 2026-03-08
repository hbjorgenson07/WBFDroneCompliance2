'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SavedProduct, SprayLogFormData } from '@/lib/types'

// The subset of SprayLog fields that ProductSearch can auto-fill
type ProductFields = Pick<
  SprayLogFormData,
  | 'product_name'
  | 'epa_registration_number'
  | 'product_type'
  | 'target_pest'
  | 'rate_applied'
  | 'carrier_type'
  | 'restricted_use_pesticide'
  | 'label_restriction_notes'
>

interface PastProduct {
  product_name: string
  epa_registration_number: string | null
  product_type: string | null
  target_pest: string | null
  rate_applied: string | null
  carrier_type: string | null
  restricted_use_pesticide: boolean
  label_restriction_notes: string | null
}

interface ProductSearchProps {
  onSelect: (fields: ProductFields) => void
  pastProducts: PastProduct[]
  currentValues: ProductFields
}

interface SearchResult {
  source: 'library' | 'history' | 'epa'
  product_name: string
  epa_registration_number: string | null
  product_type: string | null
  target_pest: string | null
  rate_applied: string | null
  carrier_type: string | null
  restricted_use_pesticide: boolean
  label_restriction_notes: string | null
  id?: string
}

type EpaStatus = 'idle' | 'loading' | 'not-found' | 'error'

export default function ProductSearch({ onSelect, pastProducts, currentValues }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [epaStatus, setEpaStatus] = useState<EpaStatus>('idle')
  const [showEpaNote, setShowEpaNote] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isRegNumber = /^\d+-\d+$/.test(query.trim())

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    const lower = term.toLowerCase()

    const historyResults: SearchResult[] = pastProducts
      .filter(p =>
        p.product_name?.toLowerCase().includes(lower) ||
        p.epa_registration_number?.toLowerCase().includes(lower)
      )
      .map(p => ({ source: 'history' as const, ...p, restricted_use_pesticide: p.restricted_use_pesticide ?? false }))

    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(term)}`)
      if (res.ok) {
        const libraryProducts: SavedProduct[] = await res.json()
        const libraryResults: SearchResult[] = libraryProducts.map(p => ({
          source: 'library' as const,
          id: p.id,
          product_name: p.product_name,
          epa_registration_number: p.epa_registration_number,
          product_type: p.product_type,
          target_pest: p.target_pest,
          rate_applied: p.rate_applied,
          carrier_type: p.carrier_type,
          restricted_use_pesticide: p.restricted_use_pesticide,
          label_restriction_notes: p.label_restriction_notes,
        }))

        const libraryNames = new Set(libraryResults.map(r => r.product_name.toLowerCase()))
        const filteredHistory = historyResults.filter(
          r => !libraryNames.has(r.product_name.toLowerCase())
        )

        const combined = [...libraryResults, ...filteredHistory]
        setResults(combined)
        setOpen(combined.length > 0)
      }
    } catch {
      setResults(historyResults)
      setOpen(historyResults.length > 0)
    }
  }, [pastProducts])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setShowEpaNote(false)
    setEpaStatus('idle')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(result: SearchResult) {
    onSelect({
      product_name: result.product_name,
      epa_registration_number: result.epa_registration_number,
      product_type: result.product_type,
      target_pest: result.target_pest,
      rate_applied: result.rate_applied,
      carrier_type: result.carrier_type,
      restricted_use_pesticide: result.restricted_use_pesticide,
      label_restriction_notes: result.label_restriction_notes,
    })
    setQuery(result.product_name)
    setOpen(false)
    if (result.source === 'epa') setShowEpaNote(true)
  }

  async function handleEpaLookup() {
    const term = query.trim()
    if (!term) return

    setEpaStatus('loading')
    setShowEpaNote(false)

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
        onSelect({
          product_name: data.product_name,
          epa_registration_number: data.epa_registration_number,
          product_type: data.product_type ?? null,
          target_pest: null,
          rate_applied: null,
          carrier_type: null,
          restricted_use_pesticide: data.restricted_use_pesticide,
          label_restriction_notes: data.label_restriction_notes ?? null,
        })
        setQuery(data.product_name)
        setShowEpaNote(true)
        setEpaStatus('idle')
      } else {
        const epaList: SearchResult[] = (Array.isArray(data) ? data : [data]).map(
          (item: { product_name: string; epa_registration_number: string | null; restricted_use_pesticide: boolean; product_type: string | null; label_restriction_notes: string | null }) => ({
            source: 'epa' as const,
            product_name: item.product_name,
            epa_registration_number: item.epa_registration_number,
            product_type: item.product_type ?? null,
            target_pest: null,
            rate_applied: null,
            carrier_type: null,
            restricted_use_pesticide: item.restricted_use_pesticide,
            label_restriction_notes: item.label_restriction_notes ?? null,
          })
        )

        setResults(prev => {
          const existingNames = new Set(prev.filter(r => r.source !== 'epa').map(r => r.product_name.toLowerCase()))
          const newEpa = epaList.filter(r => !existingNames.has(r.product_name.toLowerCase()))
          return [...prev.filter(r => r.source !== 'epa'), ...newEpa]
        })
        setOpen(true)
        setEpaStatus('idle')
      }
    } catch {
      setEpaStatus('error')
    }
  }

  async function handleSave() {
    if (!currentValues.product_name) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentValues),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }

  const hasProductName = !!currentValues.product_name

  return (
    <div className="sm:col-span-2 space-y-2" ref={containerRef}>
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query && results.length > 0 && setOpen(true)}
            placeholder="Search or enter EPA reg #..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-300 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 dark:focus:ring-green-400/30 dark:focus:border-green-400 transition-all duration-200 ease-out"
          />

          {/* Dropdown */}
          {open && results.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-[var(--shadow-2)] max-h-60 overflow-auto">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(r) }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between gap-2 transition-colors duration-150"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 min-w-0 truncate">
                      {r.source === 'library' && (
                        <span className="text-amber-500" title="Saved to library">&#9733;</span>
                      )}
                      {r.source === 'epa' && (
                        <span className="text-xs font-normal text-blue-500 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md px-1">EPA</span>
                      )}
                      {r.product_name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {[r.epa_registration_number, r.product_type].filter(Boolean).join(' \u00b7 ')}
                      {r.source === 'history' && (
                        <span className="ml-1 text-gray-400 dark:text-gray-600">past log</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* EPA Lookup button */}
        <button
          type="button"
          onClick={handleEpaLookup}
          disabled={!query.trim() || epaStatus === 'loading'}
          className="shrink-0 text-xs px-2.5 py-2.5 rounded-xl border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ease-out whitespace-nowrap"
        >
          {epaStatus === 'loading' ? 'Looking up...' : 'Look up on EPA'}
        </button>
      </div>

      {/* EPA status messages */}
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

      {/* Note shown after EPA auto-fill */}
      {showEpaNote && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
          EPA filled product name, type, restricted use, and label notes. Application rates must be entered manually — then save to library.
        </p>
      )}

      {/* Save to Library button */}
      {hasProductName && (
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus !== 'idle'}
            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-60 transition-all duration-200 ease-out"
          >
            {saveStatus === 'saved'
              ? 'Saved \u2713'
              : saveStatus === 'saving'
              ? 'Saving...'
              : `Save "${currentValues.product_name}" to library`}
          </button>
        </div>
      )}
    </div>
  )
}

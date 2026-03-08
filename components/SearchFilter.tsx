'use client'

import { useState, useRef, useEffect } from 'react'
import { LogFilters } from '@/lib/types'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import Button from './ui/Button'

export type ExportFormat = 'csv' | 'indiana-csv' | 'indiana-pdf'

interface SearchFilterProps {
  filters: LogFilters
  onChange: (filters: LogFilters) => void
  onExport: (format: ExportFormat) => void
  exporting?: boolean
}

export default function SearchFilter({ filters, onChange, onExport, exporting }: SearchFilterProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    if (exportOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  function set(key: keyof LogFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function reset() {
    onChange({
      search: '', status: '', aircraft: '', crop: '', from: '', to: '', sort: 'newest',
    })
  }

  function handleExportClick(format: ExportFormat) {
    setExportOpen(false)
    onExport(format)
  }

  const hasFilters = filters.search || filters.status || filters.aircraft ||
                     filters.crop || filters.from || filters.to

  return (
    <div className="bg-white dark:bg-[#141414] border border-gray-200/80 dark:border-white/5 rounded-2xl p-4 space-y-3">
      {/* Search bar */}
      <Input
        placeholder="Search by customer, field, product, or job ID..."
        value={filters.search}
        onChange={e => set('search', e.target.value)}
      />

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <Select
          value={filters.status}
          onChange={e => set('status', e.target.value)}
          placeholder="All statuses"
          options={[
            { value: 'planned',   label: 'Planned' },
            { value: 'completed', label: 'Completed' },
            { value: 'canceled',  label: 'Canceled' },
          ]}
        />
        <Input
          placeholder="Aircraft..."
          value={filters.aircraft}
          onChange={e => set('aircraft', e.target.value)}
        />
        <Input
          placeholder="Crop type..."
          value={filters.crop}
          onChange={e => set('crop', e.target.value)}
        />
        <Select
          value={filters.sort}
          onChange={e => set('sort', e.target.value)}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
        />
        <div className="flex flex-col gap-1">
          <Input
            type="date"
            value={filters.from}
            onChange={e => set('from', e.target.value)}
            placeholder="From date"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Input
            type="date"
            value={filters.to}
            onChange={e => set('to', e.target.value)}
            placeholder="To date"
          />
        </div>
      </div>

      {/* Bottom row: reset + export */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExportOpen(prev => !prev)}
            loading={exporting}
          >
            Export ▾
          </Button>

          {exportOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => handleExportClick('csv')}
                className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Export CSV</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">All fields, raw data</span>
              </button>
              <div className="border-t border-gray-100 dark:border-white/5" />
              <button
                onClick={() => handleExportClick('indiana-csv')}
                className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Indiana Compliance CSV</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">OISC required fields (355 IAC 4-4-1)</span>
              </button>
              <div className="border-t border-gray-100 dark:border-white/5" />
              <button
                onClick={() => handleExportClick('indiana-pdf')}
                className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Indiana Compliance PDF</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">Printable report for records</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

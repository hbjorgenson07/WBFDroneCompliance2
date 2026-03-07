'use client'

import { LogFilters } from '@/lib/types'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import Button from './ui/Button'

interface SearchFilterProps {
  filters: LogFilters
  onChange: (filters: LogFilters) => void
  onExport: () => void
  exporting?: boolean
}

export default function SearchFilter({ filters, onChange, onExport, exporting }: SearchFilterProps) {
  function set(key: keyof LogFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function reset() {
    onChange({
      search: '', status: '', aircraft: '', crop: '', from: '', to: '', sort: 'newest',
    })
  }

  const hasFilters = filters.search || filters.status || filters.aircraft ||
                     filters.crop || filters.from || filters.to

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
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
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={onExport} loading={exporting}>
          Export CSV
        </Button>
      </div>
    </div>
  )
}

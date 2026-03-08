'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import LogCard from '@/components/LogCard'
import SearchFilter, { ExportFormat } from '@/components/SearchFilter'
import Button from '@/components/ui/Button'
import { SprayLog, LogFilters } from '@/lib/types'

const defaultFilters: LogFilters = {
  search: '', status: '', productType: '', aircraft: '', crop: '', from: '', to: '', sort: 'newest',
}

export default function LogsPage() {
  const [logs, setLogs]         = useState<SprayLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState<LogFilters>(defaultFilters)
  const [exporting, setExporting] = useState(false)

  // Fetch logs whenever filters change
  const fetchLogs = useCallback(async (f: LogFilters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.search)   params.set('search', f.search)
    if (f.status)      params.set('status', f.status)
    if (f.productType) params.set('productType', f.productType)
    if (f.aircraft)    params.set('aircraft', f.aircraft)
    if (f.crop)     params.set('crop', f.crop)
    if (f.from)     params.set('from', f.from)
    if (f.to)       params.set('to', f.to)
    if (f.sort)     params.set('sort', f.sort)

    const res = await fetch(`/api/logs?${params}`)
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // Debounce filter changes slightly so text search doesn't fire on every keystroke
    const timer = setTimeout(() => fetchLogs(filters), 300)
    return () => clearTimeout(timer)
  }, [filters, fetchLogs])

  async function handleExport(format: ExportFormat) {
    setExporting(true)
    const params = new URLSearchParams()
    if (filters.search)   params.set('search', filters.search)
    if (filters.status)      params.set('status', filters.status)
    if (filters.productType) params.set('productType', filters.productType)
    if (filters.aircraft)    params.set('aircraft', filters.aircraft)
    if (filters.crop)     params.set('crop', filters.crop)
    if (filters.from)     params.set('from', filters.from)
    if (filters.to)       params.set('to', filters.to)

    if (format === 'csv') {
      window.location.href = `/api/export?${params}`
    } else if (format === 'indiana-csv') {
      window.location.href = `/api/export/compliance?${params}`
    } else if (format === 'indiana-pdf') {
      try {
        const res = await fetch(`/api/logs?${params}`)
        const data = await res.json()
        const { buildCompliancePdf } = await import('@/lib/compliance')
        await buildCompliancePdf(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('PDF export failed:', err)
      }
    }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Spray Logs</h1>
        <Link href="/logs/new">
          <Button variant="primary">+ New Log</Button>
        </Link>
      </div>

      {/* Search and filter controls */}
      <SearchFilter
        filters={filters}
        onChange={setFilters}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          No logs found.{' '}
          <Link href="/logs/new" className="text-green-700 dark:text-green-400 hover:underline">
            Create a new log
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {logs.length} {logs.length === 1 ? 'result' : 'results'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {logs.map(log => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

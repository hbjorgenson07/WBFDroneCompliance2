'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SprayLog } from '@/lib/types'
import { parseGps } from '@/lib/utils'

// Leaflet must be loaded client-side only (no SSR)
const LogMap = dynamic(() => import('@/components/LogMap'), { ssr: false })

export default function MapPage() {
  const [logs, setLogs] = useState<SprayLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/logs?limit=500')
      .then(r => r.json())
      .then((data: SprayLog[]) => {
        if (Array.isArray(data)) setLogs(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const logsWithGps = logs.filter(l => parseGps(l.gps_coordinates))
  const total = logs.length
  const mapped = logsWithGps.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Map View</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading...' : `${mapped} of ${total} logs have GPS coordinates`}
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
            Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Planned
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            Canceled
          </span>
        </div>
      </div>

      <div className="w-full h-[calc(100vh-14rem)] bg-gray-100 dark:bg-[#141414] border border-gray-200/80 dark:border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            Loading logs...
          </div>
        ) : mapped === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            No logs with GPS coordinates yet. Use &ldquo;Get Location &amp; Weather&rdquo; when creating logs.
          </div>
        ) : (
          <LogMap logs={logsWithGps} />
        )}
      </div>
    </div>
  )
}

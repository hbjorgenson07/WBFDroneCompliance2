'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Button from './ui/Button'

const ApplicationMap = dynamic(() => import('./ApplicationMap'), { ssr: false })

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

interface MapData {
  map_geojson: Record<string, unknown> | null
  map_overlay_path: string | null
  map_overlay_bounds: [[number, number], [number, number]] | null
}

interface MapUploadProps {
  logId: string
  mapData: MapData
  onUploadComplete: (data: MapData) => void
  onRemove: () => void
}

export default function MapUpload({ logId, mapData, onUploadComplete, onRemove }: MapUploadProps) {
  const [status, setStatus] = useState<UploadStatus>(mapData.map_geojson ? 'done' : 'idle')
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasMap = !!mapData.map_geojson

  // Fetch signed overlay URL if we have an overlay
  const fetchOverlayUrl = useCallback(async () => {
    try {
      const res = await fetch(`/api/logs/${logId}/map-image`)
      if (res.ok) {
        const { url } = await res.json()
        setOverlayUrl(url)
      }
    } catch {
      // Overlay is optional — silently skip
    }
  }, [logId])

  // Load overlay URL on mount if map data exists
  useState(() => {
    if (mapData.map_overlay_path) {
      fetchOverlayUrl()
    }
  })

  async function uploadFile(file: File) {
    setError('')
    setWarnings([])

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a .zip file containing shapefile data.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large (max 50 MB).')
      return
    }

    setStatus('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)

      setStatus('processing')

      const res = await fetch(`/api/logs/${logId}/map`, {
        method: 'POST',
        body: formData,
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error ?? 'Upload failed')
      }

      if (body.warnings?.length) {
        setWarnings(body.warnings)
      }

      // Fetch overlay URL if available
      if (body.map_overlay_path) {
        const imgRes = await fetch(`/api/logs/${logId}/map-image`)
        if (imgRes.ok) {
          const { url } = await imgRes.json()
          setOverlayUrl(url)
        }
      }

      onUploadComplete({
        map_geojson: body.map_geojson,
        map_overlay_path: body.map_overlay_path,
        map_overlay_bounds: body.map_overlay_bounds,
      })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  async function handleRemove() {
    setError('')
    try {
      const res = await fetch(`/api/logs/${logId}/map`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Delete failed')
      }
      setOverlayUrl(null)
      setWarnings([])
      onRemove()
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const isProcessing = status === 'uploading' || status === 'processing'

  return (
    <div className="space-y-3 px-1">
      {/* Upload zone — show when no map or replacing */}
      {!hasMap && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center gap-2 p-8
            border-2 border-dashed rounded-xl transition-colors duration-200 cursor-pointer
            ${dragging
              ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10'
              : 'border-gray-300 dark:border-white/10 hover:border-green-400 dark:hover:border-green-600'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {isProcessing
              ? status === 'uploading' ? 'Uploading...' : 'Processing shapefile...'
              : 'Drop a shapefile .zip here or click to browse'
            }
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">DJI mission export ZIP (max 50 MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-700 dark:text-yellow-400">
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Map preview */}
      {hasMap && mapData.map_geojson && (
        <>
          <ApplicationMap
            geojson={mapData.map_geojson as unknown as GeoJSON.FeatureCollection}
            overlayUrl={overlayUrl}
            overlayBounds={mapData.map_overlay_bounds}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onRemove()
                setStatus('idle')
                setOverlayUrl(null)
                // Don't actually delete — just show upload zone so they can replace
                // The new upload will overwrite via upsert
              }}
            >
              Replace Map
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              Remove Map
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

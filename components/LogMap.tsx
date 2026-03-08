'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { SprayLog } from '@/lib/types'
import { parseGps, formatDate } from '@/lib/utils'

// Fix Leaflet default marker icons (they break with bundlers)
function createIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

const icons: Record<string, L.DivIcon> = {
  completed: createIcon('#16a34a'),
  planned:   createIcon('#2563eb'),
  canceled:  createIcon('#9ca3af'),
}

interface LogMapProps {
  logs: SprayLog[]
}

export default function LogMap({ logs }: LogMapProps) {
  // Suppress Leaflet SSR warnings
  useEffect(() => {}, [])

  const markers = logs
    .map(log => {
      const coords = parseGps(log.gps_coordinates)
      if (!coords) return null
      return { log, coords }
    })
    .filter(Boolean) as { log: SprayLog; coords: [number, number] }[]

  // Default center: center of US if no markers
  const center: [number, number] = markers.length > 0
    ? [
        markers.reduce((s, m) => s + m.coords[0], 0) / markers.length,
        markers.reduce((s, m) => s + m.coords[1], 0) / markers.length,
      ]
    : [41.0, -96.0]

  const zoom = markers.length > 0 ? 8 : 5

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map(({ log, coords }) => (
        <Marker
          key={log.id}
          position={coords}
          icon={icons[log.mission_status] ?? icons.planned}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <div className="font-semibold text-gray-900">{log.customer_name ?? 'No Customer'}</div>
              {log.field_name && <div className="text-gray-600">{log.field_name}</div>}
              <div className="text-gray-500 text-xs">{formatDate(log.date)}</div>
              {log.acreage_treated && (
                <div className="text-gray-600">{log.acreage_treated} acres</div>
              )}
              {log.product_name && (
                <div className="text-gray-600 text-xs">{log.product_name}</div>
              )}
              <a
                href={`/logs/${log.id}`}
                className="inline-block mt-1 text-xs font-medium text-green-600 hover:text-green-700"
              >
                View Details &rarr;
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ImageOverlay,
  LayersControl,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface ApplicationMapProps {
  geojson: GeoJSON.FeatureCollection
  overlayUrl?: string | null
  overlayBounds?: [[number, number], [number, number]] | null
}

// Auto-fit bounds to GeoJSON extent
function FitBounds({ geojson }: { geojson: GeoJSON.FeatureCollection }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current) return
    const layer = L.geoJSON(geojson)
    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] })
      fitted.current = true
    }
  }, [map, geojson])

  return null
}

const polygonStyle: L.PathOptions = {
  color: '#16a34a',
  weight: 2,
  fillColor: '#16a34a',
  fillOpacity: 0.15,
}

export default function ApplicationMap({
  geojson,
  overlayUrl,
  overlayBounds,
}: ApplicationMapProps) {
  return (
    <MapContainer
      center={[41, -96]}
      zoom={5}
      className="w-full rounded-xl"
      style={{ height: 'clamp(280px, 40vw, 400px)' }}
      scrollWheelZoom
    >
      <FitBounds geojson={geojson} />

      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay checked name="Field Boundary">
          <GeoJSON data={geojson} style={polygonStyle} />
        </LayersControl.Overlay>

        {overlayUrl && overlayBounds && (
          <LayersControl.Overlay checked name="Prescription Overlay">
            <ImageOverlay url={overlayUrl} bounds={overlayBounds} opacity={0.7} />
          </LayersControl.Overlay>
        )}
      </LayersControl>
    </MapContainer>
  )
}

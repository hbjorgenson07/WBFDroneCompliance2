'use client'

import { useState } from 'react'

export interface WeatherData {
  wind_speed: string
  wind_direction: string
  temperature: string
  humidity: string
  sky_conditions: string
}

interface WeatherLocationButtonProps {
  onLocation: (coords: { lat: number; lon: number }) => void
  onWeather: (weather: WeatherData) => void
  variant?: 'full' | 'refresh'
}

type Status = 'idle' | 'locating' | 'fetching' | 'done' | 'error'

export default function WeatherLocationButton({
  onLocation,
  onWeather,
  variant = 'full',
}: WeatherLocationButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Geolocation is not supported by your browser')
      return
    }

    setStatus('locating')
    setMessage('Getting location...')

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const lat = Math.round(position.coords.latitude * 1000000) / 1000000
      const lon = Math.round(position.coords.longitude * 1000000) / 1000000
      onLocation({ lat, lon })

      setStatus('fetching')
      setMessage('Fetching weather...')

      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Weather request failed')
      }

      const weather: WeatherData = await res.json()
      onWeather(weather)

      setStatus('done')
      setMessage('Updated')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 2000)
    } catch (err) {
      setStatus('error')
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setMessage('Location permission denied')
            break
          case err.POSITION_UNAVAILABLE:
            setMessage('Location unavailable')
            break
          case err.TIMEOUT:
            setMessage('Location request timed out')
            break
          default:
            setMessage('Location error')
        }
      } else {
        setMessage(err instanceof Error ? err.message : 'An error occurred')
      }
    }
  }

  const isRefresh = variant === 'refresh'
  const busy = status === 'locating' || status === 'fetching'

  return (
    <div className={isRefresh ? 'flex items-center gap-2' : 'flex items-center gap-3'}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={
          isRefresh
            ? 'text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors duration-200'
            : 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200'
        }
      >
        {busy && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isRefresh ? 'Refresh Weather' : 'Get Location & Weather'}
      </button>
      {message && (
        <span className={`text-xs ${
          status === 'error'
            ? 'text-red-500 dark:text-red-400'
            : status === 'done'
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {message}
        </span>
      )}
    </div>
  )
}

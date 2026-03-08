'use client'

import { useState, useEffect, useCallback } from 'react'
import { WeatherData } from './WeatherLocationButton'

type Status = 'loading' | 'ready' | 'error'

function parseWind(windStr: string): number {
  const match = windStr.match(/([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

function sprayCondition(windMph: number): { label: string; color: string; bg: string; reason: string } {
  if (windMph <= 10) return { label: 'Good to Spray', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', reason: '' }
  if (windMph <= 15) return { label: 'Marginal', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', reason: `Wind ${windMph} mph — approaching drift risk threshold` }
  return { label: 'Not Recommended', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', reason: `Wind ${windMph} mph — high drift risk, most labels restrict >15 mph` }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchWeather = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')

    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMsg('Geolocation not supported')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // cache position for 5 minutes
        })
      })

      const lat = Math.round(position.coords.latitude * 1000000) / 1000000
      const lon = Math.round(position.coords.longitude * 1000000) / 1000000

      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error('Weather fetch failed')

      const data: WeatherData = await res.json()
      setWeather(data)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      if (err instanceof GeolocationPositionError) {
        setErrorMsg(err.code === err.PERMISSION_DENIED
          ? 'Location access denied — enable it in browser settings to see weather.'
          : 'Could not determine location.')
      } else {
        setErrorMsg('Unable to fetch weather data.')
      }
    }
  }, [])

  useEffect(() => { fetchWeather() }, [fetchWeather])

  // Loading skeleton
  if (status === 'loading') {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-28 bg-gray-200 dark:bg-white/10 rounded" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
        </div>
        <div className="flex items-end gap-6">
          <div className="h-12 w-24 bg-gray-200 dark:bg-white/10 rounded" />
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="h-8 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-8 bg-gray-200 dark:bg-white/10 rounded" />
            <div className="h-8 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Weather</p>
          <button onClick={fetchWeather} className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
            Retry
          </button>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">{errorMsg}</p>
      </div>
    )
  }

  const wind = parseWind(weather!.wind_speed)
  const condition = sprayCondition(wind)

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5 hover:shadow-[var(--shadow-1)] transition-all duration-200 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Weather</p>
        <button onClick={fetchWeather} className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
          Refresh
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        {/* Temperature hero */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {weather!.temperature}
          </span>
        </div>

        {/* Secondary stats */}
        <div className="flex-1 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Wind</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {weather!.wind_speed} {weather!.wind_direction}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Humidity</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{weather!.humidity}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Sky</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{weather!.sky_conditions}</p>
          </div>
        </div>
      </div>

      {/* Spray condition badge */}
      <div className="mt-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${condition.color} ${condition.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            wind <= 10 ? 'bg-green-500' : wind <= 15 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {condition.label}
        </span>
        {condition.reason && (
          <p className={`text-xs mt-1.5 ${condition.color}`}>{condition.reason}</p>
        )}
      </div>
    </div>
  )
}

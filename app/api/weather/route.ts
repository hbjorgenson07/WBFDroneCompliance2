import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Map cloud cover percentage to our sky condition labels
function mapSkyConditions(cloudCover: number): string {
  if (cloudCover <= 10) return 'Clear'
  if (cloudCover <= 30) return 'Mostly Clear'
  if (cloudCover <= 60) return 'Partly Cloudy'
  if (cloudCover <= 85) return 'Mostly Cloudy'
  return 'Overcast'
}

// Map wind direction degrees to compass abbreviation
function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(deg / 22.5) % 16
  return dirs[idx]
}

// GET /api/weather?lat=41.123&lon=-96.456
export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const lat = params.get('lat')
  const lon = params.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon query params are required' }, { status: 400 })
  }

  const apiKey = process.env.TOMORROW_IO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API key not configured' }, { status: 500 })
  }

  try {
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${apiKey}`
    const res = await fetch(url)

    if (!res.ok) {
      const text = await res.text()
      console.error('tomorrow.io error:', res.status, text)
      return NextResponse.json({ error: 'Weather API request failed' }, { status: 502 })
    }

    const data = await res.json()
    const v = data.data?.values

    if (!v) {
      return NextResponse.json({ error: 'Unexpected weather API response' }, { status: 502 })
    }

    // Convert Celsius to Fahrenheit, m/s to mph
    const tempF = Math.round(v.temperature * 9 / 5 + 32)
    const windMph = Math.round(v.windSpeed * 2.237)
    const compassDir = degreesToCompass(v.windDirection ?? 0)
    const humidityPct = Math.round(v.humidity ?? 0)
    const sky = mapSkyConditions(v.cloudCover ?? 0)

    return NextResponse.json({
      wind_speed: `${windMph} mph`,
      wind_direction: compassDir,
      temperature: `${tempF}°F`,
      humidity: `${humidityPct}%`,
      sky_conditions: sky,
    })
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}

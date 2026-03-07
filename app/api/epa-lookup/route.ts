import { NextRequest, NextResponse } from 'next/server'

const EPA_BASE = 'https://ordspub.epa.gov/ords/pesticides'

// GET /api/epa-lookup?reg=524-539   — lookup by EPA registration number
// GET /api/epa-lookup?name=Roundup  — lookup by product name
export async function GET(request: NextRequest) {
  const reg = request.nextUrl.searchParams.get('reg')
  const name = request.nextUrl.searchParams.get('name')

  if (!reg && !name) {
    return NextResponse.json({ error: 'Provide reg or name param' }, { status: 400 })
  }

  try {
    if (reg) {
      const url = `${EPA_BASE}/cswu/ppls/${encodeURIComponent(reg)}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 }, // cache for 1 hour
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const data = await res.json()

      // ORDS returns either { items: [...] } or the object directly
      const item = Array.isArray(data?.items) ? data.items[0] : data

      const productName = item?.productname
      if (!productName) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      // Map first pesticide type to a clean label (e.g. "HERBICIDE TERRESTRIAL" → "Herbicide")
      const rawType: string = item?.types?.[0]?.type ?? ''
      const product_type = rawType
        ? rawType.split(' ')[0].charAt(0) + rawType.split(' ')[0].slice(1).toLowerCase()
        : null

      // Build label notes from signal word + active ingredients + RUP status
      const ais: string = (item?.active_ingredients ?? [])
        .slice(0, 5)
        .map((ai: { active_ing: string; active_ing_percent: string }) =>
          `${ai.active_ing} ${ai.active_ing_percent}%`
        )
        .join(', ')
      const signalWord: string = item?.signal_word ?? ''
      const rupText = item?.rup_yn === 'Yes' ? 'Restricted Use Pesticide.' : ''
      const label_restriction_notes =
        [
          signalWord ? `Signal Word: ${signalWord}.` : '',
          ais ? `Active Ingredients: ${ais}.` : '',
          rupText,
        ]
          .filter(Boolean)
          .join(' ') || null

      return NextResponse.json({
        product_name: productName,
        epa_registration_number: reg,
        restricted_use_pesticide: item?.rup_yn === 'Yes',
        product_type,
        label_restriction_notes,
      })
    } else {
      const url = `${EPA_BASE}/cswu/pplstxt/${encodeURIComponent(name!)}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const data = await res.json()
      const rawItems: Record<string, unknown>[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [data]

      const items = rawItems.filter(item => item?.productname)

      if (!items.length) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const results = items.map(item => {
        const rawType: string = (item?.types as Array<{ type: string }>)?.[0]?.type ?? ''
        const product_type = rawType
          ? rawType.split(' ')[0].charAt(0) + rawType.split(' ')[0].slice(1).toLowerCase()
          : null

        const ais: string = ((item?.active_ingredients ?? []) as Array<{ active_ing: string; active_ing_percent: string }>)
          .slice(0, 5)
          .map(ai => `${ai.active_ing} ${ai.active_ing_percent}%`)
          .join(', ')
        const signalWord: string = (item?.signal_word as string) ?? ''
        const rupText = item?.rup_yn === 'Yes' ? 'Restricted Use Pesticide.' : ''
        const label_restriction_notes =
          [
            signalWord ? `Signal Word: ${signalWord}.` : '',
            ais ? `Active Ingredients: ${ais}.` : '',
            rupText,
          ]
            .filter(Boolean)
            .join(' ') || null

        return {
          product_name: item.productname as string,
          epa_registration_number: (item.eparegno ?? null) as string | null,
          restricted_use_pesticide: item.rup_yn === 'Yes',
          product_type,
          label_restriction_notes,
        }
      })

      return NextResponse.json(results)
    }
  } catch {
    return NextResponse.json({ error: 'EPA lookup failed' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/products?search=TERM — search saved products by name
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = request.nextUrl.searchParams.get('search') ?? ''

  let query = supabase
    .from('saved_products')
    .select('*')
    .eq('user_id', user.id)
    .order('product_name')

  if (search) {
    query = query.or(`product_name.ilike.%${search}%,epa_registration_number.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/products — save a product to the library (upsert by name)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.product_name?.trim()) {
    return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
  }

  // Strip fields that don't belong on saved_products
  const {
    product_name,
    epa_registration_number,
    product_type,
    target_pest,
    rate_applied,
    carrier_type,
    restricted_use_pesticide,
    label_restriction_notes,
    notes,
  } = body

  // Upsert: if this user already has a product with this exact name, update it
  const { data, error } = await supabase
    .from('saved_products')
    .upsert(
      {
        user_id: user.id,
        product_name: product_name.trim(),
        epa_registration_number: epa_registration_number ?? null,
        product_type: product_type ?? null,
        target_pest: target_pest ?? null,
        rate_applied: rate_applied ?? null,
        carrier_type: carrier_type ?? null,
        restricted_use_pesticide: restricted_use_pesticide ?? false,
        label_restriction_notes: label_restriction_notes ?? null,
        notes: notes ?? null,
      },
      { onConflict: 'user_id,product_name' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

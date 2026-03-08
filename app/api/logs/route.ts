import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJobId } from '@/lib/utils'

// GET /api/logs — fetch all logs for the current user with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const search  = params.get('search') ?? ''
  const status  = params.get('status') ?? ''
  const aircraft = params.get('aircraft') ?? ''
  const crop        = params.get('crop') ?? ''
  const productType = params.get('productType') ?? ''
  const from    = params.get('from') ?? ''
  const to      = params.get('to') ?? ''
  const sort    = params.get('sort') ?? 'newest'
  const limit   = parseInt(params.get('limit') ?? '100', 10)

  let query = supabase
    .from('spray_logs')
    .select('*')
    .eq('user_id', user.id)

  // Text search across customer, field, and product name
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,field_name.ilike.%${search}%,product_name.ilike.%${search}%,job_id.ilike.%${search}%`
    )
  }

  if (status)   query = query.eq('mission_status', status)
  if (aircraft) query = query.ilike('aircraft_tail_number', `%${aircraft}%`)
  if (crop)        query = query.ilike('crop_type', `%${crop}%`)
  if (productType) query = query.ilike('product_type', `%${productType}%`)
  if (from)     query = query.gte('date', from)
  if (to)       query = query.lte('date', to)

  query = query
    .order('date', { ascending: sort === 'oldest' })
    .order('created_at', { ascending: sort === 'oldest' })
    .limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/logs — create a new spray log
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Ensure required fields are present
  if (!body.date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  // Auto-generate job_id if not provided
  const job_id = body.job_id?.trim() || generateJobId()

  const { data, error } = await supabase
    .from('spray_logs')
    .insert({ ...body, job_id, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

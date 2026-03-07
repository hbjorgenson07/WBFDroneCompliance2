import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCsv } from '@/lib/utils'
import { SprayLog } from '@/lib/types'

// GET /api/export — download filtered spray logs as a CSV file
// Accepts the same query params as GET /api/logs
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const search   = params.get('search') ?? ''
  const status   = params.get('status') ?? ''
  const aircraft = params.get('aircraft') ?? ''
  const crop     = params.get('crop') ?? ''
  const from     = params.get('from') ?? ''
  const to       = params.get('to') ?? ''

  let query = supabase
    .from('spray_logs')
    .select('*')
    .eq('user_id', user.id)

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,field_name.ilike.%${search}%,product_name.ilike.%${search}%,job_id.ilike.%${search}%`
    )
  }
  if (status)   query = query.eq('mission_status', status)
  if (aircraft) query = query.ilike('aircraft_tail_number', `%${aircraft}%`)
  if (crop)     query = query.ilike('crop_type', `%${crop}%`)
  if (from)     query = query.gte('date', from)
  if (to)       query = query.lte('date', to)

  query = query.order('date', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const csv = buildCsv(data as SprayLog[])
  const filename = `spray-logs-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

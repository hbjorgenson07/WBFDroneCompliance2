import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/logs/[id]/map-image — Proxy a signed URL for the private overlay PNG
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership and get overlay path
  const { data: log, error: logError } = await supabase
    .from('spray_logs')
    .select('map_overlay_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (logError || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  if (!log.map_overlay_path) {
    return NextResponse.json({ error: 'No overlay image' }, { status: 404 })
  }

  // Generate a signed URL (1 hour expiry)
  const { data, error } = await supabase.storage
    .from('map-uploads')
    .createSignedUrl(log.map_overlay_path, 3600)

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}

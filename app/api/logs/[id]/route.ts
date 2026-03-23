import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/logs/[id] — fetch a single spray log
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('spray_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)  // RLS also enforces this, but being explicit is good practice
    .single()

  if (error) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  return NextResponse.json(data)
}

// PUT /api/logs/[id] — update a spray log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Remove fields that should never be updated directly
  delete body.id
  delete body.user_id
  delete body.created_at
  delete body.updated_at

  const { data, error } = await supabase
    .from('spray_logs')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE /api/logs/[id] — delete a spray log
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get map file paths before deleting the log
  const { data: log } = await supabase
    .from('spray_logs')
    .select('map_shapefile_path, map_overlay_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Clean up Storage files if any exist
  if (log) {
    const filesToDelete: string[] = []
    if (log.map_shapefile_path) filesToDelete.push(log.map_shapefile_path)
    if (log.map_overlay_path) filesToDelete.push(log.map_overlay_path)
    if (filesToDelete.length > 0) {
      await supabase.storage.from('map-uploads').remove(filesToDelete)
    }
  }

  const { error } = await supabase
    .from('spray_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

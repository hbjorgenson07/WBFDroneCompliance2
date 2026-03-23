import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseMapZip, shapefileToGeoJSON, geotiffToPngOverlay } from '@/lib/map-processing'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

// POST /api/logs/[id]/map — Upload & process a shapefile ZIP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify log ownership
  const { data: log, error: logError } = await supabase
    .from('spray_logs')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (logError || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  // Parse FormData
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'File must be a .zip archive' }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()

    // Parse and validate ZIP contents
    const parsed = await parseMapZip(arrayBuffer)

    // Convert shapefile to GeoJSON
    const { geojson } = await shapefileToGeoJSON(arrayBuffer)

    // Process GeoTIFF if present
    let overlayPath: string | null = null
    let overlayBounds: [[number, number], [number, number]] | null = null

    if (parsed.tiffBuffer) {
      const overlay = await geotiffToPngOverlay(parsed.tiffBuffer)
      overlayBounds = overlay.bounds

      // Upload PNG overlay to Supabase Storage
      const pngPath = `${user.id}/${id}/overlay.png`
      const { error: pngError } = await supabase.storage
        .from('map-uploads')
        .upload(pngPath, overlay.pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        })
      if (pngError) throw new Error(`Failed to upload overlay: ${pngError.message}`)
      overlayPath = pngPath
    }

    // Upload original ZIP to Storage
    const zipPath = `${user.id}/${id}/field.zip`
    const { error: zipError } = await supabase.storage
      .from('map-uploads')
      .upload(zipPath, arrayBuffer, {
        contentType: 'application/zip',
        upsert: true,
      })
    if (zipError) throw new Error(`Failed to upload ZIP: ${zipError.message}`)

    // Update the spray_logs row
    const { data: updated, error: updateError } = await supabase
      .from('spray_logs')
      .update({
        map_geojson: geojson,
        map_shapefile_path: zipPath,
        map_overlay_path: overlayPath,
        map_overlay_bounds: overlayBounds,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to update log: ${updateError.message}`)

    return NextResponse.json({
      map_geojson: updated.map_geojson,
      map_shapefile_path: updated.map_shapefile_path,
      map_overlay_path: updated.map_overlay_path,
      map_overlay_bounds: updated.map_overlay_bounds,
      warnings: parsed.warnings,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// DELETE /api/logs/[id]/map — Remove map data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get current paths to know what to delete from Storage
  const { data: log, error: logError } = await supabase
    .from('spray_logs')
    .select('map_shapefile_path, map_overlay_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (logError || !log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  // Delete files from Storage
  const filesToDelete: string[] = []
  if (log.map_shapefile_path) filesToDelete.push(log.map_shapefile_path)
  if (log.map_overlay_path) filesToDelete.push(log.map_overlay_path)

  if (filesToDelete.length > 0) {
    await supabase.storage.from('map-uploads').remove(filesToDelete)
  }

  // Null out map columns
  const { error: updateError } = await supabase
    .from('spray_logs')
    .update({
      map_geojson: null,
      map_shapefile_path: null,
      map_overlay_path: null,
      map_overlay_bounds: null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

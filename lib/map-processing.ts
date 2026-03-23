import JSZip from 'jszip'
import shp from 'shpjs'
import { fromArrayBuffer } from 'geotiff'
import sharp from 'sharp'

export interface ParsedMapZip {
  shpBuffer: ArrayBuffer
  dbfBuffer: ArrayBuffer
  prjBuffer: ArrayBuffer | null
  tiffBuffer: ArrayBuffer | null
  warnings: string[]
}

export interface GeoJSONResult {
  geojson: GeoJSON.FeatureCollection
}

export interface OverlayResult {
  pngBuffer: Buffer
  bounds: [[number, number], [number, number]] // [[south, west], [north, east]]
}

/**
 * Parse a ZIP file and extract shapefile components + optional GeoTIFF.
 */
export async function parseMapZip(buffer: ArrayBuffer): Promise<ParsedMapZip> {
  const zip = await JSZip.loadAsync(buffer)
  const warnings: string[] = []

  // Find files by extension (case-insensitive, ignore __MACOSX)
  function findByExt(ext: string): JSZip.JSZipObject | null {
    let found: JSZip.JSZipObject | null = null
    zip.forEach((path, file) => {
      if (
        !file.dir &&
        !path.startsWith('__MACOSX') &&
        path.toLowerCase().endsWith(ext.toLowerCase())
      ) {
        found = file
      }
    })
    return found
  }

  const shpFile = findByExt('.shp')
  const dbfFile = findByExt('.dbf')
  const prjFile = findByExt('.prj')
  const tiffFile = findByExt('.tif') || findByExt('.tiff')

  if (!shpFile) throw new Error('ZIP does not contain a .shp file')
  if (!dbfFile) throw new Error('ZIP does not contain a .dbf file')
  if (!prjFile) warnings.push('No .prj file found — coordinates assumed to be WGS84 (EPSG:4326)')

  const shpBuffer = await shpFile.async('arraybuffer')
  const dbfBuffer = await dbfFile.async('arraybuffer')
  const prjBuffer = prjFile ? await prjFile.async('arraybuffer') : null
  const tiffBuffer = tiffFile ? await tiffFile.async('arraybuffer') : null

  return { shpBuffer, dbfBuffer, prjBuffer, tiffBuffer, warnings }
}

/**
 * Convert the full ZIP buffer to GeoJSON using shpjs (it handles ZIP natively).
 */
export async function shapefileToGeoJSON(zipBuffer: ArrayBuffer): Promise<GeoJSONResult> {
  const result = await shp(zipBuffer)

  // shpjs can return a single FeatureCollection or an array of them
  const geojson: GeoJSON.FeatureCollection = Array.isArray(result) ? result[0] : result

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    throw new Error('Shapefile contains no features')
  }

  return { geojson }
}

/**
 * Convert a GeoTIFF to a PNG buffer and extract geographic bounds.
 */
export async function geotiffToPngOverlay(buffer: ArrayBuffer): Promise<OverlayResult> {
  const tiff = await fromArrayBuffer(buffer)
  const image = await tiff.getImage()

  const bbox = image.getBoundingBox() // [west, south, east, north]
  const bounds: [[number, number], [number, number]] = [
    [bbox[1], bbox[0]], // [south, west]
    [bbox[3], bbox[2]], // [north, east]
  ]

  const width = image.getWidth()
  const height = image.getHeight()
  const rasters = await image.readRasters()

  // Build RGBA buffer from raster bands
  const pixelCount = width * height
  const rgba = Buffer.alloc(pixelCount * 4)

  const numBands = rasters.length
  for (let i = 0; i < pixelCount; i++) {
    if (numBands >= 3) {
      // RGB or RGBA raster
      rgba[i * 4] = (rasters[0] as Uint8Array)[i]     // R
      rgba[i * 4 + 1] = (rasters[1] as Uint8Array)[i] // G
      rgba[i * 4 + 2] = (rasters[2] as Uint8Array)[i] // B
      rgba[i * 4 + 3] = numBands >= 4 ? (rasters[3] as Uint8Array)[i] : 255
    } else {
      // Single-band grayscale — render as semi-transparent green
      const val = (rasters[0] as Uint8Array)[i]
      rgba[i * 4] = 0       // R
      rgba[i * 4 + 1] = val // G
      rgba[i * 4 + 2] = 0   // B
      rgba[i * 4 + 3] = val > 0 ? 180 : 0 // transparent where no data
    }
  }

  const pngBuffer = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()

  return { pngBuffer, bounds }
}

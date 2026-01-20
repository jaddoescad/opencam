import type { Canvas, FabricObject } from 'fabric'

export type ToolMode = 'select' | 'arrow' | 'freehand'

export type AnnotationColor = '#ef4444' | '#3b82f6' | '#eab308' | '#ffffff' | '#000000'

export const ANNOTATION_COLORS: { value: AnnotationColor; label: string }[] = [
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
]

export const STROKE_WIDTHS = [2, 4, 6, 8]

/**
 * Create an arrow with arrowhead using Fabric.js
 * Returns a group containing the line and triangle
 */
export async function createArrow(
  fabric: typeof import('fabric'),
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  strokeWidth: number
): Promise<FabricObject> {
  const { Line, Triangle, Group } = fabric

  // Calculate angle for arrowhead rotation
  const angle = Math.atan2(endY - startY, endX - startX)
  const headLength = strokeWidth * 4

  // Create the line
  const line = new Line([startX, startY, endX, endY], {
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLineCap: 'round',
    selectable: false,
  })

  // Create the arrowhead triangle
  const triangle = new Triangle({
    left: endX,
    top: endY,
    width: headLength,
    height: headLength,
    fill: color,
    angle: (angle * 180) / Math.PI + 90,
    originX: 'center',
    originY: 'center',
    selectable: false,
  })

  // Group them together for easy selection/manipulation
  const group = new Group([line, triangle], {
    selectable: true,
    hasControls: true,
    hasBorders: true,
  })

  return group
}

/**
 * Convert canvas data URL to a Blob for uploading
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}

/**
 * Calculate canvas dimensions to fit the viewport while maintaining aspect ratio
 */
export function calculateCanvasDimensions(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  const aspectRatio = imageWidth / imageHeight
  let width = maxWidth
  let height = maxWidth / aspectRatio

  if (height > maxHeight) {
    height = maxHeight
    width = maxHeight * aspectRatio
  }

  const scale = width / imageWidth

  return { width, height, scale }
}

/**
 * Export canvas to data URL with the background image
 */
export function exportCanvasToDataUrl(
  canvas: Canvas,
  format: 'png' | 'jpeg' = 'png',
  quality = 1
): string {
  return canvas.toDataURL({
    format,
    quality,
    multiplier: 1 / (canvas.getZoom() || 1), // Export at original image resolution
  })
}

/**
 * Custom serialization to include annotation metadata
 * Excludes the background image (first object) - only saves annotations
 */
export function serializeCanvas(canvas: Canvas): Record<string, unknown> {
  const json = canvas.toJSON() as { objects?: unknown[] }

  // Filter out the first object (background image) from serialization
  // The background image is always re-added when opening the editor
  const objects = json.objects || []
  const annotationObjects = objects.slice(1) // Skip first object (background image)

  return {
    ...json,
    objects: annotationObjects,
    version: '1.0',
    fabricVersion: '6.x',
  }
}

/**
 * Load annotations from JSON into the canvas
 * Only loads annotation objects, preserves existing background image
 */
export async function loadAnnotationsFromJson(
  canvas: Canvas,
  json: Record<string, unknown>,
  fabric: typeof import('fabric')
): Promise<void> {
  const objects = (json.objects as unknown[]) || []

  if (objects.length === 0) {
    return
  }

  // Use enlivenObjects to create Fabric objects from the serialized data
  const enlivenedObjects = await fabric.util.enlivenObjects(objects)

  // Add each object to the canvas (filter to only FabricObject instances)
  enlivenedObjects.forEach((obj) => {
    // Check if it's a valid canvas object (has 'add' capability)
    if (obj && typeof obj === 'object' && 'left' in obj) {
      canvas.add(obj as FabricObject)
    }
  })

  canvas.renderAll()
}

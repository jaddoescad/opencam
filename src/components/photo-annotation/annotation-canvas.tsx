'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { Canvas as FabricCanvas, FabricObject, TPointerEventInfo, TPointerEvent } from 'fabric'
import {
  type ToolMode,
  type AnnotationColor,
  createArrow,
  serializeCanvas,
  loadAnnotationsFromJson,
} from '@/lib/annotation/fabric-helpers'

interface AnnotationCanvasProps {
  imageUrl: string
  toolMode: ToolMode
  strokeColor: AnnotationColor
  strokeWidth: number
  existingAnnotation?: Record<string, unknown> | null
  onStateChange?: (state: Record<string, unknown>) => void
}

export interface AnnotationCanvasHandle {
  getCanvas: () => FabricCanvas | null
  toJSON: () => Record<string, unknown>
  toDataURL: () => string
  clear: () => void
  deleteSelected: () => void
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas(
    { imageUrl, toolMode, strokeColor, strokeWidth, existingAnnotation, onStateChange },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricCanvasRef = useRef<FabricCanvas | null>(null)
    const fabricRef = useRef<typeof import('fabric') | null>(null)
    const bgImageRef = useRef<FabricObject | null>(null)
    const isDrawingRef = useRef(false)
    const startPointRef = useRef<{ x: number; y: number } | null>(null)
    const tempObjectRef = useRef<FabricObject | null>(null)

    const scaleFactorRef = useRef<number>(1)
    const originalSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

    const [isReady, setIsReady] = useState(false)

    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      toJSON: () => {
        if (!fabricCanvasRef.current) return {}
        const json = serializeCanvas(fabricCanvasRef.current)
        return {
          ...json,
          _scaleFactor: scaleFactorRef.current,
          _originalWidth: originalSizeRef.current.width,
          _originalHeight: originalSizeRef.current.height,
        }
      },
      toDataURL: () => {
        if (!fabricCanvasRef.current) return ''
        return fabricCanvasRef.current.toDataURL({ format: 'png', multiplier: 1 / scaleFactorRef.current })
      },
      clear: () => {
        if (!fabricCanvasRef.current) return
        const objects = fabricCanvasRef.current.getObjects()
        // Remove all except background image
        objects.forEach(obj => {
          if (obj !== bgImageRef.current) {
            fabricCanvasRef.current?.remove(obj)
          }
        })
        fabricCanvasRef.current.renderAll()
        onStateChange?.(serializeCanvas(fabricCanvasRef.current))
      },
      deleteSelected: () => {
        if (!fabricCanvasRef.current) return
        const active = fabricCanvasRef.current.getActiveObjects()
        active.forEach(obj => {
          if (obj !== bgImageRef.current) {
            fabricCanvasRef.current?.remove(obj)
          }
        })
        fabricCanvasRef.current.discardActiveObject()
        fabricCanvasRef.current.renderAll()
        onStateChange?.(serializeCanvas(fabricCanvasRef.current))
      },
    }))

    const saveState = useCallback(() => {
      if (fabricCanvasRef.current && onStateChange) {
        onStateChange({
          ...serializeCanvas(fabricCanvasRef.current),
          _scaleFactor: scaleFactorRef.current,
          _originalWidth: originalSizeRef.current.width,
          _originalHeight: originalSizeRef.current.height,
        })
      }
    }, [onStateChange])

    // Single useEffect to handle everything
    useEffect(() => {
      if (!canvasElRef.current || !containerRef.current) return

      let mounted = true
      let canvas: FabricCanvas | null = null

      const init = async () => {
        // Load fabric first
        const fabric = await import('fabric')
        if (!mounted) return
        fabricRef.current = fabric

        // Use FabricImage.fromURL to properly load the image
        const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
        if (!mounted) return

        // Get original size using Fabric's method
        const originalSize = img.getOriginalSize()
        const imgWidth = originalSize.width
        const imgHeight = originalSize.height

        if (imgWidth === 0 || imgHeight === 0) {
          console.error('Image dimensions are 0')
          return
        }

        originalSizeRef.current = { width: imgWidth, height: imgHeight }

        // Get the actual container dimensions
        const containerRect = containerRef.current!.getBoundingClientRect()
        const maxW = containerRect.width - 32 // Account for padding
        const maxH = containerRect.height - 32

        // Calculate scale to fit container while maintaining aspect ratio
        const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1)
        scaleFactorRef.current = scale

        const canvasWidth = Math.round(imgWidth * scale)
        const canvasHeight = Math.round(imgHeight * scale)

        // Dispose old canvas if exists
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()
        }

        // Set canvas element dimensions before creating Fabric canvas
        canvasElRef.current!.width = canvasWidth
        canvasElRef.current!.height = canvasHeight

        // Create new canvas with explicit dimensions
        canvas = new fabric.Canvas(canvasElRef.current!, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#1f1f1f',
        })
        fabricCanvasRef.current = canvas

        // Ensure canvas dimensions are set
        canvas.setDimensions({ width: canvasWidth, height: canvasHeight })

        // Configure image
        img.set({
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          originX: 'left',
          originY: 'top',
        })

        canvas.add(img)
        bgImageRef.current = img

        // Load existing annotations
        if (existingAnnotation && Object.keys(existingAnnotation).length > 0) {
          const savedScale = (existingAnnotation._scaleFactor as number) || 1
          const rescale = scale / savedScale

          await loadAnnotationsFromJson(canvas, existingAnnotation, fabric)

          if (Math.abs(rescale - 1) > 0.01) {
            canvas.getObjects().forEach(obj => {
              if (obj !== img) {
                obj.left = (obj.left || 0) * rescale
                obj.top = (obj.top || 0) * rescale
                obj.scaleX = (obj.scaleX || 1) * rescale
                obj.scaleY = (obj.scaleY || 1) * rescale
                obj.setCoords()
              }
            })
          }
        }

        // Ensure image is at back
        canvas.sendObjectToBack(img)

        canvas.on('object:modified', saveState)
        canvas.on('object:added', saveState)
        canvas.on('object:removed', saveState)

        canvas.renderAll()
        setIsReady(true)
      }

      init()

      return () => {
        mounted = false
        if (canvas) {
          canvas.dispose()
        }
      }
    }, [imageUrl, existingAnnotation, saveState])

    // Tool mode handling
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || !isReady) return

      if (toolMode === 'select') {
        canvas.isDrawingMode = false
        canvas.selection = true
        canvas.forEachObject(obj => {
          if (obj !== bgImageRef.current) {
            obj.selectable = true
            obj.evented = true
          }
        })
      } else if (toolMode === 'freehand') {
        canvas.isDrawingMode = true
        canvas.selection = false
        if (!canvas.freeDrawingBrush && fabricRef.current) {
          canvas.freeDrawingBrush = new fabricRef.current.PencilBrush(canvas)
        }
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = strokeColor
          canvas.freeDrawingBrush.width = strokeWidth
        }
      } else if (toolMode === 'arrow') {
        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.forEachObject(obj => {
          obj.selectable = false
          obj.evented = false
        })
      }
      canvas.renderAll()
    }, [toolMode, strokeColor, strokeWidth, isReady])

    // Brush updates
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas?.freeDrawingBrush) return
      canvas.freeDrawingBrush.color = strokeColor
      canvas.freeDrawingBrush.width = strokeWidth
    }, [strokeColor, strokeWidth])

    // Arrow drawing
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || toolMode !== 'arrow' || !isReady) return

      const onDown = (e: TPointerEventInfo<TPointerEvent>) => {
        isDrawingRef.current = true
        startPointRef.current = { x: e.scenePoint.x, y: e.scenePoint.y }
      }

      const onMove = async (e: TPointerEventInfo<TPointerEvent>) => {
        if (!isDrawingRef.current || !startPointRef.current || !fabricRef.current) return

        if (tempObjectRef.current) canvas.remove(tempObjectRef.current)

        const arrow = await createArrow(
          fabricRef.current,
          startPointRef.current.x, startPointRef.current.y,
          e.scenePoint.x, e.scenePoint.y,
          strokeColor, strokeWidth
        )
        arrow.selectable = false
        tempObjectRef.current = arrow
        canvas.add(arrow)
        canvas.renderAll()
      }

      const onUp = async (e: TPointerEventInfo<TPointerEvent>) => {
        if (!isDrawingRef.current || !startPointRef.current || !fabricRef.current) return

        if (tempObjectRef.current) {
          canvas.remove(tempObjectRef.current)
          tempObjectRef.current = null
        }

        const dx = e.scenePoint.x - startPointRef.current.x
        const dy = e.scenePoint.y - startPointRef.current.y

        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          const arrow = await createArrow(
            fabricRef.current,
            startPointRef.current.x, startPointRef.current.y,
            e.scenePoint.x, e.scenePoint.y,
            strokeColor, strokeWidth
          )
          canvas.add(arrow)
          canvas.renderAll()
          saveState()
        }

        isDrawingRef.current = false
        startPointRef.current = null
      }

      canvas.on('mouse:down', onDown)
      canvas.on('mouse:move', onMove)
      canvas.on('mouse:up', onUp)

      return () => {
        canvas.off('mouse:down', onDown)
        canvas.off('mouse:move', onMove)
        canvas.off('mouse:up', onUp)
      }
    }, [toolMode, strokeColor, strokeWidth, saveState, isReady])

    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-auto"
        style={{ backgroundColor: '#111' }}
      >
        <div className="relative flex-shrink-0">
          <canvas ref={canvasElRef} />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 min-w-[400px] min-h-[300px]">
              <span className="text-white text-lg">Loading image...</span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

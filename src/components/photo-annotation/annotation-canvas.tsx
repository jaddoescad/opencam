'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
import {
  type ToolMode,
  type AnnotationColor,
  createArrow,
  calculateCanvasDimensions,
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
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricCanvasRef = useRef<FabricCanvas | null>(null)
    const fabricRef = useRef<typeof import('fabric') | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const isDrawingRef = useRef(false)
    const startPointRef = useRef<{ x: number; y: number } | null>(null)
    const tempObjectRef = useRef<FabricObject | null>(null)

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      toJSON: () => {
        if (!fabricCanvasRef.current) return {}
        return serializeCanvas(fabricCanvasRef.current)
      },
      toDataURL: () => {
        if (!fabricCanvasRef.current) return ''
        return fabricCanvasRef.current.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        })
      },
      clear: () => {
        if (!fabricCanvasRef.current) return
        const objects = fabricCanvasRef.current.getObjects()
        objects.forEach((obj) => {
          fabricCanvasRef.current?.remove(obj)
        })
        fabricCanvasRef.current.renderAll()
        onStateChange?.(serializeCanvas(fabricCanvasRef.current))
      },
      deleteSelected: () => {
        if (!fabricCanvasRef.current) return
        const activeObjects = fabricCanvasRef.current.getActiveObjects()
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => {
            fabricCanvasRef.current?.remove(obj)
          })
          fabricCanvasRef.current.discardActiveObject()
          fabricCanvasRef.current.renderAll()
          onStateChange?.(serializeCanvas(fabricCanvasRef.current))
        }
      },
    }))

    // Save state when objects are modified
    const saveState = useCallback(() => {
      if (fabricCanvasRef.current && onStateChange) {
        onStateChange(serializeCanvas(fabricCanvasRef.current))
      }
    }, [onStateChange])

    // Initialize Fabric.js canvas
    useEffect(() => {
      let mounted = true

      const initCanvas = async () => {
        if (!canvasRef.current || !containerRef.current) return

        // Dynamically import fabric
        const fabric = await import('fabric')
        if (!mounted) return

        fabricRef.current = fabric

        // Load the image to get dimensions
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = imageUrl

        img.onload = async () => {
          if (!mounted || !canvasRef.current || !containerRef.current) return

          const containerWidth = containerRef.current.clientWidth
          const containerHeight = containerRef.current.clientHeight

          const { width, height, scale } = calculateCanvasDimensions(
            img.width,
            img.height,
            containerWidth,
            containerHeight
          )

          // Create fabric image
          const fabricImage = new fabric.FabricImage(img, {
            selectable: false,
            evented: false,
          })

          // Create canvas
          const canvas = new fabric.Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#1f2937',
          })

          fabricCanvasRef.current = canvas

          // Scale and set background
          fabricImage.scale(scale)
          canvas.backgroundImage = fabricImage
          canvas.renderAll()

          // Load existing annotations if provided
          if (existingAnnotation && Object.keys(existingAnnotation).length > 0) {
            try {
              await loadAnnotationsFromJson(canvas, existingAnnotation, fabric)
            } catch (err) {
              console.error('Failed to load existing annotations:', err)
            }
          }

          // Set up event listeners
          canvas.on('object:modified', saveState)
          canvas.on('object:added', saveState)
          canvas.on('object:removed', saveState)
        }
      }

      initCanvas()

      return () => {
        mounted = false
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()
          fabricCanvasRef.current = null
        }
      }
    }, [imageUrl, existingAnnotation, saveState])

    // Handle tool mode changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return

      if (toolMode === 'select') {
        canvas.isDrawingMode = false
        canvas.selection = true
        canvas.forEachObject((obj) => {
          obj.selectable = true
          obj.evented = true
        })
      } else if (toolMode === 'freehand') {
        canvas.isDrawingMode = true
        canvas.selection = false
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = strokeColor
          canvas.freeDrawingBrush.width = strokeWidth
        }
      } else if (toolMode === 'arrow') {
        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.forEachObject((obj) => {
          obj.selectable = false
          obj.evented = false
        })
      }

      canvas.renderAll()
    }, [toolMode, strokeColor, strokeWidth])

    // Update freehand brush when color/width changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || !canvas.freeDrawingBrush) return

      canvas.freeDrawingBrush.color = strokeColor
      canvas.freeDrawingBrush.width = strokeWidth
    }, [strokeColor, strokeWidth])

    // Handle arrow drawing with mouse events
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || toolMode !== 'arrow') return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMouseDown = (e: any) => {
        const pointer = e.scenePoint || e.pointer || { x: 0, y: 0 }
        isDrawingRef.current = true
        startPointRef.current = { x: pointer.x, y: pointer.y }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMouseMove = async (e: any) => {
        if (!isDrawingRef.current || !startPointRef.current || !fabricRef.current) return

        const pointer = e.scenePoint || e.pointer || { x: 0, y: 0 }

        // Remove temporary arrow
        if (tempObjectRef.current) {
          canvas.remove(tempObjectRef.current)
        }

        // Create temporary arrow
        const arrow = await createArrow(
          fabricRef.current,
          startPointRef.current.x,
          startPointRef.current.y,
          pointer.x,
          pointer.y,
          strokeColor,
          strokeWidth
        )
        arrow.selectable = false
        tempObjectRef.current = arrow
        canvas.add(arrow)
        canvas.renderAll()
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMouseUp = async (e: any) => {
        if (!isDrawingRef.current || !startPointRef.current || !fabricRef.current) return

        const pointer = e.scenePoint || e.pointer || { x: 0, y: 0 }

        // Remove temporary arrow
        if (tempObjectRef.current) {
          canvas.remove(tempObjectRef.current)
          tempObjectRef.current = null
        }

        // Only add arrow if there's actual movement
        const distance = Math.sqrt(
          Math.pow(pointer.x - startPointRef.current.x, 2) +
            Math.pow(pointer.y - startPointRef.current.y, 2)
        )

        if (distance > 10) {
          const arrow = await createArrow(
            fabricRef.current,
            startPointRef.current.x,
            startPointRef.current.y,
            pointer.x,
            pointer.y,
            strokeColor,
            strokeWidth
          )
          canvas.add(arrow)
          canvas.renderAll()
          saveState()
        }

        isDrawingRef.current = false
        startPointRef.current = null
      }

      canvas.on('mouse:down', handleMouseDown)
      canvas.on('mouse:move', handleMouseMove)
      canvas.on('mouse:up', handleMouseUp)

      return () => {
        canvas.off('mouse:down', handleMouseDown)
        canvas.off('mouse:move', handleMouseMove)
        canvas.off('mouse:up', handleMouseUp)
      }
    }, [toolMode, strokeColor, strokeWidth, saveState])

    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
    )
  }
)

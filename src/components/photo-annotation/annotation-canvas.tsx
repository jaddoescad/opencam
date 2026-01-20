'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
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
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricCanvasRef = useRef<FabricCanvas | null>(null)
    const fabricRef = useRef<typeof import('fabric') | null>(null)
    const isDrawingRef = useRef(false)
    const startPointRef = useRef<{ x: number; y: number } | null>(null)
    const tempObjectRef = useRef<FabricObject | null>(null)
    const scaleRef = useRef(1)

    const [isReady, setIsReady] = useState(false)
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      toJSON: () => {
        if (!fabricCanvasRef.current) return {}
        return serializeCanvas(fabricCanvasRef.current)
      },
      toDataURL: () => {
        if (!fabricCanvasRef.current) return ''
        // Export at the scale that includes the background
        return fabricCanvasRef.current.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        })
      },
      clear: () => {
        if (!fabricCanvasRef.current) return
        // Keep only the background image (first object)
        const objects = fabricCanvasRef.current.getObjects()
        objects.slice(1).forEach((obj) => {
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
            // Don't delete the background image
            if (obj !== fabricCanvasRef.current?.getObjects()[0]) {
              fabricCanvasRef.current?.remove(obj)
            }
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

    // Load image and calculate canvas size
    useEffect(() => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const maxWidth = window.innerWidth - 64
        const maxHeight = window.innerHeight - 250

        const imgAspect = img.width / img.height
        let width = Math.min(maxWidth, img.width)
        let height = width / imgAspect

        if (height > maxHeight) {
          height = maxHeight
          width = height * imgAspect
        }

        scaleRef.current = width / img.width
        setCanvasSize({ width, height })
      }

      img.onerror = () => {
        console.error('Failed to load image:', imageUrl)
      }

      img.src = imageUrl
    }, [imageUrl])

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasSize || !canvasRef.current) return

      let mounted = true

      const initCanvas = async () => {
        const fabric = await import('fabric')
        if (!mounted) return

        fabricRef.current = fabric

        // Dispose existing canvas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()
        }

        // Create canvas with calculated dimensions
        const canvas = new fabric.Canvas(canvasRef.current!, {
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: '#000',
          selection: true,
        })

        fabricCanvasRef.current = canvas

        // Load image and add as first object (acts as background)
        fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then(async (fabricImage) => {
          if (!mounted || !fabricImage) return

          // Scale image to fit canvas
          fabricImage.scale(scaleRef.current)
          fabricImage.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            excludeFromExport: false,
          })

          // Add image as first object
          canvas.add(fabricImage)
          canvas.sendObjectToBack(fabricImage)
          canvas.renderAll()

          // Load existing annotations on top
          if (existingAnnotation && Object.keys(existingAnnotation).length > 0) {
            try {
              await loadAnnotationsFromJson(canvas, existingAnnotation, fabric)
            } catch (err) {
              console.error('Failed to load annotations:', err)
            }
          }

          // Set up event listeners
          canvas.on('object:modified', saveState)
          canvas.on('object:added', saveState)
          canvas.on('object:removed', saveState)

          setIsReady(true)
        }).catch((err) => {
          console.error('Failed to load image into fabric:', err)
        })
      }

      initCanvas()

      return () => {
        mounted = false
      }
    }, [canvasSize, imageUrl, existingAnnotation, saveState])

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()
          fabricCanvasRef.current = null
        }
      }
    }, [])

    // Handle tool mode changes
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || !isReady) return

      if (toolMode === 'select') {
        canvas.isDrawingMode = false
        canvas.selection = true
        canvas.forEachObject((obj, index) => {
          // Skip the background image (first object)
          if (index > 0) {
            obj.selectable = true
            obj.evented = true
          }
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
    }, [toolMode, strokeColor, strokeWidth, isReady])

    // Update freehand brush
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || !canvas.freeDrawingBrush) return
      canvas.freeDrawingBrush.color = strokeColor
      canvas.freeDrawingBrush.width = strokeWidth
    }, [strokeColor, strokeWidth])

    // Handle arrow drawing
    useEffect(() => {
      const canvas = fabricCanvasRef.current
      if (!canvas || toolMode !== 'arrow' || !isReady) return

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

        if (tempObjectRef.current) {
          canvas.remove(tempObjectRef.current)
        }

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

        if (tempObjectRef.current) {
          canvas.remove(tempObjectRef.current)
          tempObjectRef.current = null
        }

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
    }, [toolMode, strokeColor, strokeWidth, saveState, isReady])

    return (
      <div className="w-full h-full flex items-center justify-center">
        {!canvasSize && (
          <div className="text-white">Loading image...</div>
        )}
        {canvasSize && !isReady && (
          <div className="text-white">Initializing editor...</div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: isReady ? 'block' : 'none' }}
        />
      </div>
    )
  }
)

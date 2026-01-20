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
    const containerRef = useRef<HTMLDivElement>(null)
    const isDrawingRef = useRef(false)
    const startPointRef = useRef<{ x: number; y: number } | null>(null)
    const tempObjectRef = useRef<FabricObject | null>(null)

    const [isReady, setIsReady] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

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

    // Preload image to get dimensions
    useEffect(() => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        setImageLoaded(true)
      }
      img.onerror = () => {
        console.error('Failed to load image:', imageUrl)
      }
      img.src = imageUrl
    }, [imageUrl])

    // Initialize Fabric.js canvas after image is loaded
    useEffect(() => {
      if (!imageLoaded || !imageDimensions || !canvasRef.current || !containerRef.current) return

      let mounted = true

      const initCanvas = async () => {
        const fabric = await import('fabric')
        if (!mounted) return

        fabricRef.current = fabric

        // Calculate canvas size to fit container
        const containerRect = containerRef.current!.getBoundingClientRect()
        const maxWidth = containerRect.width - 32 // padding
        const maxHeight = containerRect.height - 32

        const imgAspect = imageDimensions.width / imageDimensions.height
        let canvasWidth = maxWidth
        let canvasHeight = maxWidth / imgAspect

        if (canvasHeight > maxHeight) {
          canvasHeight = maxHeight
          canvasWidth = maxHeight * imgAspect
        }

        const scale = canvasWidth / imageDimensions.width

        // Dispose existing canvas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()
        }

        // Create canvas
        const canvas = new fabric.Canvas(canvasRef.current!, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#1f2937',
        })

        fabricCanvasRef.current = canvas

        // Load image as background
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = async () => {
          if (!mounted) return

          const fabricImage = new fabric.FabricImage(img, {
            selectable: false,
            evented: false,
          })
          fabricImage.scale(scale)
          canvas.backgroundImage = fabricImage
          canvas.renderAll()

          // Load existing annotations
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
        }
        img.src = imageUrl
      }

      initCanvas()

      return () => {
        mounted = false
      }
    }, [imageLoaded, imageDimensions, imageUrl, existingAnnotation, saveState])

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
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative"
      >
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            {imageLoaded ? (
              <span className="text-white">Initializing editor...</span>
            ) : (
              <img
                src={imageUrl}
                alt="Loading..."
                className="max-w-full max-h-full object-contain opacity-50"
              />
            )}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={isReady ? '' : 'invisible'}
        />
      </div>
    )
  }
)

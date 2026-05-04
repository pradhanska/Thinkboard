'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useCaseBoardStore } from '@/lib/caseboard-store'
import type { Theme, DrawingPoint, DrawingStroke } from '@/lib/caseboard-types'
import { v4 as uuidv4 } from 'uuid'

interface DrawingLayerProps {
  theme: Theme
  viewportZoom: number
  viewportX: number
  viewportY: number
}

export function DrawingLayer({ theme, viewportZoom, viewportX, viewportY }: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { board, drawingTool, drawingColor, addStroke } = useCaseBoardStore()
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([])

  // Get canvas context
  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  // Draw a single stroke
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawingStroke) => {
    if (stroke.points.length < 2) return

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (stroke.tool === 'chalk') {
      // Chalk effect - textured, slightly transparent
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.globalAlpha = 0.8
      ctx.shadowBlur = 2
      ctx.shadowColor = stroke.color
      
      // Draw main line
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        const p0 = stroke.points[i - 1]
        const p1 = stroke.points[i]
        const midX = (p0.x + p1.x) / 2
        const midY = (p0.y + p1.y) / 2
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
      }
      ctx.stroke()
      
      // Add chalk texture with smaller dots
      ctx.globalAlpha = 0.3
      for (let i = 0; i < stroke.points.length; i += 3) {
        const p = stroke.points[i]
        for (let j = 0; j < 3; j++) {
          const offsetX = (Math.random() - 0.5) * stroke.width
          const offsetY = (Math.random() - 0.5) * stroke.width
          ctx.fillStyle = stroke.color
          ctx.fillRect(p.x + offsetX, p.y + offsetY, 1, 1)
        }
      }
    } else {
      // Marker effect - smooth, slightly transparent
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.globalAlpha = 0.85
      
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        const p0 = stroke.points[i - 1]
        const p1 = stroke.points[i]
        const midX = (p0.x + p1.x) / 2
        const midY = (p0.y + p1.y) / 2
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
      }
      ctx.stroke()
    }
    
    ctx.restore()
  }, [])

  // Redraw all strokes
  const redrawCanvas = useCallback(() => {
    const ctx = getContext()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all saved strokes
    const strokes = board.strokes || []
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke)
    })

    // Draw current stroke being drawn
    if (currentPoints.length > 1 && drawingTool) {
      const tempStroke: DrawingStroke = {
        id: 'temp',
        points: currentPoints,
        color: drawingColor,
        width: drawingTool === 'chalk' ? 4 : 3,
        tool: drawingTool,
        createdAt: Date.now(),
      }
      drawStroke(ctx, tempStroke)
    }
  }, [board.strokes, currentPoints, drawingTool, drawingColor, getContext, drawStroke])

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width * 2 // Higher resolution
        canvas.height = rect.height * 2
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(2, 2) // Scale for high DPI
        }
        redrawCanvas()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redrawCanvas])

  // Redraw when strokes change
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const getCanvasPoint = useCallback((e: React.MouseEvent): DrawingPoint => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - viewportX) / viewportZoom,
      y: (e.clientY - rect.top - viewportY) / viewportZoom,
    }
  }, [viewportX, viewportY, viewportZoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!drawingTool) return
    if (e.button !== 0) return // Only left click
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDrawing(true)
    const point = getCanvasPoint(e)
    setCurrentPoints([point])
  }, [drawingTool, getCanvasPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawingTool) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const point = getCanvasPoint(e)
    setCurrentPoints((prev) => [...prev, point])
  }, [isDrawing, drawingTool, getCanvasPoint])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawingTool || currentPoints.length < 2) {
      setIsDrawing(false)
      setCurrentPoints([])
      return
    }

    const stroke: DrawingStroke = {
      id: uuidv4(),
      points: currentPoints,
      color: drawingColor,
      width: drawingTool === 'chalk' ? 4 : 3,
      tool: drawingTool,
      createdAt: Date.now(),
    }
    
    addStroke(stroke)
    setIsDrawing(false)
    setCurrentPoints([])
  }, [isDrawing, drawingTool, currentPoints, drawingColor, addStroke])

  // Don't render if drawing tool is not active
  if (!drawingTool) {
    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 100,
        cursor: drawingTool === 'chalk' ? 'crosshair' : 'crosshair',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

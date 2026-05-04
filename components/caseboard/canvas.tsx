'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useCaseBoardStore } from '@/lib/caseboard-store'
import { BoardNode } from './board-node'
import { Connections } from './connections'
import { DrawingLayer } from './drawing-layer'
import type { Theme, NodeType } from '@/lib/caseboard-types'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { FileText, Image, Video, Music, FileIcon } from 'lucide-react'

// Theme backgrounds with actual textures
const getThemeBackground = (theme: Theme): React.CSSProperties => {
  switch (theme) {
    case 'chalkboard':
      return {
        backgroundImage: 'url(/images/blackboard-texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    case 'whiteboard':
      return {
        backgroundImage: 'url(/images/whiteboard-texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    case 'detective':
      return {
        backgroundImage: 'url(/images/wood-texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
  }
}

const themePatterns: Record<Theme, React.ReactNode> = {
  chalkboard: (
    <div className="absolute inset-0 opacity-10 pointer-events-none">
      <div className="w-full h-full" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
    </div>
  ),
  whiteboard: (
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <div className="w-full h-full" style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }} />
    </div>
  ),
  detective: null, // Wood texture is enough
}

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { 
    board, 
    selectedNodeId, 
    selectNode, 
    addNode, 
    isConnecting, 
    cancelConnecting,
    setViewport,
    drawingTool,
  } = useCaseBoardStore()
  
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (drawingTool) return // Disable pan/zoom while drawing
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(Math.max(board.viewport.zoom * delta, 0.25), 4)
      setViewport({ zoom: newZoom })
    } else {
      // Pan
      setViewport({
        x: board.viewport.x - e.deltaX,
        y: board.viewport.y - e.deltaY,
      })
    }
  }, [board.viewport, setViewport, drawingTool])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (drawingTool) return // Don't pan while drawing
    
    // Only start panning on middle mouse or when clicking empty space
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current?.firstChild)) {
      if (isConnecting) {
        cancelConnecting()
        return
      }
      setIsPanning(true)
      setPanStart({ x: e.clientX - board.viewport.x, y: e.clientY - board.viewport.y })
      selectNode(null)
    }
  }, [board.viewport, selectNode, isConnecting, cancelConnecting, drawingTool])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setViewport({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }, [isPanning, panStart, setViewport])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (drawingTool) return // No context menu while drawing
    
    // Calculate position relative to canvas content
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = (e.clientX - rect.left - board.viewport.x) / board.viewport.zoom
      const y = (e.clientY - rect.top - board.viewport.y) / board.viewport.zoom
      setContextMenuPosition({ x, y })
    }
  }, [board.viewport, drawingTool])

  const handleAddNode = useCallback((type: NodeType) => {
    addNode(type, contextMenuPosition)
  }, [addNode, contextMenuPosition])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          useCaseBoardStore.getState().deleteNode(selectedNodeId)
        }
      }
      
      // Escape to deselect or cancel connecting/drawing
      if (e.key === 'Escape') {
        if (drawingTool) {
          useCaseBoardStore.getState().setDrawingTool(null)
        } else if (isConnecting) {
          cancelConnecting()
        } else {
          selectNode(null)
        }
      }
      
      // Reset viewport with 0
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setViewport({ x: 0, y: 0, zoom: 1 })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, isConnecting, cancelConnecting, selectNode, setViewport, drawingTool])

  // Handle file drops on canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    const file = e.dataTransfer.files[0]
    if (!file) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = (e.clientX - rect.left - board.viewport.x) / board.viewport.zoom
    const y = (e.clientY - rect.top - board.viewport.y) / board.viewport.zoom
    
    let nodeType: NodeType = 'document'
    if (file.type.startsWith('image/')) nodeType = 'image'
    else if (file.type.startsWith('video/')) nodeType = 'video'
    else if (file.type.startsWith('audio/')) nodeType = 'audio'
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      addNode(nodeType, { x, y }, content)
    }
    reader.readAsDataURL(file)
  }, [board.viewport, addNode])

  const backgroundStyle = getThemeBackground(board.theme)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={!!drawingTool}>
        <div
          ref={canvasRef}
          className={`relative w-full h-full overflow-hidden ${
            isPanning ? 'cursor-grabbing' : drawingTool ? 'cursor-crosshair' : 'cursor-grab'
          }`}
          style={backgroundStyle}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Background pattern overlay */}
          {themePatterns[board.theme]}
          
          {/* Connecting mode indicator */}
          {isConnecting && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg">
              Click another node to connect, or press Escape to cancel
            </div>
          )}

          {/* Drawing mode indicator */}
          {drawingTool && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
              drawingTool === 'chalk' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
            }`}>
              {drawingTool === 'chalk' ? 'Chalk Mode' : 'Marker Mode'} - Draw on the board, press Escape to exit
            </div>
          )}

          {/* Drawing layer */}
          <DrawingLayer
            theme={board.theme}
            viewportZoom={board.viewport.zoom}
            viewportX={board.viewport.x}
            viewportY={board.viewport.y}
          />

          {/* Canvas content with pan/zoom transform */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${board.viewport.x}px, ${board.viewport.y}px) scale(${board.viewport.zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Connections layer */}
            <Connections
              nodes={board.nodes}
              connections={board.connections}
              theme={board.theme}
            />

            {/* Nodes layer */}
            <AnimatePresence>
              {board.nodes.map((node) => (
                <BoardNode
                  key={node.id}
                  node={node}
                  theme={board.theme}
                  isSelected={selectedNodeId === node.id}
                  viewportZoom={board.viewport.zoom}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => handleAddNode('text')}>
          <FileText className="w-4 h-4 mr-2" />
          Add Text Note
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAddNode('image')}>
          <Image className="w-4 h-4 mr-2" />
          Add Image
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAddNode('video')}>
          <Video className="w-4 h-4 mr-2" />
          Add Video
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAddNode('audio')}>
          <Music className="w-4 h-4 mr-2" />
          Add Audio
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleAddNode('document')}>
          <FileIcon className="w-4 h-4 mr-2" />
          Add Document
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

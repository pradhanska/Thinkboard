'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCaseBoardStore } from '@/lib/caseboard-store'
import type { BoardNode as BoardNodeType, Theme } from '@/lib/caseboard-types'
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileIcon, 
  X, 
  Link2,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BoardNodeProps {
  node: BoardNodeType
  theme: Theme
  isSelected: boolean
  viewportZoom: number
}

const themeStyles: Record<Theme, {
  node: string
  selected: string
  text: string
  border: string
  header: string
}> = {
  chalkboard: {
    node: 'bg-slate-800/90 border-slate-500',
    selected: 'ring-2 ring-yellow-400',
    text: 'text-slate-100',
    border: 'border-2 border-dashed',
    header: 'border-slate-600 bg-slate-700/50',
  },
  whiteboard: {
    node: 'bg-white border-gray-300 shadow-md',
    selected: 'ring-2 ring-blue-500',
    text: 'text-gray-800',
    border: 'border',
    header: 'border-gray-200 bg-gray-50',
  },
  detective: {
    node: 'border-transparent shadow-xl',
    selected: 'ring-2 ring-red-600 ring-offset-2 ring-offset-amber-100',
    text: 'text-amber-900',
    border: 'border-0',
    header: 'border-amber-300 bg-amber-200/50',
  },
}

// Sticky note colors for detective theme
const stickyColors = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-orange-200',
]

const nodeTypeIcons: Record<BoardNodeType['type'], React.ElementType> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileIcon,
}

export function BoardNode({ node, theme, isSelected, viewportZoom }: BoardNodeProps) {
  const { updateNode, deleteNode, selectNode, bringToFront, startConnecting, isConnecting, addConnection, connectingFromId, drawingTool } = useCaseBoardStore()
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 })

  const styles = themeStyles[theme]
  const Icon = nodeTypeIcons[node.type]
  
  // Get a consistent sticky color based on node id
  const stickyColorIndex = node.id.charCodeAt(0) % stickyColors.length
  const stickyColor = stickyColors[stickyColorIndex]

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing || isResizing || drawingTool) return
    if ((e.target as HTMLElement).closest('.no-drag')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // If we're connecting and click on another node, create connection
    if (isConnecting && connectingFromId && connectingFromId !== node.id) {
      addConnection(connectingFromId, node.id)
      return
    }
    
    selectNode(node.id)
    bringToFront(node.id)
    setIsDragging(true)
    setDragStart({
      x: e.clientX / viewportZoom - node.position.x,
      y: e.clientY / viewportZoom - node.position.y,
    })
  }, [isEditing, isResizing, isConnecting, connectingFromId, node.id, node.position, selectNode, bringToFront, addConnection, viewportZoom, drawingTool])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX / viewportZoom - dragStart.x
      const newY = e.clientY / viewportZoom - dragStart.y
      updateNode(node.id, { position: { x: newX, y: newY } })
    } else if (isResizing) {
      const deltaX = (e.clientX - resizeStart.x) / viewportZoom
      const deltaY = (e.clientY - resizeStart.y) / viewportZoom
      const newWidth = Math.max(150, resizeStart.width + deltaX)
      const newHeight = Math.max(80, resizeStart.height + deltaY)
      updateNode(node.id, { size: { width: newWidth, height: newHeight } })
    }
  }, [isDragging, isResizing, dragStart, resizeStart, node.id, updateNode, viewportZoom])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // Attach global mouse events when dragging/resizing using useEffect
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      width: node.size.width,
      height: node.size.height,
      x: e.clientX,
      y: e.clientY,
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNode(node.id)
  }

  const handleStartConnection = (e: React.MouseEvent) => {
    e.stopPropagation()
    startConnecting(node.id)
  }

  const handleContentChange = (content: string) => {
    updateNode(node.id, { content })
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      updateNode(node.id, { content: result })
    }
    reader.readAsDataURL(file)
  }, [node.id, updateNode])

  const renderContent = () => {
    switch (node.type) {
      case 'text':
        return (
          <div className="h-full flex flex-col">
            {isEditing ? (
              <textarea
                className={cn(
                  'flex-1 w-full p-2 bg-transparent resize-none focus:outline-none no-drag',
                  styles.text,
                  theme === 'detective' && 'text-amber-900'
                )}
                value={node.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                autoFocus
              />
            ) : (
              <div
                className={cn(
                  'flex-1 p-2 cursor-text overflow-auto whitespace-pre-wrap',
                  styles.text,
                  theme === 'detective' && 'text-amber-900'
                )}
                onClick={() => setIsEditing(true)}
              >
                {node.content || 'Click to add text...'}
              </div>
            )}
          </div>
        )
      
      case 'image':
        return (
          <div
            className="h-full flex items-center justify-center p-2 overflow-hidden"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {node.content ? (
              <img
                src={node.content}
                alt="Board image"
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className={cn('text-center', styles.text)}>
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Drop an image here</p>
              </div>
            )}
          </div>
        )
      
      case 'video':
        return (
          <div
            className="h-full flex items-center justify-center p-2"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {node.content ? (
              <video
                src={node.content}
                controls
                className="max-w-full max-h-full no-drag"
              />
            ) : (
              <div className={cn('text-center', styles.text)}>
                <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Drop a video here</p>
              </div>
            )}
          </div>
        )
      
      case 'audio':
        return (
          <div
            className="h-full flex items-center justify-center p-2"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {node.content ? (
              <audio src={node.content} controls className="w-full no-drag" />
            ) : (
              <div className={cn('text-center', styles.text)}>
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Drop an audio file here</p>
              </div>
            )}
          </div>
        )
      
      case 'document':
        return (
          <div
            className="h-full flex flex-col p-2"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {node.content ? (
              <div className={cn('flex-1 overflow-auto', styles.text)}>
                <FileIcon className="w-6 h-6 mb-2" />
                <p className="text-sm">Document attached</p>
              </div>
            ) : (
              <div className={cn('flex-1 flex flex-col items-center justify-center', styles.text)}>
                <FileIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm opacity-70">Drop a document here</p>
              </div>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  // Detective theme with pushpin and sticky note effect
  if (theme === 'detective') {
    return (
      <motion.div
        ref={nodeRef}
        className={cn(
          'absolute rounded-sm overflow-visible cursor-move select-none pointer-events-auto',
          stickyColor,
          'shadow-lg',
          isSelected && styles.selected,
          isConnecting && connectingFromId !== node.id && 'ring-2 ring-green-400 cursor-crosshair'
        )}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: node.size.width,
          height: node.size.height,
          zIndex: node.zIndex,
          transform: `rotate(${(node.id.charCodeAt(1) % 7) - 3}deg)`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={handleMouseDown}
      >
        {/* Pushpin */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 z-20 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/pushpin.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))',
          }}
        />
        
        {/* Sticky note fold effect */}
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.1) 50%)`,
          }}
        />

        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-2 py-1 border-b',
          styles.header
        )}>
          <div className="flex items-center gap-1">
            <GripVertical className={cn('w-4 h-4 opacity-50', styles.text)} />
            <Icon className={cn('w-4 h-4', styles.text)} />
          </div>
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={handleStartConnection}
              className={cn(
                'p-1 rounded hover:bg-black/10 transition-colors',
                styles.text
              )}
              title="Connect to another node"
            >
              <Link2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                'p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors',
                styles.text
              )}
              title="Delete node"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" style={{ height: node.size.height - 32 }}>
          {renderContent()}
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize no-drag"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-amber-600" />
        </div>
      </motion.div>
    )
  }

  // Default rendering for chalkboard and whiteboard
  return (
    <motion.div
      ref={nodeRef}
      className={cn(
        'absolute rounded-lg overflow-hidden cursor-move select-none pointer-events-auto',
        styles.node,
        styles.border,
        isSelected && styles.selected,
        isConnecting && connectingFromId !== node.id && 'ring-2 ring-green-400 cursor-crosshair'
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: node.zIndex,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-2 py-1 border-b',
        styles.header
      )}>
        <div className="flex items-center gap-1">
          <GripVertical className={cn('w-4 h-4 opacity-50', styles.text)} />
          <Icon className={cn('w-4 h-4', styles.text)} />
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={handleStartConnection}
            className={cn(
              'p-1 rounded hover:bg-black/10 transition-colors',
              styles.text
            )}
            title="Connect to another node"
          >
            <Link2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              'p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors',
              styles.text
            )}
            title="Delete node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ height: node.size.height - 32 }}>
        {renderContent()}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize no-drag"
        onMouseDown={handleResizeStart}
      >
        <div className={cn(
          'absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2',
          theme === 'chalkboard' ? 'border-slate-400' : 'border-gray-400'
        )} />
      </div>
    </motion.div>
  )
}

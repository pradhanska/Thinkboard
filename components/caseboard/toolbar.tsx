'use client'

import { useState } from 'react'
import { useCaseBoardStore } from '@/lib/caseboard-store'
import { exportBoardToFile, importBoardFromFile } from '@/lib/caseboard-db'
import type { Theme, NodeType } from '@/lib/caseboard-types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Image,
  Video,
  Music,
  FileIcon,
  Plus,
  Save,
  FolderOpen,
  Trash2,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  PenLine,
  LayoutGrid,
  Search,
  Edit3,
  Pencil,
  Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const themeOptions: { value: Theme; label: string; icon: React.ReactNode; description: string; drawingTool: 'marker' | 'chalk' }[] = [
  { 
    value: 'detective', 
    label: 'Detective Board', 
    icon: <Search className="w-4 h-4" />,
    description: 'Cork board with pins and strings',
    drawingTool: 'marker',
  },
  { 
    value: 'chalkboard', 
    label: 'Chalkboard', 
    icon: <PenLine className="w-4 h-4" />,
    description: 'Dark chalk-style aesthetic',
    drawingTool: 'chalk',
  },
  { 
    value: 'whiteboard', 
    label: 'Whiteboard', 
    icon: <LayoutGrid className="w-4 h-4" />,
    description: 'Clean, minimal workspace',
    drawingTool: 'marker',
  },
]

const nodeTypes: { type: NodeType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text Note', icon: <FileText className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { type: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
  { type: 'document', label: 'Document', icon: <FileIcon className="w-4 h-4" /> },
]

const drawingColors = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#fbbf24' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Pink', value: '#ec4899' },
]

export function Toolbar() {
  const { 
    board, 
    setTheme, 
    setBoardName, 
    clearBoard, 
    loadBoard, 
    addNode, 
    setViewport,
    drawingTool,
    setDrawingTool,
    drawingColor,
    setDrawingColor,
    clearStrokes,
  } = useCaseBoardStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(board.name)

  const handleSave = async () => {
    await exportBoardToFile(board)
  }

  const handleLoad = async () => {
    const loadedBoard = await importBoardFromFile()
    if (loadedBoard) {
      loadBoard(loadedBoard)
    }
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the board? This cannot be undone.')) {
      clearBoard()
    }
  }

  const handleAddNode = (type: NodeType) => {
    // Add node at center of viewport
    const centerX = (window.innerWidth / 2 - board.viewport.x) / board.viewport.zoom
    const centerY = (window.innerHeight / 2 - board.viewport.y) / board.viewport.zoom
    addNode(type, { x: centerX - 100, y: centerY - 75 })
  }

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'reset') {
      setViewport({ x: 0, y: 0, zoom: 1 })
    } else {
      const delta = direction === 'in' ? 1.2 : 0.8
      const newZoom = Math.min(Math.max(board.viewport.zoom * delta, 0.25), 4)
      setViewport({ zoom: newZoom })
    }
  }

  const handleNameSubmit = () => {
    setBoardName(editedName)
    setIsEditingName(false)
  }

  const handleToggleDrawing = () => {
    if (drawingTool) {
      setDrawingTool(null)
    } else {
      // Set appropriate tool based on theme
      const themeTool = board.theme === 'chalkboard' ? 'chalk' : 'marker'
      setDrawingTool(themeTool)
      // Set default color based on theme
      if (board.theme === 'chalkboard') {
        setDrawingColor('#ffffff')
      } else {
        setDrawingColor('#2563eb')
      }
    }
  }

  const currentTheme = themeOptions.find(t => t.value === board.theme)
  const toolLabel = board.theme === 'chalkboard' ? 'Chalk' : 'Marker'
  const ToolIcon = board.theme === 'chalkboard' ? PenLine : Pencil

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b">
        {/* Left section - Board name and theme */}
        <div className="flex items-center gap-3">
          {/* Board name */}
          {isEditingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit()
                if (e.key === 'Escape') {
                  setEditedName(board.name)
                  setIsEditingName(false)
                }
              }}
              className="w-48 h-8 text-sm font-medium"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditedName(board.name)
                setIsEditingName(true)
              }}
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded hover:bg-accent transition-colors"
            >
              {board.name}
              <Edit3 className="w-3 h-3 opacity-50" />
            </button>
          )}

          {/* Theme selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Palette className="w-4 h-4" />
                {currentTheme?.label}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Board Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {themeOptions.map((theme) => (
                <DropdownMenuItem
                  key={theme.value}
                  onClick={() => setTheme(theme.value)}
                  className={cn(
                    'flex items-start gap-3 py-2',
                    board.theme === theme.value && 'bg-accent'
                  )}
                >
                  <div className="mt-0.5">{theme.icon}</div>
                  <div>
                    <div className="font-medium">{theme.label}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center section - Add nodes and Drawing tools */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Node
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {nodeTypes.map((nodeType) => (
                <DropdownMenuItem
                  key={nodeType.type}
                  onClick={() => handleAddNode(nodeType.type)}
                  className="gap-2"
                >
                  {nodeType.icon}
                  {nodeType.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Drawing tool toggle */}
          <div className="flex items-center gap-1 ml-2 border-l pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={drawingTool ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleDrawing}
                  className={cn(
                    'gap-2',
                    drawingTool && (board.theme === 'chalkboard' 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                      : 'bg-blue-500 hover:bg-blue-600')
                  )}
                >
                  <ToolIcon className="w-4 h-4" />
                  {toolLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {drawingTool ? 'Exit drawing mode (Esc)' : `Draw with ${toolLabel.toLowerCase()}`}
              </TooltipContent>
            </Tooltip>

            {/* Drawing color selector - only show when drawing */}
            {drawingTool && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 px-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: drawingColor }}
                    />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuLabel>Drawing Color</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {drawingColors.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={() => setDrawingColor(color.value)}
                      className="gap-2"
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Clear drawings button */}
            {(board.strokes?.length ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Clear all drawings? This cannot be undone.')) {
                        clearStrokes()
                      }
                    }}
                    className="gap-1 text-muted-foreground"
                  >
                    <Eraser className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all drawings</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('out')}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(board.viewport.zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('in')}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom('reset')}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View (Ctrl+0)</TooltipContent>
            </Tooltip>
          </div>

          {/* File actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export board to file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleLoad} className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Load
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import board from file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Board</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

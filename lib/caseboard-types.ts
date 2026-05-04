export type NodeType = 'text' | 'image' | 'video' | 'audio' | 'document'

export type Theme = 'chalkboard' | 'whiteboard' | 'detective'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface BoardNode {
  id: string
  type: NodeType
  position: Position
  size: Size
  content: string
  title?: string
  color?: string
  zIndex: number
  createdAt: number
  updatedAt: number
}

export interface Connection {
  id: string
  fromNodeId: string
  toNodeId: string
  color?: string
  style?: 'solid' | 'dashed' | 'dotted'
  label?: string
}

export interface DrawingPoint {
  x: number
  y: number
  pressure?: number
}

export interface DrawingStroke {
  id: string
  points: DrawingPoint[]
  color: string
  width: number
  tool: 'marker' | 'chalk'
  createdAt: number
}

export interface BoardState {
  id: string
  name: string
  nodes: BoardNode[]
  connections: Connection[]
  strokes: DrawingStroke[]
  theme: Theme
  viewport: {
    x: number
    y: number
    zoom: number
  }
  createdAt: number
  updatedAt: number
}

export interface CaseBoardStore {
  // State
  board: BoardState
  selectedNodeId: string | null
  isDragging: boolean
  isConnecting: boolean
  connectingFromId: string | null
  isDrawing: boolean
  drawingTool: 'marker' | 'chalk' | null
  drawingColor: string
  
  // Node actions
  addNode: (type: NodeType, position: Position, content?: string) => void
  updateNode: (id: string, updates: Partial<BoardNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void
  bringToFront: (id: string) => void
  
  // Connection actions
  addConnection: (fromId: string, toId: string) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  deleteConnection: (id: string) => void
  startConnecting: (fromId: string) => void
  cancelConnecting: () => void
  
  // Viewport actions
  setViewport: (viewport: Partial<BoardState['viewport']>) => void
  
  // Theme actions
  setTheme: (theme: Theme) => void
  
  // Board actions
  setBoardName: (name: string) => void
  clearBoard: () => void
  loadBoard: (board: BoardState) => void
  
  // Drag state
  setIsDragging: (isDragging: boolean) => void
  
  // Drawing actions
  setDrawingTool: (tool: 'marker' | 'chalk' | null) => void
  setDrawingColor: (color: string) => void
  addStroke: (stroke: DrawingStroke) => void
  clearStrokes: () => void
  
  // Storage actions
  loadFromDB: () => Promise<void>
  exportToFile: () => Promise<ExportedBoard>
  importFromFile: (data: { board?: BoardState; nodes?: BoardNode[]; connections?: Connection[] }) => void
}

export interface ExportedBoard {
  version: string
  exportedAt: number
  board: BoardState
}

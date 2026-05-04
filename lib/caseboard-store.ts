'use client'

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { BoardState, BoardNode, CaseBoardStore, NodeType, Position, Theme, Connection, DrawingStroke } from './caseboard-types'
import { saveBoard, loadBoard } from './caseboard-db'

const DEFAULT_NODE_SIZES: Record<NodeType, { width: number; height: number }> = {
  text: { width: 200, height: 150 },
  image: { width: 300, height: 200 },
  video: { width: 400, height: 300 },
  audio: { width: 300, height: 80 },
  document: { width: 200, height: 250 },
}

function createDefaultBoard(): BoardState {
  return {
    id: uuidv4(),
    name: 'Untitled Board',
    nodes: [],
    connections: [],
    strokes: [],
    theme: 'detective',
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export const useCaseBoardStore = create<CaseBoardStore>((set, get) => ({
  board: createDefaultBoard(),
  selectedNodeId: null,
  isDragging: false,
  isConnecting: false,
  connectingFromId: null,
  isDrawing: false,
  drawingTool: null,
  drawingColor: '#ffffff',

  addNode: (type: NodeType, position: Position, content?: string) => {
    const node: BoardNode = {
      id: uuidv4(),
      type,
      position,
      size: DEFAULT_NODE_SIZES[type],
      content: content || '',
      zIndex: get().board.nodes.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    set((state) => {
      const newBoard = {
        ...state.board,
        nodes: [...state.board.nodes, node],
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard, selectedNodeId: node.id }
    })
  },

  updateNode: (id: string, updates: Partial<BoardNode>) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        nodes: state.board.nodes.map((node) =>
          node.id === id ? { ...node, ...updates, updatedAt: Date.now() } : node
        ),
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  deleteNode: (id: string) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        nodes: state.board.nodes.filter((node) => node.id !== id),
        connections: state.board.connections.filter(
          (conn) => conn.fromNodeId !== id && conn.toNodeId !== id
        ),
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { 
        board: newBoard, 
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId 
      }
    })
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id })
  },

  bringToFront: (id: string) => {
    set((state) => {
      const maxZ = Math.max(...state.board.nodes.map((n) => n.zIndex), 0)
      const newBoard = {
        ...state.board,
        nodes: state.board.nodes.map((node) =>
          node.id === id ? { ...node, zIndex: maxZ + 1 } : node
        ),
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  addConnection: (fromId: string, toId: string) => {
    // Don't allow self-connections or duplicate connections
    if (fromId === toId) return
    
    const existingConnection = get().board.connections.find(
      (c) => (c.fromNodeId === fromId && c.toNodeId === toId) ||
             (c.fromNodeId === toId && c.toNodeId === fromId)
    )
    if (existingConnection) return
    
    const connection: Connection = {
      id: uuidv4(),
      fromNodeId: fromId,
      toNodeId: toId,
      style: 'solid',
    }
    
    set((state) => {
      const newBoard = {
        ...state.board,
        connections: [...state.board.connections, connection],
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard, isConnecting: false, connectingFromId: null }
    })
  },

  updateConnection: (id: string, updates: Partial<Connection>) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        connections: state.board.connections.map((conn) =>
          conn.id === id ? { ...conn, ...updates } : conn
        ),
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  deleteConnection: (id: string) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        connections: state.board.connections.filter((conn) => conn.id !== id),
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  startConnecting: (fromId: string) => {
    set({ isConnecting: true, connectingFromId: fromId })
  },

  cancelConnecting: () => {
    set({ isConnecting: false, connectingFromId: null })
  },

  setViewport: (viewport) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        viewport: { ...state.board.viewport, ...viewport },
        updatedAt: Date.now(),
      }
      // Don't save viewport changes to avoid too many writes
      return { board: newBoard }
    })
  },

  setTheme: (theme: Theme) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        theme,
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  setBoardName: (name: string) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        name,
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  clearBoard: () => {
    const newBoard = createDefaultBoard()
    newBoard.theme = get().board.theme // Preserve theme
    saveBoard(newBoard)
    set({ board: newBoard, selectedNodeId: null })
  },

  loadBoard: (board: BoardState) => {
    saveBoard(board)
    set({ board, selectedNodeId: null })
  },

  setIsDragging: (isDragging: boolean) => {
    set({ isDragging })
  },

  setDrawingTool: (tool: 'marker' | 'chalk' | null) => {
    set({ drawingTool: tool, isDrawing: tool !== null })
  },

  setDrawingColor: (color: string) => {
    set({ drawingColor: color })
  },

  addStroke: (stroke: DrawingStroke) => {
    set((state) => {
      const newBoard = {
        ...state.board,
        strokes: [...(state.board.strokes || []), stroke],
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  clearStrokes: () => {
    set((state) => {
      const newBoard = {
        ...state.board,
        strokes: [],
        updatedAt: Date.now(),
      }
      saveBoard(newBoard)
      return { board: newBoard }
    })
  },

  loadFromDB: async () => {
    try {
      const savedBoard = await loadBoard()
      if (savedBoard) {
        set({ board: savedBoard, selectedNodeId: null })
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error)
    }
  },

  exportToFile: async () => {
    const state = get()
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      board: state.board,
    }
  },

  importFromFile: (data: { board?: BoardState; nodes?: BoardNode[]; connections?: Connection[] }) => {
    let boardToLoad: BoardState | null = null
    
    if (data.board && data.board.nodes && data.board.connections) {
      boardToLoad = data.board
    } else if (data.nodes && data.connections) {
      // Legacy format support
      boardToLoad = {
        ...createDefaultBoard(),
        nodes: data.nodes,
        connections: data.connections,
      }
    }
    
    if (boardToLoad) {
      saveBoard(boardToLoad)
      set({ board: boardToLoad, selectedNodeId: null })
    }
  },
}))

// Initialize store from IndexedDB
export async function initializeStore() {
  const savedBoard = await loadBoard()
  if (savedBoard) {
    useCaseBoardStore.getState().loadBoard(savedBoard)
  }
}

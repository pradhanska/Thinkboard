import { openDB, type IDBPDatabase } from 'idb'
import type { BoardState } from './caseboard-types'

const DB_NAME = 'caseboard-db'
const DB_VERSION = 1
const STORE_NAME = 'boards'
const CURRENT_BOARD_KEY = 'current-board'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

export async function saveBoard(board: BoardState): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, board, CURRENT_BOARD_KEY)
}

export async function loadBoard(): Promise<BoardState | null> {
  const db = await getDB()
  const board = await db.get(STORE_NAME, CURRENT_BOARD_KEY)
  return board || null
}

export async function clearBoard(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, CURRENT_BOARD_KEY)
}

export async function exportBoardToFile(board: BoardState): Promise<void> {
  const exportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    board,
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${board.name || 'caseboard'}-${Date.now()}.caseboard`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importBoardFromFile(): Promise<BoardState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.caseboard,.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // Validate the imported data
        if (data.board && data.board.nodes && data.board.connections) {
          resolve(data.board as BoardState)
        } else if (data.nodes && data.connections) {
          // Direct board format (legacy support)
          resolve(data as BoardState)
        } else {
          console.error('Invalid board file format')
          resolve(null)
        }
      } catch (error) {
        console.error('Failed to parse board file:', error)
        resolve(null)
      }
    }
    
    input.oncancel = () => resolve(null)
    input.click()
  })
}

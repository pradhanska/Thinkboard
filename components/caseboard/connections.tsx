'use client'

import { useMemo } from 'react'
import type { BoardNode, Connection, Theme } from '@/lib/caseboard-types'
import { useCaseBoardStore } from '@/lib/caseboard-store'

interface ConnectionsProps {
  nodes: BoardNode[]
  connections: Connection[]
  theme: Theme
}

const themeColors: Record<Theme, { stroke: string; fill: string }> = {
  chalkboard: { stroke: '#fbbf24', fill: '#fbbf24' }, // yellow chalk
  whiteboard: { stroke: '#2563eb', fill: '#2563eb' }, // blue marker
  detective: { stroke: '#dc2626', fill: '#dc2626' }, // red string
}

export function Connections({ nodes, connections, theme }: ConnectionsProps) {
  const { deleteConnection } = useCaseBoardStore()
  const colors = themeColors[theme]

  const nodePositions = useMemo(() => {
    const map = new Map<string, { cx: number; cy: number }>()
    nodes.forEach((node) => {
      map.set(node.id, {
        cx: node.position.x + node.size.width / 2,
        cy: node.position.y + node.size.height / 2,
      })
    })
    return map
  }, [nodes])

  const lines = useMemo(() => {
    return connections.map((conn) => {
      const from = nodePositions.get(conn.fromNodeId)
      const to = nodePositions.get(conn.toNodeId)
      if (!from || !to) return null

      // Calculate control points for a slight curve
      const midX = (from.cx + to.cx) / 2
      const midY = (from.cy + to.cy) / 2
      const dx = to.cx - from.cx
      const dy = to.cy - from.cy
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Add a slight perpendicular offset for the curve
      const offset = Math.min(distance * 0.1, 30)
      const perpX = -dy / distance * offset
      const perpY = dx / distance * offset

      const strokeDasharray = 
        conn.style === 'dashed' ? '10,5' :
        conn.style === 'dotted' ? '3,3' :
        undefined

      return {
        id: conn.id,
        path: `M ${from.cx} ${from.cy} Q ${midX + perpX} ${midY + perpY} ${to.cx} ${to.cy}`,
        straightPath: `M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}`,
        fromX: from.cx,
        fromY: from.cy,
        toX: to.cx,
        toY: to.cy,
        strokeDasharray,
        color: conn.color || colors.stroke,
        label: conn.label,
        labelX: midX + perpX,
        labelY: midY + perpY,
        distance,
      }
    }).filter(Boolean)
  }, [connections, nodePositions, colors])

  if (lines.length === 0) return null

  // Render chalk-style connection for chalkboard theme
  const renderChalkLine = (line: NonNullable<typeof lines[0]>) => {
    // Generate chalk texture points along the line
    const segments: JSX.Element[] = []
    const numSegments = Math.max(Math.floor(line.distance / 3), 10)
    
    for (let i = 0; i < numSegments; i++) {
      const t = i / numSegments
      const x = line.fromX + (line.toX - line.fromX) * t + (Math.random() - 0.5) * 2
      const y = line.fromY + (line.toY - line.fromY) * t + (Math.random() - 0.5) * 2
      const size = 2 + Math.random() * 2
      segments.push(
        <circle
          key={`chalk-${i}`}
          cx={x}
          cy={y}
          r={size}
          fill={line.color}
          opacity={0.6 + Math.random() * 0.4}
        />
      )
    }
    
    return (
      <g key={line.id}>
        {/* Main chalk line */}
        <path
          d={line.straightPath}
          stroke={line.color}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
          className="pointer-events-auto cursor-pointer hover:opacity-100 transition-opacity"
          onClick={() => deleteConnection(line.id)}
        />
        {/* Chalk dust particles */}
        <g opacity={0.5}>{segments}</g>
        {/* Label */}
        {line.label && (
          <text
            x={line.labelX}
            y={line.labelY - 10}
            textAnchor="middle"
            className="text-xs font-handwriting"
            fill={line.color}
          >
            {line.label}
          </text>
        )}
      </g>
    )
  }

  // Render marker-style connection for whiteboard theme
  const renderMarkerLine = (line: NonNullable<typeof lines[0]>) => (
    <g key={line.id}>
      {/* Marker line with hand-drawn effect */}
      <path
        d={line.straightPath}
        stroke={line.color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.85}
        className="pointer-events-auto cursor-pointer hover:stroke-red-500 transition-colors"
        onClick={() => deleteConnection(line.id)}
      />
      {/* Slight offset for hand-drawn feel */}
      <path
        d={line.straightPath}
        stroke={line.color}
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
        opacity={0.3}
        transform="translate(1, 1)"
        className="pointer-events-none"
      />
      {/* Endpoint circles */}
      <circle
        cx={line.fromX}
        cy={line.fromY}
        r={5}
        fill={line.color}
        opacity={0.85}
      />
      <circle
        cx={line.toX}
        cy={line.toY}
        r={5}
        fill={line.color}
        opacity={0.85}
      />
      {/* Label */}
      {line.label && (
        <text
          x={line.labelX}
          y={line.labelY - 10}
          textAnchor="middle"
          className="text-xs"
          fill={line.color}
        >
          {line.label}
        </text>
      )}
    </g>
  )

  // Helper function to generate wavy path for string effect
  const generateWavyPath = (line: NonNullable<typeof lines[0]>): string => {
    const segments = Math.ceil(line.distance / 20)
    let path = `M ${line.fromX} ${line.fromY}`
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      const x = line.fromX + (line.toX - line.fromX) * t
      const y = line.fromY + (line.toY - line.fromY) * t
      // Add slight wave perpendicular to the line
      const waveAmp = 3 * Math.sin(i * Math.PI)
      const perpX = -(line.toY - line.fromY) / line.distance
      const perpY = (line.toX - line.fromX) / line.distance
      path += ` L ${x + perpX * waveAmp} ${y + perpY * waveAmp}`
    }
    
    return path
  }

  // Render string-style connection for detective theme
  const renderStringLine = (line: NonNullable<typeof lines[0]>) => {
    const wavyPath = generateWavyPath(line)

    return (
      <g key={line.id}>
        {/* String shadow */}
        <path
          d={wavyPath}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          transform="translate(2, 2)"
        />
        {/* Main string */}
        <path
          d={wavyPath}
          stroke={line.color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          className="pointer-events-auto cursor-pointer hover:stroke-yellow-500 transition-colors"
          onClick={() => deleteConnection(line.id)}
        />
        {/* String texture highlight */}
        <path
          d={wavyPath}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
          transform="translate(-0.5, -0.5)"
          className="pointer-events-none"
        />
        {/* Label */}
        {line.label && (
          <text
            x={line.labelX}
            y={line.labelY - 10}
            textAnchor="middle"
            className="text-xs"
            fill={line.color}
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            {line.label}
          </text>
        )}
      </g>
    )
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {lines.map((line) => {
        if (!line) return null
        
        switch (theme) {
          case 'chalkboard':
            return renderChalkLine(line)
          case 'whiteboard':
            return renderMarkerLine(line)
          case 'detective':
            return renderStringLine(line)
          default:
            return renderMarkerLine(line)
        }
      })}
    </svg>
  )
}

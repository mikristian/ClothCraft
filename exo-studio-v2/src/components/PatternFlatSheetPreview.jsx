import React, { useMemo } from 'react'
import { createTemplateProject } from '../data/templates.js'
import { samplePieceBoundary } from '../core/project.js'
import './PatternFlatSheetPreview.css'

// These are the actual editable 2D template boundaries, including sampled curves.
// No 3D mesh, sewn garment, or invented cut outline is involved in this preview.
const cache = new Map()
function templateOutlines(templateId) {
  if (cache.has(templateId)) return cache.get(templateId)
  const project = createTemplateProject(templateId)
  const pieces = (project.pieces || []).filter(piece => !piece.fusedToPieceId).map(piece => {
    const points = samplePieceBoundary(piece, 16).points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    if (points.length < 3) return null
    const xs = points.map(point => point.x)
    const ys = points.map(point => point.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    return {
      id: piece.id,
      name: piece.name || 'Pattern piece',
      points,
      minX, minY, maxY,
      width: Math.max(0.1, maxX - minX),
      height: Math.max(0.1, maxY - minY),
    }
  }).filter(Boolean)
  cache.set(templateId, pieces)
  return pieces
}

// Pack flat outlines like pieces placed on drafting paper, preserving one shared
// physical scale. Each piece retains its true proportions relative to the rest.
function layoutSheet(pieces) {
  if (!pieces.length) return { pieces: [], scale: 1 }
  const gap = 9, labelSpace = 9
  const widest = Math.max(...pieces.map(piece => piece.width)) + gap
  const total = pieces.reduce((sum, piece) => sum + piece.width + gap, 0)
  let best = null
  for (let i = 0; i < 64; i += 1) {
    const rowLimit = widest + (total - widest) * i / 63
    let x = 0, y = 0, rowHeight = 0, usedWidth = 0
    const laidOut = pieces.map(piece => {
      if (x > 0 && x + piece.width + gap > rowLimit) {
        y += rowHeight
        x = 0
        rowHeight = 0
      }
      const placed = { ...piece, sheetX: x, sheetY: y + labelSpace }
      x += piece.width + gap
      usedWidth = Math.max(usedWidth, x)
      rowHeight = Math.max(rowHeight, piece.height + labelSpace + gap)
      return placed
    })
    const usedHeight = y + rowHeight
    const scale = Math.min(670 / usedWidth, 335 / usedHeight)
    if (!best || scale > best.scale) best = { pieces: laidOut, scale, usedWidth, usedHeight }
  }
  return best
}

const DRAW_LEFT = 25, DRAW_TOP = 62
const coordinate = value => Number(value.toFixed(2))

export default function PatternFlatSheetPreview({ templateId, name = 'Pattern' }) {
  const outlines = useMemo(() => templateOutlines(templateId), [templateId])
  const sheet = useMemo(() => layoutSheet(outlines), [outlines])
  const toX = (piece, x) => coordinate(DRAW_LEFT + (piece.sheetX + x - piece.minX) * sheet.scale)
  const toY = (piece, y) => coordinate(DRAW_TOP + (piece.sheetY + piece.maxY - y) * sheet.scale)

  return <svg className="exo-pattern-flat-sheet" data-pattern-flat-preview="true" viewBox="0 0 720 440"
    role="img" aria-label={`${name}: ${outlines.length} separate editable 2D pattern piece outlines, shown flat`}>
    <rect width="720" height="440" fill="#fafaf8" />
    <text className="exo-pattern-flat-title" x="26" y="28">2D PATTERN / FLAT OUTLINES</text>
    <text className="exo-pattern-flat-count" x="694" y="28" textAnchor="end">{outlines.length} PIECE{outlines.length === 1 ? '' : 'S'}</text>
    <path d="M26 38H694" stroke="#d7d9d6" strokeWidth="1" />
    {sheet.pieces.map((piece, index) => {
      const path = piece.points.map((point, i) => `${i ? 'L' : 'M'}${toX(piece, point.x)} ${toY(piece, point.y)}`).join(' ') + ' Z'
      const renderedWidth = piece.width * sheet.scale
      // Only print a label when it fits the physical width of its piece. Complex
      // production patterns often have tiny facings and long piece names.
      const maxChars = Math.max(0, Math.floor(renderedWidth / 5.5))
      const showName = outlines.length <= 12 && maxChars >= 7
      const shortName = piece.name.length > maxChars
        ? `${piece.name.slice(0, Math.max(1, maxChars - 1))}…`
        : piece.name
      return <g key={piece.id} data-pattern-piece={piece.id}>
        <title>{piece.name}</title>
        {showName && <text className="exo-pattern-flat-piece-name" x={toX(piece, piece.minX)} y={coordinate(DRAW_TOP + piece.sheetY * sheet.scale - 5)}>{shortName}</text>}
        <path className="exo-pattern-flat-outline" d={path} />
        {!showName && renderedWidth >= 12 && <text className="exo-pattern-flat-piece-number"
          x={toX(piece, (piece.minX + piece.minX + piece.width) / 2)}
          y={toY(piece, (piece.minY + piece.maxY) / 2)} textAnchor="middle">{index + 1}</text>}
      </g>
    })}
    {outlines.length === 0 && <text x="360" y="220" textAnchor="middle" className="exo-pattern-flat-empty">No 2D outlines available</text>}
    <path d="M26 412H694" stroke="#e1e1dd" strokeWidth="1" />
    <text x="26" y="428" className="exo-pattern-flat-footer">CUT PIECE OUTLINES · UNSEWN PATTERN</text>
    <text x="694" y="428" textAnchor="end" className="exo-pattern-flat-footer">NOT ASSEMBLED · EDITABLE IN 2D</text>
  </svg>
}

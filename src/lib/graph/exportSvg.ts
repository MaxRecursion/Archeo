import type { PositionedEdge, PositionedNode } from './transform'
import { graphPalettes, type GraphTheme } from './palette'

export function renderGraphSvg(nodes: PositionedNode[], edges: PositionedEdge[], theme: GraphTheme = 'light'): string {
  const palette = graphPalettes[theme]
  const maxX = Math.max(1_200, ...nodes.map((node) => node.x + 270))
  const maxY = Math.max(600, ...nodes.map((node) => node.y + 98))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const lines = edges.flatMap((edge, index) => {
    const from = byId.get(edge.source)
    const to = byId.get(edge.target)
    if (!from || !to) return []
    const startX = from.x + 240
    const startY = from.y + 44
    const endX = to.x
    const endY = to.y + 44
    const midX = Math.round((startX + endX) / 2)
    const label = escapeXml(edge.label)
    return [`<path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" fill="none" stroke="${edge.status === 'unresolved' ? palette.unresolved : palette.edge}" stroke-width="1.5" marker-end="url(#arrow)"/>`, `<text x="${midX}" y="${Math.min(startY, endY) - 8 - (index % 2) * 12}" fill="${palette.muted}" font-size="11" text-anchor="middle">${label}</text>`]
  }).join('\n')
  const boxes = nodes.map((node) => {
    const tone = palette.nodes[node.kind] ?? palette.nodes.unresolved
    const path = node.path ? `<text x="${node.x + 14}" y="${node.y + 68}" fill="${palette.muted}" font-size="10">${escapeXml(node.path)}</text>` : ''
    return `<g><rect x="${node.x}" y="${node.y}" width="240" height="88" rx="8" fill="${tone.fill}" stroke="${tone.border}" stroke-width="1.5"/><text x="${node.x + 14}" y="${node.y + 24}" fill="${tone.text}" font-size="10" font-weight="700">${escapeXml(node.kind.toUpperCase())}</text><text x="${node.x + 14}" y="${node.y + 46}" fill="${palette.ink}" font-size="13">${escapeXml(node.label)}</text>${path}</g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${palette.edge}"/></marker></defs><rect width="100%" height="100%" fill="${palette.canvas}"/>${lines}${boxes}</svg>`
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

import type { PositionedEdge, PositionedNode } from './transform'

export function renderGraphSvg(nodes: PositionedNode[], edges: PositionedEdge[]): string {
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
    return [`<path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" fill="none" stroke="${edge.status === 'unresolved' ? '#a65b25' : '#8d8a82'}" stroke-width="1.5" marker-end="url(#arrow)"/>`, `<text x="${midX}" y="${Math.min(startY, endY) - 8 - (index % 2) * 12}" fill="#555a6a" font-size="11" text-anchor="middle">${label}</text>`]
  }).join('\n')
  const boxes = nodes.map((node) => {
    const color = node.kind === 'project' ? '#0000ee' : node.kind === 'module' ? '#6450a2' : node.kind === 'file' ? '#17623f' : node.kind === 'package' ? '#846100' : '#a65b25'
    const fill = node.kind === 'project' ? '#eeeeff' : node.kind === 'module' ? '#f0eafa' : node.kind === 'file' ? '#e6f3eb' : node.kind === 'package' ? '#fff6cc' : '#fff0e5'
    const path = node.path ? `<text x="${node.x + 14}" y="${node.y + 68}" fill="#555a6a" font-size="10">${escapeXml(node.path)}</text>` : ''
    return `<g><rect x="${node.x}" y="${node.y}" width="240" height="88" rx="8" fill="${fill}" stroke="${color}" stroke-width="1.5"/><text x="${node.x + 14}" y="${node.y + 24}" fill="${color}" font-size="10" font-weight="700">${escapeXml(node.kind.toUpperCase())}</text><text x="${node.x + 14}" y="${node.y + 46}" fill="#1c1c1e" font-size="13">${escapeXml(node.label)}</text>${path}</g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8d8a82"/></marker></defs><rect width="100%" height="100%" fill="#fbfaf7"/>${lines}${boxes}</svg>`
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

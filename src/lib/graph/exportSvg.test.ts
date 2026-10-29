import { renderGraphSvg } from './exportSvg'
import type { PositionedEdge, PositionedNode } from './transform'

describe('renderGraphSvg', () => {
  it('exports graph nodes, relationship labels, and escaped source names', () => {
    const nodes: PositionedNode[] = [
      { id: 'project', label: 'demo & app', kind: 'project', x: 10, y: 20 },
      { id: 'file', label: 'index.ts', kind: 'file', path: 'src/index.ts', x: 340, y: 20 },
    ]
    const edges: PositionedEdge[] = [{ source: 'project', target: 'file', label: 'Contains' }]
    const svg = renderGraphSvg(nodes, edges)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('demo &amp; app')
    expect(svg).toContain('src/index.ts')
    expect(svg).toContain('>Contains</text>')
    expect(svg).toContain('<path d=')
  })

  it('keeps dark exports readable and treats source labels as text', () => {
    const sourceLabel = '<script>alert("source")</script>'
    const relationLabel = '<svg onload="alert(1)">'
    const kinds = ['project', 'module', 'file', 'package', 'unresolved']
    const nodes = kinds.map((kind, index) => ({ id: kind, kind, label: sourceLabel, path: 'src/a&b.ts', x: index * 330, y: 20 }))
    const edges: PositionedEdge[] = [{ source: 'project', target: 'file', label: relationLabel }]
    const darkSvg = renderGraphSvg(nodes, edges, 'dark')
    const document = new DOMParser().parseFromString(darkSvg, 'image/svg+xml')
    const canvas = document.querySelector('svg > rect')!.getAttribute('fill')!

    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
    expect(luminance(canvas)).toBeLessThan(.1)
    expect(document.querySelectorAll('g')).toHaveLength(kinds.length)
    for (const group of document.querySelectorAll('g')) {
      const fill = group.querySelector('rect')!.getAttribute('fill')!
      const labels = [...group.querySelectorAll('text')]
      expect(labels.map((label) => label.textContent)).toContain(sourceLabel)
      expect(labels.map((label) => label.textContent)).toContain('src/a&b.ts')
      for (const label of labels) expect(contrast(fill, label.getAttribute('fill')!)).toBeGreaterThanOrEqual(4.5)
    }
    const relation = [...document.querySelectorAll('text')].find((label) => label.textContent === relationLabel)!
    expect(contrast(canvas, relation.getAttribute('fill')!)).toBeGreaterThanOrEqual(4.5)
    expect(renderGraphSvg(nodes, edges)).toBe(renderGraphSvg(nodes, edges, 'light'))
    expect(darkSvg).not.toBe(renderGraphSvg(nodes, edges, 'light'))
  })
})

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

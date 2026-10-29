export type GraphTheme = 'light' | 'dark'

interface NodePalette { border: string; fill: string; text: string }
interface GraphPalette {
  canvas: string
  ink: string
  muted: string
  edge: string
  unresolved: string
  dots: string
  minimapMask: string
  minimapNodes: Record<string, string>
  nodes: Record<string, NodePalette>
}

export const graphPalettes: Record<GraphTheme, GraphPalette> = {
  light: {
    canvas: '#fbfaf7', ink: '#1c1c1e', muted: '#555a6a', edge: '#8d8a82', unresolved: '#a65b25', dots: '#d4d1c7',
    minimapMask: 'rgba(251, 250, 247, 0.75)',
    minimapNodes: { project: '#7777ee', module: '#bca6df', file: '#8bbca0', package: '#e6c84e', unresolved: '#a65b25' },
    nodes: {
      project: { border: '#0000ee', fill: '#eeeeff', text: '#0000ee' },
      module: { border: '#6450a2', fill: '#f0eafa', text: '#6450a2' },
      file: { border: '#17623f', fill: '#e6f3eb', text: '#17623f' },
      package: { border: '#846100', fill: '#fff6cc', text: '#846100' },
      unresolved: { border: '#a65b25', fill: '#fff0e5', text: '#a65b25' },
    },
  },
  dark: {
    canvas: '#15151a', ink: '#f4f4f7', muted: '#b5b5c5', edge: '#858592', unresolved: '#f0b27a', dots: '#41414d',
    minimapMask: 'rgba(21, 21, 26, 0.75)',
    minimapNodes: { project: '#b9b9ff', module: '#d4b8f4', file: '#9bdbb0', package: '#eed17b', unresolved: '#f0b27a' },
    nodes: {
      project: { border: '#6969a8', fill: '#292947', text: '#b9b9ff' },
      module: { border: '#715b8d', fill: '#30283d', text: '#d4b8f4' },
      file: { border: '#45765b', fill: '#1d352c', text: '#9bdbb0' },
      package: { border: '#806e35', fill: '#3b331d', text: '#eed17b' },
      unresolved: { border: '#956543', fill: '#3c2b23', text: '#f0b27a' },
    },
  },
}

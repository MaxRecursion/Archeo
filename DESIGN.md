# Archeo design language

Adapted from the [Miro DESIGN.md reference](https://designmd.me/s/miro-sov3x) supplied for this redesign. The source was read on October 28, 2026.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#FBFAF7` | Page and graph backgrounds |
| Surface | `#FFFFFF` | Forms, toolbars, explorer and inspector |
| Ink | `#1C1C1E` | Headings and body text |
| Primary | `#0000EE` | Main actions, links, selection and focus |
| Accent | `#FDE050` | Brand mark, headline highlight and sticky note |
| Muted | `#555A6A` | Secondary labels and supporting text |
| Border | `#E0DFD9` | Quiet panel and control boundaries |

Graph categories use blue for projects, lavender for modules, green for source files, yellow for packages, and orange for unresolved imports. Every category also has a written label and icon. Status and selection must remain understandable without color.

## Typography

The reference uses proprietary Apris and Roobert families. Archeo uses the already bundled Space Grotesk for display text and Inter for controls and prose, with JetBrains Mono for paths, commits and source. Fonts are served locally.

Display headings have a confident, regular weight and generous breathing room. Body copy uses a 1.5–1.7 line height. Workspace text is larger than the previous interface; metadata is secondary without becoming illegible. Form fields on phones use at least 16px text.

## Shape and spacing

Use the reference's 4, 8, 12, 16, 20, 24, 32 and 48px spacing scale. Inputs and buttons use an 8px radius. Large content sections are open rather than enclosed in decorative cards. The graph board and form use restrained borders and small shadows to separate layers. Avoid glossy gradients and dark surface treatments.

## Interaction and layout

The landing page pairs an actionable repository form with a clearly labeled illustrative whiteboard. Its example graph is visual context, not analyzed repository data. A short three-step section explains the real workflow.

The workspace retains repository context, file explorer, dependency map and inspector. Desktop panels sit alongside the canvas; tablet toolbars wrap; phone panels stack. Source previews, exported SVGs, analysis notes and change-impact controls follow the same light palette.

Keep visible keyboard focus, native form labels, explicit loading/error states, reduced-motion support, and sufficient contrast. Do not change repository analysis or the evidence model to achieve a visual effect.

import type { SessionTreeNode } from './types.js'

/** Presentation options for the standalone HTML tree. */
export interface RenderTreeHtmlOptions {
  readonly title?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderNode(node: SessionTreeNode): string {
  const metadata = [
    new Date(node.createdAt).toISOString(),
    ...(node.seedLength === undefined ? [] : [`seed ${node.seedLength}`]),
  ].map(escapeHtml).join(' · ')
  const children = node.children.length === 0
    ? ''
    : `<ul>${node.children.map(renderNode).join('')}</ul>`
  return `<li><article><strong>${escapeHtml(node.id)}</strong><span>${metadata}</span></article>${children}</li>`
}

/** Render a dependency-free, standalone HTML session lineage viewer. */
export function renderTreeHtml(
  tree: readonly SessionTreeNode[],
  options: RenderTreeHtmlOptions = {},
): string {
  const title = escapeHtml(options.title ?? 'DeepSeek Harness Session Tree')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    body { margin: 0; padding: 2rem; background: #0b1020; color: #e5e7eb; }
    main { max-width: 72rem; margin: 0 auto; }
    h1 { font: 600 clamp(1.5rem, 4vw, 2.5rem) system-ui, sans-serif; }
    ul { list-style: none; margin: 0; padding-left: 1.5rem; border-left: 1px solid #334155; }
    main > ul { padding-left: 0; border-left: 0; }
    li { position: relative; padding: .45rem 0 .45rem 1rem; }
    article { display: flex; flex-wrap: wrap; gap: .5rem 1rem; padding: .75rem; border: 1px solid #334155; border-radius: .6rem; background: #111827; }
    strong { color: #93c5fd; overflow-wrap: anywhere; }
    span { color: #94a3b8; font-size: .85rem; }
  </style>
</head>
<body>
  <main><h1>${title}</h1><ul>${tree.map(renderNode).join('')}</ul></main>
</body>
</html>
`
}

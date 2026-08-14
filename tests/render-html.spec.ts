import { describe, expect, it } from 'vitest'
import { renderTreeHtml, type SessionTreeNode } from '../src/index.js'

describe('renderTreeHtml', () => {
  it('renders a standalone nested viewer and escapes session metadata', () => {
    const tree: readonly SessionTreeNode[] = [{
      id: '<root>',
      createdAt: 10,
      children: [{
        id: 'child & branch',
        createdAt: 20,
        parentSession: '<root>',
        seedLength: 3,
        children: [],
      }],
    }]

    const html = renderTreeHtml(tree, { title: 'Sessions <unsafe>' })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>Sessions &lt;unsafe&gt;</title>')
    expect(html).toContain('<strong>&lt;root&gt;</strong>')
    expect(html).toContain('<strong>child &amp; branch</strong>')
    expect(html).not.toContain('<root>')
  })
})

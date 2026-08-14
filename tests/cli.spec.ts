import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runCli } from '../src/cli.js'

function header(id: string, createdAt: number, parentSession?: string): string {
  return `${JSON.stringify({
    type: 'session',
    version: 0,
    id,
    createdAt,
    ...(parentSession === undefined ? {} : { parentSession, seedLength: 0 }),
    delegationDepth: 0,
  })}\n`
}

describe('dsh-session-tree CLI', () => {
  it('renders multiple session artifacts into a standalone HTML tree', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-session-tree-cli-'))
    const rootPath = join(directory, 'root.jsonl')
    const childPath = join(directory, 'child.jsonl')
    const outputPath = join(directory, 'tree.html')
    await writeFile(rootPath, header('root', 10))
    await writeFile(childPath, header('child', 20, 'root'))
    const stdout: string[] = []
    const stderr: string[] = []

    const exitCode = await runCli(['html', '--out', outputPath, childPath, rootPath], {
      stdout: value => stdout.push(value),
      stderr: value => stderr.push(value),
    })

    expect(exitCode).toBe(0)
    expect(stderr).toEqual([])
    expect(JSON.parse(stdout.join(''))).toEqual({ outputPath, sessions: 2 })
    const html = await readFile(outputPath, 'utf8')
    expect(html).toContain('<strong>root</strong>')
    expect(html).toContain('<strong>child</strong>')
  })
})

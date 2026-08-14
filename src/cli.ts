#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { importSession } from './import-session.js'
import { renderTreeHtml } from './render-html.js'
import { getTree } from './tree.js'

/** Output ports for embedding and testing the command line entrypoint. */
export interface CliIo {
  readonly stdout: (value: string) => void
  readonly stderr: (value: string) => void
}

const PROCESS_IO: CliIo = {
  stdout: value => process.stdout.write(value),
  stderr: value => process.stderr.write(value),
}

/** Render session logs through the `dsh-session-tree` command. */
export async function runCli(args: readonly string[], io: CliIo = PROCESS_IO): Promise<number> {
  if (args.length < 4 || args[0] !== 'html' || args[1] !== '--out') {
    io.stderr('Usage: dsh-session-tree html --out <tree.html> <session.jsonl...>\n')
    return 2
  }
  try {
    const outputPath = resolve(args[2] as string)
    const inputPaths = args.slice(3)
    const sessions = await Promise.all(inputPaths.map(async path => importSession(await readFile(path, 'utf8'))))
    await writeFile(outputPath, renderTreeHtml(getTree(sessions)), { encoding: 'utf8', mode: 0o600 })
    io.stdout(`${JSON.stringify({ outputPath, sessions: sessions.length })}\n`)
    return 0
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }
}

const entryPath = process.argv[1]
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  process.exitCode = await runCli(process.argv.slice(2))
}

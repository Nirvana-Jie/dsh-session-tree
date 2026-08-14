# dsh-session-tree

English | [中文](README.zh-CN.md)

[![CI](https://github.com/Nirvana-Jie/dsh-session-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/Nirvana-Jie/dsh-session-tree/actions/workflows/ci.yml)

`dsh-session-tree` is an independent, pre-release toolkit for inspecting and branching exported [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) sessions as immutable trees. Its first slice brings pi-style lineage, stable-point forks, branch comparison, and a dependency-free HTML viewer to the Harness v0 session format.

## Why

An append-only agent log is useful for replay, but it does not by itself show which sessions share history or where an experiment diverged. This package keeps the original sessions immutable, derives lineage from their headers, and makes every fork an explicit child artifact.

## MVP capabilities

- Import and deeply freeze plaintext DeepSeek Harness v0 `session.jsonl` artifacts, including packed text, reasoning, and tool-call chunk rows.
- Build a deterministic lineage forest with duplicate-ID and cycle rejection.
- Fork at an inclusive event sequence only when the selected prefix ends between turns.
- Compare two branches by exact common semantic prefix while hiding the persistence-only `session/end-seed` marker.
- Render session IDs, timestamps, and seed lengths as a standalone static HTML tree.

## Quick start

Requirements: Node.js `^22.19.0 || >=24.0.0` and pnpm.

```sh
pnpm install
pnpm build
node dist/cli.js html --out /tmp/dsh-session-tree.html examples/basic/root.jsonl examples/basic/child.jsonl
```

The command prints the resolved output path as JSON and writes a mode-`0600` HTML file. Open that file locally to inspect the parent-child tree. Invalid input or usage exits with code `2`.

## Library API

```ts
import { readFileSync } from 'node:fs'
import {
  compareBranches,
  forkAt,
  getTree,
  importSession,
  renderTreeHtml,
} from '@nirvana-jie/dsh-session-tree'

const root = importSession(readFileSync('./examples/basic/root.jsonl', 'utf8'))
const importedChild = importSession(readFileSync('./examples/basic/child.jsonl', 'utf8'))
const newChild = forkAt(root, 2, {
  id: 'experiment-b',
  createdAt: Date.now(),
})

const tree = getTree([root, importedChild, newChild])
const comparison = compareBranches(importedChild, newChild)
const html = renderTreeHtml(tree, { title: 'Agent experiments' })

console.log(comparison.commonEventCount, html.length)
```

`importSession(content)` validates one complete plaintext artifact and returns deeply frozen metadata and events. `getTree(sessions)` returns a sorted forest. `forkAt(session, sequence, options)` creates a detached child without changing its parent. `compareBranches(left, right)` returns the exact common semantic prefix length and each side's remaining events.

## Fork semantics

The boundary passed to `forkAt` is an inclusive event sequence. The selected prefix must exist and must not leave a `turn/start` without a matching `turn/end`. The child receives `parentSession`, `seedLength`, and a trailing `session/end-seed` marker; its inherited events are copied into a newly parsed and frozen value.

`getTree` treats a session whose parent is absent from the supplied collection as a forest root. Siblings are ordered by `createdAt` and then ID. `compareBranches` compares complete immutable events, not only message text.

## CLI

```text
dsh-session-tree html --out <tree.html> <session.jsonl...>
```

The current CLI renders lineage only. Forking and branch comparison are available through the TypeScript API.

## Security

Session logs may contain prompts, file contents, command output, and credentials. This package validates and freezes imported data but does not redact it. The HTML renderer deliberately emits only session identifiers, timestamps, and seed lengths and escapes those values. Review identifiers and output before sharing either source logs or generated HTML. See [SECURITY.md](SECURITY.md).

## Architecture

[docs/architecture.md](docs/architecture.md) defines the immutable model, import validation, fork rules, comparison semantics, and presentation boundary.

## Development

```sh
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
pnpm publint
pnpm check
```

CI runs `pnpm check` on Node 22.19 and Node 24. Tests use Vitest through public interfaces. Persisted-format and lineage behavior require tests before implementation.

## Known limitations

- The importer accepts the plaintext `session.jsonl` produced by the Harness export path, not a physical `.jsonl.zstd` store file or the surrounding ZIP archive.
- Only DeepSeek Harness session format v0 is accepted.
- Stable fork detection understands the core `turn/start` and `turn/end` lifecycle; it does not reconstruct every invariant owned by an arbitrary plugin.
- The HTML output is a static lineage view, not an editor or a browser-based session importer.
- The package does not run a child session, persist a fork to disk, or integrate with the Harness runtime yet.
- This repository is not an official DeepSeek project and has no stable compatibility promise before its first release.

## License

[MIT](LICENSE)

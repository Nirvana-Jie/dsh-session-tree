# dsh-session-tree

[English](README.md) | 中文

[![CI](https://github.com/Nirvana-Jie/dsh-session-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/Nirvana-Jie/dsh-session-tree/actions/workflows/ci.yml)

`dsh-session-tree` 是一个独立的预发布工具包，用不可变树检查和分叉 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 导出的会话。首个纵向切片为 Harness v0 会话格式提供 pi 风格的谱系、稳定点分叉、分支比较和零依赖 HTML 查看器。

## 目标

追加式 agent 日志便于回放，但无法直接显示哪些会话共享历史、实验从何处分歧。本包保持原会话不可变，从头部元数据推导谱系，并把每次分叉表示为显式子会话产物。

## MVP 能力

- 导入并深度冻结 DeepSeek Harness v0 的明文 `session.jsonl` 产物，包括压缩存储的文本、推理和工具调用分片行。
- 构建确定性的会话谱系森林，并拒绝重复 ID 和环路。
- 仅在所选前缀结束于两个 turn 之间时，按包含端点的事件序号创建分叉。
- 按严格相同的语义事件前缀比较两个分支，同时隐藏仅供持久化使用的 `session/end-seed` 标记。
- 将会话 ID、时间戳和种子长度渲染为独立静态 HTML 树。

## 快速开始

环境要求：Node.js `^22.19.0 || >=24.0.0` 和 pnpm。

```sh
pnpm install
pnpm build
node dist/cli.js html --out /tmp/dsh-session-tree.html examples/basic/root.jsonl examples/basic/child.jsonl
```

命令以 JSON 输出解析后的文件路径，并写入权限为 `0600` 的 HTML 文件。在本地打开该文件即可查看父子树。输入或用法无效时退出码为 `2`。

## 库 API

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

`importSession(content)` 校验一份完整的明文产物，并返回深度冻结的元数据和事件。`getTree(sessions)` 返回已排序的谱系森林。`forkAt(session, sequence, options)` 创建与父会话分离的子会话，不修改父会话。`compareBranches(left, right)` 返回严格相同的语义事件前缀长度和两侧剩余事件。

## 分叉语义

`forkAt` 的边界是包含端点的事件序号。所选前缀必须存在，且不能留下只有 `turn/start` 而没有对应 `turn/end` 的开放 turn。子会话获得 `parentSession`、`seedLength` 和末尾的 `session/end-seed` 标记；继承事件会被复制到重新解析并冻结的新值中。

`getTree` 把父会话未出现在输入集合中的会话视为森林根节点。同级节点先按 `createdAt`、再按 ID 排序。`compareBranches` 比较完整的不可变事件，而不只比较消息文本。

## CLI

```text
dsh-session-tree html --out <tree.html> <session.jsonl...>
```

当前 CLI 只渲染谱系；分叉和分支比较通过 TypeScript API 提供。

## 安全

会话日志可能包含提示词、文件内容、命令输出和凭据。本包会校验并冻结导入数据，但不会脱敏。HTML 渲染器有意只输出会话 ID、时间戳和种子长度，并对这些值进行转义。分享源日志或生成的 HTML 前，应检查其中的标识符和输出。参见 [SECURITY.md](SECURITY.md)。

## 架构

[docs/architecture.zh-CN.md](docs/architecture.zh-CN.md) 定义不可变模型、导入校验、分叉规则、比较语义和展示职责。

## 开发

```sh
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
pnpm publint
pnpm check
```

CI 在 Node 22.19 和 Node 24 上运行 `pnpm check`。测试通过公共接口使用 Vitest。持久化格式和谱系行为必须先有测试再实现。

## 已知限制

- 导入器接收 Harness 导出路径生成的明文 `session.jsonl`，不直接读取物理 `.jsonl.zstd` 存储文件或外层 ZIP 压缩包。
- 当前只接受 DeepSeek Harness 会话格式 v0。
- 稳定分叉检测理解核心 `turn/start` 与 `turn/end` 生命周期，但不会重建任意插件拥有的全部不变量。
- HTML 输出是静态谱系视图，不是编辑器或浏览器端会话导入器。
- 本包尚不运行子会话、不把分叉持久化到磁盘，也不接入 Harness 运行时。
- 本仓库不是 DeepSeek 官方项目，首次发布前不提供稳定兼容性承诺。

## 许可证

[MIT](LICENSE)

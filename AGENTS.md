# Agent Instructions

- Read `README.md` and `docs/architecture.md` before changing public behavior.
- Use ESM, strict TypeScript, Node `^22.19.0 || >=24.0.0`, and pnpm.
- Add public-interface Vitest coverage before implementing behavior; do not test private helpers.
- Validate imported JSONL at the filesystem boundary and reject unsupported session versions, corrupt sequences, and lineage cycles.
- Keep imported and derived session values deeply immutable. History edits create forks; they never rewrite a parent.
- Escape every value before placing it in generated HTML. Never commit sensitive session logs.
- Update `README.md` and `README.zh-CN.md` together when user-facing behavior changes.
- Run `pnpm check` before pushing.

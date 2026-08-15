# Agent Instructions

- Read `README.md` and `docs/architecture.md` before changing public behavior.
- Use ESM, strict TypeScript, Node `^22.19.0 || >=24.0.0`, and pnpm.
- Add public-interface Vitest coverage before implementing behavior; do not test private helpers.
- Keep the host entry passive. Add Web behavior through documented DSH client services and extension slots.
- Keep `buildSessionTree()` pure and its output immutable. Reject duplicate session IDs and lineage cycles; treat sessions with missing parents as roots.
- Never edit session persistence or logs directly. Navigation and fork operations go through the injected DSH session service.
- Register locale, styles, slots, and other lifecycle contributions through `ctx.effect()` or a disposer-returning registry.
- Keep React and DSH client packages external to the production browser bundle.
- Update `README.md` and `README.zh-CN.md`, architecture documents, and locale dictionaries together when their shared behavior changes.
- Run `pnpm check` before pushing and verify product-visible integration in a real DSH Web profile when the client entry changes.

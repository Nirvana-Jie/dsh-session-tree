# Security Policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing private session identifiers, workspace paths, credentials, or exploitable examples.

## Data handling

`dsh-session-tree` reads DSH's live session-list metadata in the user's browser. It displays session titles and IDs, parent relationships, workspace paths, agent presets, status, and recent activity. It does not read message bodies, tool calls, command output, or plaintext session logs.

Open and fork actions use the DSH client session service. DSH remains responsible for authorization, persistence, stable-turn selection, and session mutation. The plugin does not add a remote endpoint or export session data.

Install only plugin sources you trust. A Git dependency may run this package's `prepare` build during installation after the user explicitly allows it through pnpm.

The project is pre-release. No version currently carries a long-term compatibility or security-support promise.

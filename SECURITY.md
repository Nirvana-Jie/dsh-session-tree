# Security Policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing private session logs, credentials, or exploitable examples.

## Data handling

DeepSeek Harness session logs may contain prompts, file contents, command output, and credentials. `dsh-session-tree` validates and freezes imported values but does not redact the source data. The standalone HTML renderer includes only session identifiers, timestamps, and seed lengths and HTML-escapes each value; treat both the input artifacts and generated output according to your deployment's data policy.

The project is pre-release. No version currently carries a long-term compatibility or security-support promise.

---
name: config
description: Inspect or change validated Command Code settings. Use when asked about configuration, current values, themes, permission defaults, feature models, taste learning, sharing defaults, or when a setting change would help complete the task.
---

# Configuration

Use the deterministic CLI instead of editing settings files by hand.

1. Determine whether the request needs `list`, `get`, or `set`.
2. Read [settings.md](references/settings.md) for keys and value rules. Read [permissions.md](references/permissions.md) only for permission-related changes.
3. Run `cmd config list|get|set|default` through `shell_command` with `--json` when structured output helps. On Windows the binary is `cmdc` (bare `cmd` opens the Windows shell) — use `cmdc config ...` there.
4. For writes, choose the explicit `user` or `project` scope supported by the setting — the `scope` column in [settings.md](references/settings.md) says which one each takes. Never guess a scope.
5. Report the previous value, new value, and written scope.

A running session adopts most changes at the start of its next round, so report the write as applied without claiming the live session already reloaded it. The exception is `model`: a running session keeps its current model, so a `model` write is the default for new sessions and takes effect in the running session only after a `/model` switch or a restart. For a live model change in the current session, use `/model <id>` instead.

Never hand-edit invalid JSON or invent a setting key.

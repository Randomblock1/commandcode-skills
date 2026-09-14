<!-- Generated from the Command Code configuration registry. Docs: https://commandcode.ai/docs -->

# Permission settings

`permissions.defaultMode` controls the default tool permission mode and is stored in user scope.

Allowed values:

- `default`: ask when no existing rule decides
- `plan`: restrict the session to planning-safe tools
- `auto-accept`: accept ordinary tool requests while preserving policy denials
- `dont-ask`: deny requests that would otherwise need a prompt

The unrestricted bypass mode cannot be written through `cmd config` because it is not a
stored setting at all. Bypass is a per-launch flag the USER passes when starting Command
Code: `--yolo` (alias for `--dangerously-skip-permissions`) skips permission prompts for
that run only, e.g. `cmd --yolo` or `cmd --yolo -p "..."` for print mode, where shell
commands and file writes are otherwise refused. Never suggest making it the stored default;
when a denied action needs it, tell the user to relaunch with `--yolo` themselves.

```text
cmd config get permissions.defaultMode --scope user --json
cmd config set permissions.defaultMode plan --scope user --json
cmd config default permissions.defaultMode --json
```

A short-lived config command changes disk state and exits, so its result reports `liveSessionReloaded: false`. A running session re-reads the changed settings at the start of its next model round and adopts the new default then — no restart needed.

<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Verify a mod

A mod that fails to import, exports no factory, or throws in its factory becomes a **warning - never a crashed session**. That safety also means a broken mod can fail silently if you never check. This section is the verification loop: load it, list it, exercise it, reload it.

## 1. Load it without installing

```bash
cmd --mod ./your-mod.ts
```

`--mod` is repeatable, loads ahead of installed mods, and wins name collisions - the fastest try-it loop. No build step: jiti compiles the TypeScript at load.

## 2. Confirm it registered

```bash
cmd mods list
```

Your mod must appear, with no load warnings. If it does not appear, the warning printed by `cmd mods list` says why (import error, no default-export factory, factory threw, duplicate name).

## 3. Exercise every surface it registers

- **Slash command** - type `/` in the chat input: the command must appear in autocomplete with its description. Run it; `{message}` renders an info row, `{prompt}` starts an automated turn.
- **Tool** - ask the model to use it by name ("call count_todos"). The tool call renders in the feed like any built-in.
- **Hook** - trigger the behavior it guards (for a `beforeToolCall` blocker, ask for the blocked action and watch the block reason land as the tool result).
- **Input interception** - type the pattern `transformInput` matches and confirm the rewrite/consume happened.
- **Status** - `cmd.ui.setStatus('text')` must show up as a segment on the row under the input, replace itself on the next call, and disappear on `setStatus(null)`.
- **Widget** - `cmd.ui.widget` / `cmd.ui.refreshWidgets` must return without throwing and hand back a `Disposable`. They render **nothing** today (TUI wire-up pending - see the [UI surface](./ui.md#ui-surface) note), so don't expect an editor widget to appear yet; only verify the calls are safe.
- **Renderer** - `cmd.showEntry` rows render styled; an unregistered type pretty-prints as JSON.

### Test: block-dangerous-commands guards rm -rf

```text copy filename="Prompt"
Run rm -rf /tmp/scratch-dir
```

Expected result:

-  The mod's confirm dialog appears before the shell command runs
-  Declining blocks the tool - the model sees the block reason and adapts
-  No `tool_running` fires for the blocked call

## 4. Iterate with /reload

Mods load once per process. After editing the file, run `/reload` - it restarts Command Code, resumes the session, and re-discovers and re-imports every mod (jiti caches nothing between loads).

## 5. Headless check (CI)

```bash
cmd -p "exercise the mod" --mod ./your-mod.ts
```

Print mode loads user-scope and `--mod` mods with the UI bridge degraded to deterministic defaults (confirm → false, select/input → undefined). A mod that must work in CI should behave sensibly under those defaults.

## Working from the bundled examples

Ask Command Code to build the mod you want and it starts from a bundled example rather than a blank file - see [Runnable examples](./overview.md#runnable-examples) for the list. Each one loads through the real mod loader in CI on every test run, so what you start from is proven to load.

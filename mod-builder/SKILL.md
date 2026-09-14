---
name: mod-builder
description: Build a Command Code mod (a loadable plugin) end to end — a TypeScript file that registers tools, slash commands, lifecycle hooks, event observers, input interception, custom renderers, flags, or a model provider through the ModApi. Use when the user wants to create, build, generate, or scaffold a mod, extend Command Code with custom behavior, add a custom tool or slash command, intercept input, block or rewrite tool calls, or turn a workflow into a reusable plugin.
---

# Mod Builder

You are building a **mod**: a TypeScript file that Command Code discovers on disk and loads
onto its agent loop. A mod is the plugin unit — it can add tools the model calls, slash
commands, mutating lifecycle hooks, event observers, typed-input interception, custom feed
rendering, configurable flags, and model providers. This is the same API Command Code's own
built-in features (providers, titling, update notice) are written against.

Two resources ship next to this file — use them instead of searching the codebase:

- `examples/` — runnable, single-file example mods, one per capability. Read the one
  closest to the job and adapt it.
- `reference/` — the full mods documentation, generated from the public docs
  (commandcode.ai/docs/mods). This is the authoritative API reference:

<!-- generated:reference-index:start -->
- `reference/overview.md` — Mods
- `reference/api.md` — ModApi reference
- `reference/hooks-and-events.md` — Hooks and events
- `reference/ui.md` — UI surface
- `reference/packaging.md` — Packaging and install
- `reference/verify.md` — Verify a mod
<!-- generated:reference-index:end -->

## 1. The shape of a mod

A mod is a file that default-exports a factory. The factory receives the API bound as `cmd`
and registers everything up front (it may be async):

```typescript
import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi) {
	cmd.addCommand({name: 'hello', handler: () => ({message: 'hi from a mod'})});
}
```

Save it at `~/.commandcode/mods/hello.ts` (personal) or `<project>/.commandcode/mods/hello.ts`
(project — loads once the workspace is trusted). It loads next session, or test it now with
`cmd --mod ./hello.ts`. No build step — jiti compiles the TypeScript at load.

## 2. Pick the capability

Every registration verb is `add*` and returns a `Disposable` (`.dispose()` undoes it). Match
the job to the seam, then open the matching example file:

| The mod should… | Use | Example |
|---|---|---|
| add a `/command` | `cmd.addCommand({name, handler})` | `examples/slash-command.ts` |
| add a tool the model calls | `cmd.addTool({schema, run})` | `examples/custom-tool.ts` |
| block or rewrite a tool call | `cmd.hooks({beforeToolCall})` | `examples/block-dangerous-commands.ts` |
| rewrite or consume typed input | `cmd.hooks({transformInput})` | `examples/input-shortcuts.ts` |
| keep a finished run going / react to session start·end | `cmd.hooks({onStop, onSessionStart, onSessionEnd})` | `examples/lifecycle-hooks.ts` |
| react to what happens | `cmd.on(event, handler)` | `examples/observe-events.ts` |
| print custom styled feed rows | `cmd.addRenderer` + `cmd.showEntry` | `examples/custom-entry-renderer.ts` |
| take configurable options | `cmd.addFlag` + `cmd.getFlag` | `examples/flags-and-options.ts` |
| everything at once (a tour) | — | `examples/kitchen-sink.ts` |

## 3. The one rule: hooks mutate, `on` observes

- **`cmd.hooks({...})`** is the only place that can change behavior — block a tool
  (`beforeToolCall`), rewrite a result (`afterToolCall`), add to the prompt
  (`appendSystemPrompt`), rewrite typed input (`transformInput`), force a finished run to
  keep going (`onStop`), react to session start/end (`onSessionStart`/`onSessionEnd`), or run
  post-turn work (`onRunEnd`). See `reference/hooks-and-events.md` for the full set. Multiple
  `hooks()` calls compose in registration order.
- **`cmd.on(event, ...)`** only observes — it cannot block or rewrite. Handlers are isolated
  (a throw becomes a `mod_error` event, never a crash).

If you find yourself wanting an `on` handler to stop a tool, you want a hook instead.

## 4. Tools and commands, precisely

- **Tool `run`** receives `{input, runtime, signal}` and returns
  `{ok: true, content: [{type: 'text', text}]}` or `{ok: false, error}`. Mark
  `readOnly: true` when the tool never mutates (stays available in plan mode). A mod tool
  whose name collides with an existing tool is skipped with a `mod_error` — pick a distinct,
  namespaced name.
- **Command `handler`** returns DATA, never a live callback: `{prompt}` runs an automated
  model turn, `{message}` renders an info row, nothing = pure side effect. It gets
  `{args, ui, cwd, exec}`.

## 5. Verify what you built

Do NOT declare the mod done until it demonstrably loads and its surface works. The loop
(full detail in `reference/verify.md`):

1. **Load it without installing** — `cmd --mod ./your-mod.ts`. A file that fails to import,
   exports no factory, or throws in its factory becomes a warning — never a crashed session —
   so an unchecked mod can fail silently.
2. **Confirm it registered** — `cmd mods list` must show the mod with zero load warnings.
   If it is missing, the printed warning says why (import error, no default-export factory,
   factory threw, duplicate name).
3. **Exercise every registered surface** — a slash command must appear in `/` autocomplete
   and run; a tool must be callable by the model by name; a hook must be triggered (ask for
   the guarded action and watch the block/rewrite land); a widget/status must render around
   the input panel.
4. **Iterate with `/reload`** — mods load once per process; `/reload` restarts and
   re-imports every mod.
5. **Headless check when CI matters** — `cmd -p "…" --mod ./your-mod.ts`; dialogs resolve
   deterministic defaults (confirm → false, select/input → undefined), so the mod must
   behave sensibly under them.

Working inside the Command Code repo itself? The examples are validated by
`packages/harness/src/mod-host/__tests__/examples.test.ts` — run it after touching them, and
run `pnpm generate:knowledge` after editing the docs under `packages/docs/src/app/mods/`
(the `reference/` files here are generated from them).

## 6. Ship it (optional)

- Personal: leave it in `~/.commandcode/mods/`.
- A package: a `package.json` with `{"commandcode": {"mods": ["./index.ts"]}}`, installed via
  `cmd mods add npm:<name>` / `cmd mods add owner/repo` / `cmd mods add ./local-dir`.
  Full packaging/filtering detail: `reference/packaging.md`.

## Boundaries to state up front

- **No sandbox** — a mod is arbitrary code; install packages you trust. Project mods are
  trust-gated like project skills.
- **Reload is `/reload`** — mods load once per process; `/reload` restarts and re-imports.
- **Providers extend, never replace** — `cmd.addProvider` adds to the provider set.
- **Rendering is line-based** — `cmd.addRenderer` returns styled text lines, not React
  components, so a mod renders in any host and a broken renderer can't break the screen.

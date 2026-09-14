<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# ModApi reference

`export default function (cmd: ModApi)` - the factory. `ModFactory = (cmd: ModApi) => void | Promise<void>`. Every `add*` / `on` / `hooks` call returns `Disposable { dispose(): void }` - `.dispose()` undoes exactly that one registration (idempotent; a second call is a no-op). Disposables make a registration retractable and are the seam future hot-reload will recycle.

## Fields

| Member | Type | Notes |
|---|---|---|
| `cmd.name` | `string` | the mod's name (from filename / manifest) |
| `cmd.cwd` | `string` | workspace root |
| `cmd.session` | `ModSessionApi \| undefined` | persistence seam; undefined until bound |
| `cmd.events` | `ModEventBus` | `emit(channel, data?)` / `on(channel, handler)` cross-mod bus |
| `cmd.ui` | `ModUi` | `notify` / `confirm` / `select` / `input` / `setStatus` / `widget` / `refreshWidgets` / `capabilities` |
| `cmd.sessions` | `ModSessionControls` | `compact` / `tree` / `leafId` / `navigateTree` / `setLabel` |

## Registration (factory-time; each returns `Disposable`)

| Method | Signature |
|---|---|
| `cmd.hooks` | `(hooks: ModHooks) => Disposable` |
| `cmd.addTool` | `(tool: ToolModule) => Disposable` |
| `cmd.addCommand` | `(command: {name; description?; argumentHint?; handler}) => Disposable` |
| `cmd.addFlag` | `(name, {type: 'boolean'\|'string'; default?; description?}) => Disposable` |
| `cmd.addProvider` | `(module: ProviderModule) => Disposable` |
| `cmd.addRenderer` | `(customType: string, (data) => readonly string[]) => Disposable` |
| `cmd.on` | `(event: AgentEventType \| 'session_start' \| 'session_shutdown', handler) => Disposable` |

What each does:

- `cmd.hooks(hooks)` - the mutating lifecycle hooks: the `AgentMod` surface (transformContext, beforeToolCall, afterToolCall, onTurnStart/End, appendSystemPrompt, shouldStopAfterTurn, prepareNextTurn, onRunEnd, **onStop**) **plus `transformInput`, `onSessionStart`, and `onSessionEnd`**. Multiple calls compose in order with mod-runner semantics (threading, chaining, any-true, later-wins). See [the hook contracts](./hooks-and-events.md#the-hook-contracts) for the full contract of each hook.
- `cmd.addTool(toolModule)` - a `ToolModule` the model can call; same collision policy as `AgentMod.tools` (existing names win, collision emits `mod_error`). The tool's `run` receives `{input, runtime, signal}` and returns `{ok: true, content: [{type: 'text', text}]}` or `{ok: false, error}`. Mark `readOnly: true` when the tool never mutates (stays available in plan mode).
- `cmd.addCommand({name, description, handler})` - a `/name` slash command. The handler returns data, not callbacks: `{prompt}` submits an automated turn, `{message}` renders an info row, nothing = pure side effect. It gets `{args, ui, cwd, exec}`. First registration of a name wins across mods.
- `cmd.addFlag(name, {type, default})` / `cmd.getFlag(name)` - named options; values come from repeatable `--mod-option name=value` CLI flags (defaults apply otherwise).
- `cmd.on(event, handler)` - observe any `AgentEvent` plus the host lifecycle events `session_start` / `session_shutdown` (fired when a harness binds the host and when a session switch or dispose replaces it). Handlers are isolated: a throw becomes a `mod_error {hook: 'on:<event>'}` event, never a crash.
- `cmd.addProvider(providerModule)` - register a model provider through the same `ProviderModule` seam the built-ins use (id, transport, auth hooks, model list). The host appends mod providers to its set - mods extend the provider set, never replace it.
- `cmd.addRenderer(customType, data => lines)` - a renderer for a custom entry type; returns the lines to print (style them with ansi escapes - picocolors, `@commandcode/tui` helpers, or raw codes). First registration per type wins across mods.

## Live methods (any time after the harness binds)

| Method | Signature |
|---|---|
| `cmd.getFlag` | `(name) => boolean \| string \| undefined` |
| `cmd.showEntry` | `(customType, data?) => void` |
| `cmd.queueMessage` | `({content, deliverAs?: 'steer' \| 'follow-up'}) => void` |
| `cmd.exec` | `({command, args?, cwd?, signal?}) => Promise<{stdout, stderr, code}>` |
| `cmd.setSessionName` / `setModel` / `setEffort` | `(value) => void` (buffered pre-bind) |
| `cmd.getAllTools` / `getActiveTools` | `() => readonly string[]` |
| `cmd.setActiveTools` | `(names: readonly string[]) => void` |

Details:

- `cmd.ui` - `notify` (a `notice` feed row), `confirm` / `select` / `input` (the Interaction question modal in the TUI; deterministic defaults headless: false/undefined), `setStatus`, `widget`, `refreshWidgets`. The full dialog/status/widget contract is in [UI surface](./ui.md#ui-surface).
- `cmd.queueMessage({content, deliverAs})` - `steer` lands after the current tool batch (behind any queued user messages in the same poll), `follow-up` only when the run would stop (ahead of continuation nudges, behind queued user input).
- `cmd.session` - the `ModSessionApi` persistence seam (appendCustomEntry / appendCustomMessageEntry / getCustomEntries), undefined until bound. See [ModContext.session - the mods' persistence surface](./hooks-and-events.md#mod-context-session-the-mods-persistence-surface).
- `cmd.showEntry(customType, data)` - render a custom entry into the live feed through the renderer registered for that type (unrendered types pretty-print as JSON). The TUI wires the sink; headless runs drop entries. Pair with `cmd.session.appendCustomEntry` when the data should also persist.
- `cmd.sessions` - live session controls: `compact()`, `tree()` (the session branch tree as stable `{id, label, children}` nodes), `leafId()`, `navigateTree({targetId, summarize?, customInstructions?})`, and `setLabel({targetId, label})`. These read live harness state, so unlike the buffered setters they throw with a clear message when no session is bound yet.
- `cmd.exec({command, args})` - run a process through the harness Runtime (args are shell-quoted).
- `cmd.getAllTools()` / `cmd.getActiveTools()` / `cmd.setActiveTools(names)` - a mod-managed tool filter: disabled tools vanish from the model's schemas and refuse execution.
- `cmd.events` - a tiny cross-mod pub/sub bus (`emit` / `on`).

## `ModHooks` (the mutating lifecycle - all optional, all composable)

`transformContext`, `appendSystemPrompt`, `beforeToolCall`, `afterToolCall`, `onTurnStart`, `onTurnEnd`, `shouldStopAfterTurn`, `prepareNextTurn`, `onRunEnd`, `onStop`, plus the host-level `transformInput`, `onSessionStart`, and `onSessionEnd`.

- `beforeToolCall` returns `{block?, input?, additionalContext?, terminate?}`.
- `afterToolCall` receives an `isError` param (PostToolUse vs PostToolUseFailure) and returns `{content?, isError?, additionalContext?, terminate?, modState?}`.
- `onStop` receives `{state, stopReason, turnNumber, lastAssistantText}` and returns `{continue?, reason?}`.
- `transformInput` returns `{action:'continue'} \| {action:'transform', text} \| {action:'handled', message?}`.
- `onSessionStart`/`onSessionEnd` receive `{source}` / `{reason}`.

The per-hook contracts, ordering guarantees, and error policy are in [the hook contracts](./hooks-and-events.md#the-hook-contracts).

- `transformInput({text})` intercepts typed user prompts before they reach the model (the mods' **UserPromptSubmit** hook): return `{action: 'transform', text}` to rewrite (handlers chain - the next sees the rewrite), `{action: 'handled', message?}` to consume the prompt entirely (an optional info row renders in its place), or `undefined`/`{action: 'continue'}` to pass through. Only real typed input is intercepted - automated turns, meta messages, image-carrying prompts, and slash commands never route through it; a throwing handler is skipped (`mod_error {hook: 'transformInput'}`), never a swallowed prompt. It lives in `hooks` because it MUTATES what the agent sees.
- `onStop({state, stopReason, turnNumber, lastAssistantText})` is the **Stop** hook - return `{continue: true, reason?}` to force a run that would otherwise finish to keep going (the reason rides an automated turn). Fires only on natural completion, any-mod wins, and the loop caps consecutive continuations.
- `onSessionStart({source})` / `onSessionEnd({reason})` are the once-per-session **SessionStart** / **SessionEnd** hooks - fired when the host binds to / tears down a session (`source: 'startup' | 'resume'`, `reason: 'shutdown' | 'replaced'`). Act through the mod's captured `cmd`; they run fire-and-forget (a throw becomes `mod_error`), so a session hook never blocks bind/dispose. Pure observation is also available via `cmd.on('session_start' | 'session_shutdown')` - these named hooks add the typed metadata.

## `on` event types

Any `AgentEvent['type']` - including `run_start`, `run_end`, `turn_start`, `turn_end`, `model_request_start`, `model_request_end`, `tool_running`, `tool_completed`, `tool_errored`, `subagent_start`, `subagent_stop`, `subagent_progress`, `compaction_start`, `compaction_done`, `notice`, `session_titled`, `permission_mode_changed`, `config_setting_changed`, `mod_error` - plus the two host lifecycle events `session_start` / `session_shutdown`. (`subagent_start`/`subagent_stop` are SubagentStart/Stop; `compaction_start`/`compaction_done` are Pre/PostCompact; `notice` is Notification.) The full payload catalog is in [the AgentEvent catalog](./hooks-and-events.md#agent-event-catalog).

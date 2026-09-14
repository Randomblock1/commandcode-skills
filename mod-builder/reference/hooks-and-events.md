<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Hooks and events

The harness's extension seam. A **mod** is a plain object of lifecycle hooks that mutates agent state or changes loop decisions. Pure observers (UI, telemetry, loggers) are **not** mods - they subscribe to the `AgentEvent` stream. Hooks change behavior; subscribers watch it. In a loadable mod, `cmd.hooks({...})` registers the hooks and `cmd.on(event, ...)` subscribes to events.

A mod may also contribute **tools**, and every hook receives a **`ModContext`** (`{emit, signal, cwd, session?}`) as an extra last argument, so a mod can raise its own events and persist durable state without extra plumbing.

## Lifecycle - where each hook fires

One `run()` = one user turn → many model turns ("rounds"). The loop below is the agent loop, verbatim in ordering; mod hooks are marked `◆`, events `→`.

```bash
run({state, userInput?, config})
  fork AbortController; working := state (+ user message when userInput given)
  ctx := {emit, signal, cwd, session}              - built ONCE per run,
                                    passed as the LAST argument to every ◆ hook below
  → run_start {sessionId}
  poll getSteeringMessages once                      (catch pre-run queued input)
  loop:
    abort check ──────────────────────────────────► stop: interrupted (→ interrupted)
    ◆ onTurnStart (each mod, in order; returns new state)
    → turn_start {turnNumber}
    read live permission mode ONCE - pinned for this round
    resolve systemPrompt (string | builder({sessionId, state, permissionMode}))
    ◆ appendSystemPrompt (each mod; non-empty returns joined with '\n\n', in
      registration order, and appended AFTER the base prompt)
    ◆ transformContext (each mod; messages threaded mod→mod; result is EPHEMERAL -
      used for this call only, never written back to state.messages)
    prepareForSend (core wire-validity pass: orphan heal, merge, strip meta)
    → message_start
    → model_request_start {model}
    modelClient.complete(...)          (streams → text_delta / thinking_* /
                                        message_update / continuation_recovery /
                                        tool_input_coerced; retry → api_retry)
    → model_request_end {model, usage, stopReason}
    → message_end {content}
    working += assistant message       (provider-executed blocks filtered out)
    if client tool calls:
      runTools(...)                    (see tool-dispatch order below)
      working += tool-results user message
      working := setModState(...) for every afterToolCall `modState`
        contribution across the batch (BEFORE onTurnEnd runs)
      any deny ────────────────────────► pendingStop: permission_denied
      any terminate ───────────────────► pendingStop: terminate
      else poll getSteeringMessages → append (source 'steering')
    ◆ onTurnEnd (each mod; receives THIS turn's usage; returns new state)
    → turn_end {turnNumber, hadToolCalls, usage}
    onCommit(working)                  ← the durability boundary
    pendingStop? ──────────────────────► stop
    ◆ shouldStopAfterTurn (any true) ──► stop: stop_hook
    turnNumber ≥ maxTurns ─────────────► stop: max_turns
    if no tool calls:
      no follow-up wanted ─────────────► ◆ onStop (any continue → keep going)
                                         else stop: end_turn
    ◆ prepareNextTurn (merged; later mods win) → may swap model / effort
  ◆ onRunEnd (each mod, awaited)
  → run_end {result}
```

### Tool-dispatch order

```bash
for each tool_use:  → tool_queued {toolCallId, toolName, input}   ← ALWAYS the original input
phase 1 - permissions (always sequential):
  permissions.generateDescription (5s timeout → null)
  permissions.check({toolName, input, description, permissionMode})
    throw ⇒ deny (fail closed)
  deny → tool_denied; batch aborted: every call gets a tool_result,
    run stops with permission_denied AFTER the turn commits
phase 2 - execution (sequential, or parallel when config.toolExecution='parallel'):
  ◆ beforeToolCall (each mod, in order; `input` rewrites CHAIN mod→mod;
      execution uses the LAST mod's input; a mod may also set `terminate`)
      block ⇒ → tool_hook_blocked {hookOutput}; the block reason becomes the
      tool_result text; NO tool_running / tool_completed / tool_errored fires
  → tool_running {toolCallId, toolName, description}
  toolRunner.execute({toolName, input: <possibly rewritten>, signal, onUpdate})
  ◆ afterToolCall (each mod, in order; sees current content, may replace it,
      append `additionalContext`, flip `isError`, set `terminate`, or persist
      `modState`)
  beforeToolCall additionalContext strings appended to the final content
  → tool_completed {result}   (or → tool_errored {error})
```

### Ordering guarantees mod authors can rely on

- Every hook receives `ModContext` (`{emit, signal, cwd, session?}`) as its LAST argument. It's declared optional on every hook signature, so a hook that only declares the params object keeps compiling and running unchanged; the core always supplies a real object at runtime.
- `beforeToolCall` completes (for every mod) **before** `tool_running` is emitted. Its `input` rewrites chain across mods, but the `tool_queued` event fired with the ORIGINAL input before any hook ran and is never re-emitted - display always shows what the model asked for, only execution sees the rewrite.
- `afterToolCall` completes **before** `tool_completed` / `tool_errored` is emitted - the terminal event carries the post-hook content, and its `isError` (when set) decides which of the two fires, independent of whether execution itself threw.
- `afterToolCall`'s `modState` is committed right after the batch's tool-result message is appended - BEFORE `onTurnEnd` runs, so `onTurnEnd` sees it.
- `onTurnStart` precedes `turn_start`; `onTurnEnd` precedes `turn_end` and `onCommit`.
- `onCommit` fires once per completed turn with the full serializable state.
- `shouldStopAfterTurn` is evaluated **after** the turn commits, so a stop_hook never loses the turn that triggered it.
- `prepareNextTurn` runs only when the loop actually continues (never on a stopping turn).
- `onRunEnd` is **awaited** before the `run_end` event - it is the place for must-complete work (flush, trigger learning); event subscribers must never be.
- Mods run in **registration order** in every phase; the built-ins come first and caller mods last (they see post-compaction context and post-hook tool results).
- Hooks **never throw** upward: the runner catches per-mod, per-hook. A failing `transformContext` leaves messages unchanged; a failing `onTurnStart`/`onTurnEnd` keeps the prior state; a failing `shouldStopAfterTurn` means "don't stop"; failing tool hooks are skipped. Every catch site ALSO emits a `mod_error {modId, hook, error}` event before falling back to its no-crash default - the decision the loop makes is unchanged, but the degradation is never silent.

## The hook contracts

### `transformContext({messages, state, signal?}, ctx?) → messages`

Fires once per round, after `appendSystemPrompt`, before `prepareForSend`. Messages are threaded through every mod in order - each receives the previous mod's output. **The result is used for this model call only and never written back to `state.messages`**: the durable log is untouched (compaction relies on this - the recorded transcript stays complete). Return the input array unchanged (same reference) to signal "no change".

### `shouldStopAfterTurn({state, turnNumber}, ctx?) → boolean`

Fires after the turn commits. **Any** mod returning `true` ends the run with `stopReason: 'stop_hook'` - first true short-circuits. This is *early stop* (goal budget spent); it is the opposite of the Stop hook forcing continuation.

### `prepareNextTurn({state, turnNumber}, ctx?) → {model?, effort?} | undefined`

Fires at the bottom of a continuing round. Results are merged across mods - later mods override earlier ones per field. A returned `model`/`effort` applies from the **next** model call onward (`config` is never mutated).

### `appendSystemPrompt({state}, ctx?) → string | undefined`

Fires once per round, right after the round's base `systemPrompt` resolves and before `transformContext`. Every mod's non-empty return is joined with `'\n\n'`, in registration order, and appended AFTER the base prompt. May return a plain string OR a Promise. **Must be byte-stable across rounds for the same durable inputs** - the provider's prompt-prefix cache keys off the system prompt's bytes, so a value that changes turn-to-turn without a corresponding `state`/`modState` change busts the cache every round. Compute once, store in `modState`, read it back.

### `beforeToolCall({toolCallId, toolName, input, state}, ctx?) → {block?, additionalContext?, input?, terminate?} | undefined`

Fires per tool call, after the permission check passed, before execution.

- `block: true` - the tool does not run. The core emits `tool_hook_blocked` with `hookOutput` = your `additionalContext` (or `'Blocked by a pre-tool hook.'`), and that same text becomes the tool_result the model sees. Later mods' `beforeToolCall` for this call do not run. No `tool_running`/`tool_completed`/`tool_errored` is emitted for a blocked call.
- `additionalContext` (without `block`) - collected across mods and appended as extra text blocks to the tool_result **after** execution and after `afterToolCall` overrides.
- `input` - rewrites the input the tool actually executes with. **Chained across mods**: the next mod's `input` param is YOUR rewrite, not the original.
- `terminate: true` - stops the run after this tool batch finishes. ANY-semantics (one hook, on one call, in one batch, is enough). Combines with `block` on the same return value.
- `undefined` - no opinion.

### `afterToolCall({toolCallId, toolName, input, result, isError, state}, ctx?) → {content?, terminate?, additionalContext?, isError?, modState?} | undefined`

Fires per tool call after execution (also after an execution error - `result` is then the error text content). `input` is the FINAL input the tool actually ran with (after any `beforeToolCall` rewrites).

- `isError` (param) - whether the tool's OWN execution failed, read before any hook override and threaded across mods like `result`. This is the **PostToolUse vs PostToolUseFailure** distinction: a hook can branch on `isError` to react only to failures. It is the INPUT signal; the returned `isError` field below is the OUTPUT override that selects the terminal event.
- `content` **replaces** the tool result the model will see (threaded mod→mod).
- `terminate: true` ends the run with `stopReason: 'terminate'` **after the whole batch finishes**.
- `additionalContext` - appended as a SEPARATE text block after `content` (and after any `beforeToolCall` additionalContext strings).
- `isError` - overrides whether the terminal event is `tool_completed` or `tool_errored`, independent of whether execution itself threw.
- `modState` - a `Record<string, unknown>` merged into `state.modState[mod.id]` right after the tool-result message commits - a full replace of that mod's slot, exactly like `setModState`. The durable-state channel for tool hooks: neither tool hook can return a whole `AgentState` the way `onTurnStart`/`onTurnEnd` can.

### `onTurnStart({state, turnNumber}, ctx?) → AgentState` / `onTurnEnd({state, turnNumber, hadToolCalls, usage}, ctx?) → AgentState`

The only hooks that can **persist state changes** unconditionally - they return the new `AgentState` (typically via `setModState`), which the loop threads onward and commits. `onTurnEnd`'s `usage` is *this turn's* token usage. Both fire every round, including the round that stops.

### `onRunEnd({state, result}, ctx?) → void`

Fires once, awaited, after the loop exits and before the `run_end` event. `state` is the final state; `result` carries `finalText`, `stopReason`, `turnCount`, accumulated `usage`. Cannot alter the result. This is the "must-complete work" hook (learning, flushes).

### `onStop({state, stopReason, turnNumber, lastAssistantText}, ctx?) → {continue?, reason?} | undefined`

The **Stop hook** - the mods' force-continue channel. Fires when a turn WOULD end the run **naturally** - the model returned no tool calls and no follow-up provider wants to continue. Returning `{continue: true}` keeps the run going: `reason` (or a neutral default) is appended as an automated `source: 'stop_hook'` user turn, so the model is told why it must keep working.

- **ANY** mod returning `continue` wins (first wins, short-circuits).
- Does **NOT** fire for hard stops (`max_turns`, `terminate`, `permission_denied`, `interrupted`).
- A follow-up provider (e.g. the continuation nudger) gets first say; `onStop` is consulted only when the provider declines.
- The loop caps consecutive stop-hook continuations at **8** - a hook that always says `continue` can't loop forever.
- Distinct from `shouldStopAfterTurn` (force EARLY stop) and `onRunEnd` (observe the stop): only `onStop` can push a finished run onward.

```ts
const persistUntilTestsPass = {
	id: 'until-green',
	onStop: async ({lastAssistantText}) => {
		if (/all tests pass/i.test(lastAssistantText)) return {continue: false};
		return {continue: true, reason: 'Tests are not green yet - keep going.'};
	},
};
```

## `ModContext.session` - the mods' persistence surface

The harness's tree-format session store gives mods a durable, per-entry seam onto the SAME append-only file the transcript lives in. Available in a loadable mod as `cmd.session` and inside hooks as `ctx.session`. Two entry kinds:

- **`appendCustomEntry({customType, data?})`** - a `custom` tree entry. Mod-private data; **never** sent to the LLM, never rendered. Use it for durable bookkeeping a mod wants to survive resume (counters, cursors, cached decisions).
- **`appendCustomMessageEntry({customType, content, display, details?})`** - a `custom_message` tree entry. Content the model SHOULD see: it is projected as an ordinary `user` message on the NEXT turn (`display: true` also renders it in the TUI with distinct styling; `display: false` is context-only). The call returns `{entryId, message}` - a mod MUST fold `message` onto the `AgentState` it hands back from its hook for the model to see it that turn.
- **`getCustomEntries({customType})`** - reads back every `custom` entry this mod itself wrote (filtered by `customType`), in file order, over the ACTIVE branch's full entry list. The standard reload pattern: a mod with in-memory state seeds it from `getCustomEntries` at first `onTurnStart`.

```ts
const MOD_ID = 'turn-counter';
const CUSTOM_TYPE = 'turn-counter/count';

const mod = {
	id: MOD_ID,
	onTurnStart: async ({state}, ctx) => {
		if (!ctx?.session) return state; // a bare unit-test config without a store
		const priorCount = ctx.session.getCustomEntries({
			customType: CUSTOM_TYPE,
		}).length;
		ctx.session.appendCustomEntry({customType: CUSTOM_TYPE, data: {count: priorCount + 1}});
		return state;
	},
};
```

`session` is absent (not merely empty) only for a bare unit-test config built without a durable store - every hook must treat `ctx.session` as possibly `undefined` and no-op gracefully. A `--no-session` run DOES populate `session` - entries still append and are readable for the lifetime of the process, they simply never touch disk.

## `modState` conventions

`AgentState.modState` is a `Readonly<Record<string, unknown>>` - one slot per mod, keyed by the mod's `id`:

```ts
const value = getModState<MyShape>({state, modId: 'my-mod'});     // undefined when unset
const next  = setModState({state, modId: 'my-mod', value: {...}}); // fresh AgentState
```

- **Namespacing is by convention**: write only your own `id`'s slot.
- Values must be **JSON-serializable** - `modState` is persisted with the session and survives resume. Run-scoped/volatile data (budgets, locks, in-flight promises) belongs in the mod factory's closure instead.
- `onTurnStart`/`onTurnEnd` return the whole `AgentState` (typically via `setModState`). `afterToolCall` can also persist state via its `modState` return field. `beforeToolCall` has no state channel; a before-hook that needs to accumulate data stores it in the closure and flushes it via `afterToolCall`'s `modState` or `onTurnEnd`.
- Custom data never goes into `state.messages`: the message union is closed wire types. When a mod must put something in front of the model, it emits real messages via `transformContext` (or `appendCustomMessageEntry`).

## `AgentEvent` catalog

One sync sink, fan out with `createEventBus`. Payloads are snapshots - never live references.

| Event | Fires | Payload highlights |
|---|---|---|
| `run_start` / `run_end` | run boundaries | `sessionId` / `result` |
| `turn_start` / `turn_end` | round boundaries (after onTurnStart / onTurnEnd) | `turnNumber`; end adds `hadToolCalls`, this turn's `usage` |
| `message_start` | before each model call | - |
| `text_delta`, `thinking_start/delta/end` | streaming | deltas; `thinking_end` carries full text |
| `message_update` | streaming (ModelClient-accumulated) | whole partial assistant message incl. partial tool JSON |
| `message_end` | response complete | full assistant content |
| `model_request_start/end` | bracket the inference call | `model`; end adds `usage`, raw-preferred `stopReason` |
| `tool_queued` | per call, before permission checks | `input` - the ORIGINAL input, never the rewritten one |
| `tool_denied` | permission denied | - (batch then aborts) |
| `tool_hook_blocked` | a mod's beforeToolCall blocked | `hookOutput` - **terminal for that call**: no tool_running/completed/errored follows |
| `tool_running` | execution begins (after beforeToolCall) | `description` from permissions.generateDescription |
| `tool_update` | streaming tool progress | `partial` content |
| `tool_completed` / `tool_errored` | after afterToolCall | post-hook `result` / `error` text; `afterToolCall`'s `isError` can select which one fires |
| `tool_hooks` | emitted by the user-hooks mod, before the phase's terminal tool event | `phase: 'pre'\|'post'`, `lines`, `outcome` |
| `subagent_start` / `subagent_stop` | the `agent` tool brackets a nested sub-agent run | `toolCallId`, `subagentType`; stop adds `tokensUsed` |
| `subagent_progress` | per child tool call inside a running sub-agent | `toolCallId`, `subagentType`, `toolName`, `toolInput`, `tokensUsed` |
| `api_retry` | retry loop, after 3 silent attempts | `attempt`, `error`, `delayMs` |
| `compaction_start` / `compaction_done` | compaction mod | `tokensSaved` (done, only when > 0) |
| `notice` | user-facing info/warning | `level`, `message` |
| `skill_loaded` | a skill was activated by an explicit user `/name` invocation | `name` |
| `session_titled` | the auto-generated session title was persisted | `title` |
| `permission_mode_changed` | the effective permission mode changed (shift+tab, `/plan`, enter/exit plan tools) | `mode` |
| `config_setting_changed` | a setting changed through the `config` tool | `setting`, `value`, `previousValue?` |
| `continuation_recovery` | a turn was auto-continued (pause/empty/length/intent) | `kind`, `attempt`, `maxAttempts` |
| `tool_input_coerced` | ModelClient rescued malformed (array/null) tool input | `rawType`, `recovered` |
| `tool_input_repaired` | repair layer rewrote tool input pre-execution (fires whether or not the call then ran) | `rulesFired`, `hintCount`, `receivedKeys`, `repaired` |
| `mod_error` | a mod hook threw (any phase), or a mod tool collided with an existing tool | `modId`, `hook`, `error` |
| `interrupted` | abort observed | - |
| `run_error` | non-retryable failure | the raw `Error` |

## Worked example - a write-quota mod

Blocks writes outside an allowlist, counts tool activity durably in modState, and reports at run end. Exercises the block channel, the closure-vs-modState split, and `onRunEnd`.

```ts
import type {AgentMod, AgentState} from '@commandcode/harness';
import {getModState, setModState} from '@commandcode/harness';

const MOD_ID = 'write-quota';

interface WriteQuotaState {
	readonly writesThisSession: number; // durable - survives resume
}

export function createWriteQuotaMod(options: {
	readonly allowedRoot: string;
	readonly maxWrites: number;
	readonly report: (summary: string) => void;
}): AgentMod {
	// Run-scoped tally lives in the closure; flushed into modState at turn end
	// (beforeToolCall cannot return state - see modState conventions).
	let writesThisTurn = 0;

	return {
		id: MOD_ID,

		beforeToolCall: async ({toolName, input, state}) => {
			if (toolName !== 'write_file' && toolName !== 'edit_file') return undefined;
			const path = typeof input.file_path === 'string' ? input.file_path : '';
			if (!path.startsWith(options.allowedRoot)) {
				// Block: this text becomes the tool_result the model sees, and the
				// core emits tool_hook_blocked. The run continues - the model adapts.
				return {
					block: true,
					additionalContext: `Writes outside ${options.allowedRoot} are not allowed.`,
				};
			}
			const durable = getModState<WriteQuotaState>({state, modId: MOD_ID});
			if ((durable?.writesThisSession ?? 0) + writesThisTurn >= options.maxWrites) {
				return {block: true, additionalContext: 'Write quota exhausted for this session.'};
			}
			writesThisTurn += 1;
			return undefined;
		},

		onTurnEnd: async ({state}) => {
			if (writesThisTurn === 0) return state;
			const durable = getModState<WriteQuotaState>({state, modId: MOD_ID});
			const next: AgentState = setModState({
				state,
				modId: MOD_ID,
				value: {writesThisSession: (durable?.writesThisSession ?? 0) + writesThisTurn},
			});
			writesThisTurn = 0;
			return next; // committed via onCommit at the turn boundary
		},

		onRunEnd: async ({state, result}) => {
			const durable = getModState<WriteQuotaState>({state, modId: MOD_ID});
			options.report(
				`run stopped (${result.stopReason}) after ${result.turnCount} turns; ` +
					`${durable?.writesThisSession ?? 0} writes used`,
			);
		},
	};
}
```

Wire it as a loadable mod (`cmd.hooks({...})` with the same handlers) - or, when embedding the harness, `createHarness({..., mods: [createWriteQuotaMod({...})]})`.

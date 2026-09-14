<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Mods

> **Experimental.** The `ModApi` is new and still taking shape. Surfaces and signatures can change as we learn from how mods get built - so pin what you ship, and tell us what's missing. Your feedback is what stabilizes it.

Mods are TypeScript packages that let you modify almost any behavior of Command Code. They're far more powerful than the plugin or extension APIs you'll find in other agents - though you can absolutely use one to build a plugin or an extension. Each mod is written against the `ModApi`: a plain TypeScript file that Command Code discovers on disk, loads at startup, and compiles onto its agent loop. One file can add tools the model calls, slash commands, mutating lifecycle hooks, event observers, typed-input interception, custom feed rendering, configurable flags, and model providers. Command Code's own built-in features - providers, session titling, the update notice - are built as mods against this very same API. If Command Code can do it, a mod can change it.

A loadable mod IS an `AgentMod` once loaded; the mod host just builds it from a factory file instead of a code import:

```bash
~/.commandcode/mods/review-guard.ts
        │                one file = one mod
        ▼  jiti · TypeScript, no build step
default-export factory(cmd: ModApi)
        │
        ▼  createModHost().register(...)
hooks + addTool      ──►  ONE AgentMod
                          id `mod:<name>`,
                          appended after built-ins
addCommand           ──►  /slash dispatch
                          + TUI autocomplete
on(event)            ──►  AgentEvent bus
                          (observe-only)
hooks.transformInput ──►  typed-prompt
                          interception
addProvider          ──►  ProviderModule
addRenderer          ──►  custom feed entries
queueMessage         ──►  steering drains
```

The factory receives the API bound as `cmd`. Registration verbs are all `add*` and each returns a `Disposable` - call `.dispose()` to undo exactly that one registration.

This page is the whole mods surface end to end: the quick start and loading rules first, then the full **ModApi reference**, the **hooks and events** contract, the **UI surface**, **packaging and install**, and how to **verify a mod**. Jump to any section from the sidebar.

---

## Just ask Command Code to build it

You rarely need to hand-write a mod. Command Code already knows this entire API - describe the behavior you want and it writes the mod, loads it with `--mod`, and iterates until it works. The fastest way in is to ask what's possible, then ask for the one you want:

```text copy filename="Prompt"
What kinds of mods can I build for Command Code? Show me a few examples.
```

```text copy filename="Prompt"
Build me a mod that roasts me every time I greet you with "hi".
```

```text copy filename="Prompt"
Add a /standup slash command that summarizes what changed in git today.
```

```text copy filename="Prompt"
Block any shell command containing "rm -rf" unless I confirm it first.
```

Under the hood it reads the [bundled examples](#runnable-examples) and writes against the same `ModApi` this page documents. When it's done, `cmd --mod ./your-mod.ts` tries it instantly - no build step.

### A real one, built by asking

[`cmd-mod-hi`](https://github.com/ahmadawais/cmd-mod-hi) started as exactly that prompt - "roast me when I say hi" - and shipped to npm. Install it and greet your agent:

```bash
cmd mods add npm:cmd-mod-hi -g
```

Then type `hi`, `yo`, `howdy`, or `hello` and watch it judge you; `/hi-stats` tallies the damage. The whole mod is one `transformInput` hook plus a renderer:

```ts
import type {ModApi} from '@commandcode/harness';

const roasts = [
	'"hi" — bold. groundbreaking. truly pushing the boundaries of human communication.',
	'you typed "hi" and pressed enter. your ancestors are weeping.',
	// …a dozen more
];

let greetingCount = 0;

export default function (cmd: ModApi): void {
	cmd.addRenderer('hi-roast', (data: {text: string}) => ['[cmd-mod-hi]: ' + data.text]);

	cmd.addCommand({
		name: 'hi-stats',
		description: 'See how many times you\'ve been roasted for saying "hi"',
		handler: () => ({message: `[cmd-mod-hi]: You've been roasted ${greetingCount} times.`}),
	});

	cmd.hooks({
		transformInput({text}) {
			if (/^(hi|hello|hey|yo|sup|howdy)[.!?\s]*$/.test(text.trim().toLowerCase())) {
				greetingCount += 1;
				cmd.showEntry('hi-roast', {text: roasts[greetingCount % roasts.length]});
			}
			return undefined; // let the greeting through - the roast is a side show
		},
	});
}
```

Want to understand what it's doing, or write one by hand? The rest of this page is the full reference.

---

## Quick start

Create `~/.commandcode/mods/review-guard.ts`:

```ts
import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi) {
	// Block dangerous writes (a mutating hook - see the hooks catalog).
	cmd.hooks({
		beforeToolCall: async ({toolName, input}) => {
			if (toolName !== 'shell_command') return undefined;
			const command = typeof input.command === 'string' ? input.command : '';
			if (!command.includes('rm -rf')) return undefined;
			const allow = await cmd.ui.confirm({title: 'Allow rm -rf?'});
			return allow ? undefined : {block: true, additionalContext: 'Blocked by review-guard.'};
		},
	});

	// A tool the model can call.
	cmd.addTool({
		schema: {
			name: 'count_todos',
			description: 'Count TODO markers in the repo',
			input_schema: {type: 'object', properties: {}, required: []},
		},
		run: async () => {
			const result = await cmd.exec({command: 'grep', args: ['-rc', 'TODO', '.']});
			return {ok: true, content: [{type: 'text', text: result.stdout}]};
		},
	});

	// A host slash command: /todos in the TUI.
	cmd.addCommand({
		name: 'todos',
		description: 'Summarize open TODOs',
		handler: () => ({prompt: 'List every TODO comment in this repo and rank by urgency.'}),
	});

	// Observe the event stream (never mutates - mutation is what hooks are for).
	cmd.on('turn_end', () => cmd.ui.notify('turn finished'));
}
```

It loads on the next session (or `cmd --mod ./review-guard.ts` to try it without installing). The factory may be async; jiti compiles the TypeScript at load time, so there is no build step.

---

## Where mods load from

| Location | Scope | Notes |
|---|---|---|
| built-in | shipped | compiled-in first-party mods (providers, titling, …); registered first |
| `~/.commandcode/mods/*.ts` | user | loose files, one mod each |
| `~/.commandcode/mods/<dir>/` | user | `package.json` manifest → `mods/` dir → `index.ts` |
| `<project>/.commandcode/mods/…` | project | same layout; loads only once the workspace is trusted |
| settings `mods.paths` | user/project | explicit files/dirs, relative to the settings scope |
| settings `mods.sources` | user/project | installed packages (see [Packaging and install](./packaging.md#packaging-and-install)) |
| `--mod <path>` | session | repeatable; loads ahead of installed, wins name collisions |

Dot-entries and `node_modules` are never scanned (the package registry lives under `mods/.registry/` precisely so discovery skips it). Duplicate mod names keep the first and warn. Disable without deleting via settings:

```json
{"mods": {"disabled": ["review-guard"]}}
```

---

## The one rule: hooks mutate, `on` observes

- **`cmd.hooks({...})`** is the only place that can change behavior - block a tool (`beforeToolCall`), rewrite a result (`afterToolCall`), add to the prompt (`appendSystemPrompt`), rewrite typed input (`transformInput`), force a finished run to keep going (`onStop`), react to session start/end (`onSessionStart`/`onSessionEnd`), or run post-turn work (`onRunEnd`). Multiple `hooks()` calls compose in registration order.
- **`cmd.on(event, ...)`** only observes - it cannot block or rewrite. Handlers are isolated (a throw becomes a `mod_error` event, never a crash).

If you find yourself wanting an `on` handler to stop a tool, you want a hook instead. The full mutating surface is in [Hooks and events](./hooks-and-events.md#hooks-and-events); the full registration/live surface is the [ModApi reference](./api.md#mod-api-reference).

---

## Built-in mods

Command Code's own features ride this exact API. First-party providers (`provider-anthropic` / `provider-copilot` / `provider-openai`), the update notice, and the harness-side titling and taste-learning triggers are **built-in mods**: compiled-in factories registered on the same host before any discovered mod. They are not special - they use `cmd.addProvider`, `cmd.on`, and `cmd.hooks` like any mod, appear in `cmd mods list` with source `builtin`, and honor the same disable key:

```json
{"mods": {"disabled": ["provider-copilot", "update-notice", "titling", "learning"]}}
```

Built-in mods always win a name collision against a discovered mod of the same name (the loader shadows the file with a warning), and they are compiled in - never jiti-loaded from a writable path, so they are not supply-chain surface. Structural harness mods (workspace, compaction, checkpoints) are load-bearing for correctness and stay unconditional; only the observer-style built-ins above are disable-able.

---

## Runnable examples

Command Code ships runnable, single-file example mods and reads them itself. You don't need to find them on disk - just ask:

```
build a mod that blocks dangerous shell commands
```

Command Code opens the matching example and works from it. Every example loads through the real mod loader in CI on every test run, so what it copies is proven to load.

Ask for any of these by name or by what you want:

| File | Shows |
|---|---|
| `slash-command.ts` | `addCommand` - a `/command` returning `{prompt}` or `{message}` |
| `custom-tool.ts` | `addTool` - a model-callable tool with `run` + `exec` |
| `block-dangerous-commands.ts` | `hooks.beforeToolCall` - block/allow with a confirm |
| `input-shortcuts.ts` | `hooks.transformInput` - rewrite / handle typed input |
| `observe-events.ts` | `on(event)` + the cross-mod `events` bus |
| `custom-entry-renderer.ts` | `addRenderer` + `showEntry` - styled feed rows |
| `flags-and-options.ts` | `addFlag` / `getFlag` + `--mod-option` |
| `lifecycle-hooks.ts` | `hooks.onStop` (Stop) + `onSessionStart`/`onSessionEnd` + `afterToolCall` `isError` + `on('subagent_start'/'subagent_stop')` |
| `kitchen-sink.ts` | every capability in one annotated file |

---

## Boundaries (deliberate)

- **Hooks mutate, `on` observes.** Event handlers cannot block tools or rewrite context; that is what `cmd.hooks` is for.
- **Project mods are trust-gated** like project skills: they load only after the workspace trust prompt, because a mod is arbitrary code. User-scope and `--mod` mods always load. There is no sandbox - install packages you trust. Package installs run npm with `--ignore-scripts` (mods are jiti-loaded TypeScript; they need no build step, so lifecycle scripts are pure attack surface).
- **Print mode loads user-scope and `--mod` mods only**, with the ui bridge degraded to headless defaults (confirm → false, select/input → undefined - never auto-approved; `setStatus`/`widget` render nowhere, and `cmd.ui.capabilities.status` is false). Project mods stay out of headless runs because print never shows a trust prompt; pass `--dangerously-skip-permissions` to opt a repo's own mods into a headless run (CI).
- **Mod-queued messages don't echo in the feed** the way typed input does - they land in the transcript and steer the model, but the visible record is the model's response.
- **Rendering is line-based, not component-based.** `cmd.addRenderer` returns styled text lines the host prints as feed rows; mods do not mount React components into the TUI. That keeps renderers host-agnostic (the same mod renders in any future host) and a crashing renderer degrades to a warning notice, never a broken screen.
- **Reload is the `/reload` path.** Mods load once per process; `/reload` restarts the process, which re-discovers and re-imports every mod (jiti caches nothing between loads). There is no in-place hot swap.
- **Session controls stop at the harness surface.** `cmd.sessions` covers what the live harness owns (compact, tree, navigate, labels); creating/switching/forking sessions is host lifecycle, not harness state, and stays with the host UI.

Embedders wire the same machinery directly: `createModHost` + `loadMods` + `createHarness({modHost})` (or `createNodeHarnessSession({modHost})`), all exported from `@commandcode/harness`.

---

## The reference sections

The rest of this page is the complete reference, in order:

- [ModApi reference](./api.md#mod-api-reference): every field, registration verb, and live method.
- [Hooks and events](./hooks-and-events.md#hooks-and-events): the mutating lifecycle, the `AgentEvent` catalog.
- [UI surface](./ui.md#ui-surface): dialogs, footer status, editor widgets, custom feed rendering.
- [Packaging and install](./packaging.md#packaging-and-install): `cmd mods add`, manifests, filtering, scopes.
- [Verify a mod](./verify.md#verify-a-mod): load it, list it, test it, ship it.

// Example mod: the KITCHEN SINK — every ModApi capability in one file, so you can see how
// the pieces fit together. In practice a mod does one job; this one is a tour.
//
// A mod is a TypeScript file that default-exports a factory. The factory receives the API
// bound as `cmd` and registers everything up front. It may be async (await setup work
// before returning). Every registration returns a Disposable — call .dispose() to undo
// exactly that one registration.

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	// ── identity ──────────────────────────────────────────────────────────────────────
	// cmd.name is this mod's name; cmd.cwd is the workspace root.

	// ── flags: configurable options (cmd --mod-option strict=true) ──────────────────────
	cmd.addFlag('strict', {type: 'boolean', default: false});

	// ── hooks: the MUTATING lifecycle (compose in registration order) ───────────────────
	cmd.hooks({
		// Add to the system prompt every request.
		appendSystemPrompt: () => 'Prefer small, reviewable diffs.',

		// Rewrite or block a tool call before it runs.
		beforeToolCall: async ({toolName, input}) => {
			if (toolName !== 'shell_command') return undefined;
			const command =
				typeof input.command === 'string' ? input.command : '';
			if (
				cmd.getFlag('strict') === true &&
				command.includes('--no-verify')
			)
				return {
					block: true,
					additionalContext: 'strict mode forbids --no-verify',
				};
			return undefined;
		},

		// Inspect or rewrite a tool result after it runs.
		afterToolCall: async ({result}) => {
			if (typeof result !== 'string' || !result.includes('DEPRECATED'))
				return undefined;
			return {
				additionalContext:
					'A tool result mentioned DEPRECATED — flag it.',
			};
		},

		// Intercept typed input before the model sees it.
		transformInput: ({text}) =>
			text.trim() === '#note'
				? {action: 'handled', message: 'noted.'}
				: {action: 'continue'},

		// Fires once the run completes (post-turn work).
		onRunEnd: async () => {
			cmd.showEntry('summary', {tools: 'see feed'});
		},
	});

	// ── a tool the model can call ───────────────────────────────────────────────────────
	cmd.addTool({
		schema: {
			name: 'repo_size',
			description: 'Report the number of tracked files.',
			input_schema: {type: 'object', properties: {}, required: []},
		},
		readOnly: true,
		run: async () => {
			const {stdout} = await cmd.exec({
				command: 'git',
				args: ['ls-files'],
			});
			const count = stdout.split('\n').filter(Boolean).length;
			return {
				ok: true,
				content: [{type: 'text', text: `${count} tracked files`}],
			};
		},
	});

	// ── a slash command ─────────────────────────────────────────────────────────────────
	cmd.addCommand({
		name: 'sink-status',
		description: 'Show mod status',
		handler: () => ({message: `strict = ${cmd.getFlag('strict')}`}),
	});

	// ── a custom feed renderer + the entry it renders ──────────────────────────────────
	cmd.addRenderer('summary', data => [`◆ summary: ${JSON.stringify(data)}`]);

	// ── observe events (never mutate here) ──────────────────────────────────────────────
	cmd.on('tool_errored', () => cmd.ui.notify('a tool errored', 'warning'));

	// ── live surfaces (usable any time after the harness binds) ─────────────────────────
	// cmd.ui.notify / confirm / select / input — talk to the user.
	// cmd.queueMessage({content, deliverAs}) — steer the running loop or queue a follow-up.
	// cmd.session — durable custom-entry persistence (undefined until bound).
	// cmd.sessions — compact(), tree(), leafId(), navigateTree(...), setLabel(...).
	// cmd.setModel / setEffort / setSessionName.
	// cmd.getAllTools / getActiveTools / setActiveTools — a mod-managed tool filter.
	//
	// Example: on the first run, greet once via a queued steering message.
	let greeted = false;
	cmd.on('run_start', () => {
		if (greeted) return;
		greeted = true;
		cmd.queueMessage({content: 'Remember to keep the change focused.'});
	});
}

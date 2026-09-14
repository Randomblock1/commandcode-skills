// Example mod: the cross-agent lifecycle hooks — Stop, SessionStart/End, PostToolUseFailure,
// and SubagentStart/Stop. Together with beforeToolCall (PreToolUse), afterToolCall (PostToolUse),
// and transformInput (UserPromptSubmit), a mod can register a handler for every lifecycle hook
// point the major coding agents expose. See harness/docs/mods-api.md#cross-agent-hook-parity.

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	// SessionStart / SessionEnd — once per session, with typed source/reason the bare
	// `session_start` / `session_shutdown` events don't carry.
	cmd.hooks({
		onSessionStart: ({source}) => {
			cmd.ui.notify(`session started (${source})`);
		},
		onSessionEnd: ({reason}) => {
			cmd.ui.notify(`session ending (${reason})`);
		},
	});

	// PostToolUse vs PostToolUseFailure — the afterToolCall hook's `isError` param tells you
	// whether the tool's own execution failed, so you can react only to failures.
	let toolFailures = 0;
	cmd.hooks({
		afterToolCall: async ({toolName, isError}) => {
			if (isError) {
				toolFailures += 1;
				return {
					additionalContext: `(${toolName} failed — ${toolFailures} failure(s) so far this run)`,
				};
			}
			return undefined;
		},
	});

	// The Stop hook — force-continue a run that would otherwise finish. Here: keep going until
	// the model says it is done, but never more than a couple of nudges (the loop also caps this).
	let nudges = 0;
	cmd.hooks({
		onStop: async ({lastAssistantText}) => {
			if (/\bdone\b/i.test(lastAssistantText) || nudges >= 2) {
				return {continue: false};
			}
			nudges += 1;
			return {
				continue: true,
				reason: 'If the task is complete, say "done". Otherwise keep working.',
			};
		},
	});

	// SubagentStart / SubagentStop — observe the `task` tool bracketing a nested sub-agent run.
	cmd.on('subagent_start', event => {
		if (event.type === 'subagent_start') {
			cmd.ui.notify(`sub-agent started: ${event.subagentType}`);
		}
	});
	cmd.on('subagent_stop', event => {
		if (event.type === 'subagent_stop') {
			cmd.ui.notify(
				`sub-agent ${event.subagentType} done (~${event.tokensUsed} tokens)`,
			);
		}
	});
}

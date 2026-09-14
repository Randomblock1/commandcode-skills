// Example mod: observe the event stream (never mutate).
//
// cmd.on subscribes to any AgentEvent type plus the host lifecycle events
// `session_start` / `session_shutdown`. Observers CANNOT block tools or rewrite context —
// that is what cmd.hooks is for. The boundary is deliberate: hooks mutate, `on` observes.
//
// Handlers are isolated: a throw becomes a `mod_error` event, never a crashed session.
// Every cmd.on returns a Disposable — call .dispose() to stop observing.
//
// Common event types: run_start, run_end, turn_start, turn_end, model_request_start,
// model_request_end, tool_running, tool_completed, tool_errored, notice.

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	let toolCalls = 0;

	cmd.on('tool_completed', () => {
		toolCalls += 1;
	});

	cmd.on('run_end', () => {
		cmd.ui.notify(`turn finished — ${toolCalls} tool call(s) this session`);
	});

	// The cross-mod bus lets mods talk to each other without knowing about one another.
	cmd.on('tool_errored', () => {
		cmd.events.emit('tool-failed', {at: toolCalls});
	});
}

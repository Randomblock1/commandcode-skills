// Example mod: a policy guard that can BLOCK a tool call.
//
// cmd.hooks are the mutating lifecycle. `beforeToolCall` runs before every tool executes
// and may:
//   return { block: true, additionalContext }  → the call never runs; the model is told why
//   return { input: rewritten }                 → the call runs with rewritten input
//   return undefined                            → allow unchanged
//
// This is where you'd enforce org policy, sandbox paths, or require confirmation. The guard
// below refuses `rm -rf` and force-pushes unless the user confirms in the TUI.

import type {ModApi} from '@commandcode/harness';

const DANGEROUS = [
	/\brm\s+-rf\b/,
	/\bgit\s+push\b.*--force\b/,
	/\bgit\s+push\s+-f\b/,
];

export default function (cmd: ModApi): void {
	cmd.hooks({
		beforeToolCall: async ({toolName, input}) => {
			if (toolName !== 'shell_command') return undefined;
			const command =
				typeof input.command === 'string' ? input.command : '';
			if (!DANGEROUS.some(pattern => pattern.test(command)))
				return undefined;

			const allow = await cmd.ui.confirm({
				title: 'Dangerous command',
				message: `Allow: ${command}`,
			});
			if (allow) return undefined;
			return {
				block: true,
				additionalContext:
					'Blocked by the safety mod. Ask the user to run this manually if it is really intended.',
			};
		},
	});
}

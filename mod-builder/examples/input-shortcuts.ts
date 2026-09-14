// Example mod: intercept what the user types before the model sees it.
//
// hooks.transformInput runs on every typed user prompt. Return:
//   { action: 'transform', text }        → rewrite the prompt (handlers chain; the next
//                                           mod sees your rewrite)
//   { action: 'handled', message? }       → consume the prompt entirely; no model turn runs
//                                           (an optional info row renders in its place)
//   { action: 'continue' } / undefined    → pass through unchanged
//
// Automated turns, meta messages, slash commands, and image-carrying prompts never reach
// transformInput — it only sees text the USER typed. A throwing handler is skipped, never
// blocking the prompt.

import type {ModApi} from '@commandcode/harness';

const SHORTCUTS: Record<string, string> = {
	'#ship':
		'Run the test suite, then the linter, then summarize what is left before this can ship.',
	'#review': 'Review the current git diff for bugs and risky changes.',
};

export default function (cmd: ModApi): void {
	cmd.hooks({
		transformInput: ({text}) => {
			const trimmed = text.trim();

			// A local slash-like command handled entirely by the mod.
			if (trimmed === '#help') {
				return {
					action: 'handled',
					message: `Shortcuts: ${Object.keys(SHORTCUTS).join(', ')}`,
				};
			}

			const expansion = SHORTCUTS[trimmed];
			if (expansion) return {action: 'transform', text: expansion};

			return {action: 'continue'};
		},
	});
}

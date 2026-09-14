// Example mod: render a custom entry into the feed with your own styling.
//
// Two pieces:
//   cmd.addRenderer(type, data => lines)  → registers how a custom entry type prints
//   cmd.showEntry(type, data)             → pushes an entry of that type into the live feed
//
// Rendering is line-based: the renderer returns styled terminal lines (use raw ansi escape
// codes, picocolors, or @commandcode/tui helpers). Unrendered types pretty-print as JSON.
// The TUI wires the feed sink; headless runs drop entries. A throwing renderer degrades to
// a warning notice, never a broken screen.
//
// Pair showEntry with cmd.session.appendCustomEntry when the data should also persist to
// the transcript.

import type {ModApi} from '@commandcode/harness';

const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export default function (cmd: ModApi): void {
	cmd.addRenderer('score', data => {
		const {label, value} = data as {label: string; value: number};
		const bar = '█'.repeat(Math.max(0, Math.min(10, value)));
		return [`${GREEN}${label}${RESET} ${bar} ${DIM}${value}/10${RESET}`];
	});

	// Show a scored entry whenever a run finishes (contrived — a real mod would compute it).
	cmd.on('run_end', () => {
		cmd.showEntry('score', {label: 'confidence', value: 8});
	});
}

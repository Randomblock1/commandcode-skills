// Example mod: a slash command.
//
// Drop this file at ~/.commandcode/mods/standup.ts and `/standup` appears in the TUI
// slash menu. A command handler returns DATA, never a live callback:
//   { prompt }  → submitted as an automated turn (the model runs it)
//   { message } → rendered as an info row (no model turn)
//   nothing     → pure side effect (e.g. it only called cmd.ui / cmd.exec)
//
// The handler receives { args, ui, cwd, exec } — `args` is the raw text after the
// command name (`/standup since=yesterday` → args === "since=yesterday").

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	cmd.addCommand({
		name: 'standup',
		description: 'Summarize what changed today for standup',
		argumentHint: '[since]',
		handler: ({args}) => {
			const since = args.trim() || 'this morning';
			return {
				prompt: `Summarize the git commits and working changes since ${since} as three standup bullets: done, in-progress, blockers.`,
			};
		},
	});

	// A second command that renders an info row instead of running the model.
	cmd.addCommand({
		name: 'where',
		description: 'Print the current working directory',
		handler: ({cwd}) => ({message: `You are in ${cwd}`}),
	});
}

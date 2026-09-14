// Example mod: declare configurable flags.
//
// cmd.addFlag declares a named option with a type and default. The user sets it at launch
// with repeatable `--mod-option name=value`:
//   cmd --mod-option verbose=true --mod-option reviewer=alice
//
// Read the live value with cmd.getFlag(name). Boolean-declared flags coerce "true"/"false"
// text to a boolean; string flags keep the text verbatim. A flag only belongs to the mod
// that declared it.

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	cmd.addFlag('verbose', {
		type: 'boolean',
		default: false,
		description: 'Announce every finished turn.',
	});
	cmd.addFlag('reviewer', {
		type: 'string',
		default: 'the team',
		description: 'Who to address review summaries to.',
	});

	cmd.on('run_end', () => {
		if (cmd.getFlag('verbose') !== true) return;
		cmd.ui.notify(`turn done — summary is for ${cmd.getFlag('reviewer')}`);
	});
}

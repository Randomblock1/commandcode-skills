// Example mod: a tool the MODEL can call.
//
// cmd.addTool registers a ToolModule — the same shape the built-in tools use. The model
// sees the schema and decides when to call it; `run` receives the parsed input plus the
// harness Runtime (filesystem + shell), and returns a result:
//   { ok: true,  content: [{type: 'text', text}] }  → success, text goes back to the model
//   { ok: false, error }                             → the model sees the error and can retry
//
// Mark `readOnly: true` if the tool never mutates — it then stays available in plan mode
// and takes the read-only permission fast-path.

import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	cmd.addTool({
		schema: {
			name: 'count_todos',
			description:
				'Count TODO/FIXME markers across the repository and report the total.',
			input_schema: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description:
							'Directory to search (defaults to the repo root).',
					},
				},
				required: [],
			},
		},
		readOnly: true,
		run: async ({input}) => {
			const path = typeof input.path === 'string' ? input.path : '.';
			const result = await cmd.exec({
				command: 'grep',
				args: ['-rIoE', 'TODO|FIXME', path],
			});
			const count = result.stdout
				.split('\n')
				.filter(line => line.length > 0).length;
			return {
				ok: true,
				content: [
					{
						type: 'text',
						text: `${count} TODO/FIXME markers in ${path}`,
					},
				],
			};
		},
	});
}

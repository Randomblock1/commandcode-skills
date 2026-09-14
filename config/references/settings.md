<!-- Generated from the Command Code configuration registry. Docs: https://commandcode.ai/docs -->

# Settings reference

The executable registry is authoritative. Run `cmd config list --scope effective --json` before changing a value.

| Key | Scope | Type | Values | Description |
| --- | --- | --- | --- | --- |
| `model` | user | string | known model id | The default main-loop model for new sessions. A running session keeps its current model. Use /model to change the running session. |
| `permissions.defaultMode` | user | enum | `default`, `plan`, `auto-accept`, `dont-ask` | Default permission mode for tool usage. A long-lived host may also apply the change to its current session. "bypass" cannot be set here. |
| `theme` | user | enum | `dark`, `light`, `auto` | Terminal color theme (same setting as /theme). Auto automatically detects your terminal background and uses light or dark to match. |
| `compact-mode` | user | enum | `default`, `fast` | Auto-compact aggressiveness when context fills up (same setting as /compact-mode). |
| `tree-filter-mode` | user | enum | `default`, `no-tools`, `user-only`, `labeled-only`, `all` | Default filter when opening /tree. |
| `on-demand-tool-descriptions` | user | boolean | `true`, `false` | Explain shell commands on permission prompts only when you press ctrl+e (default). Turn off to generate every explanation upfront. |
| `image-vision` | user | enum | `ask`, `enabled`, `disabled` | Let a text-only model read attached images by describing them with the vision model ("Ask on first use" prompts the first time you attach an image). |
| `branch-summary-skip-prompt` | user | boolean | `true`, `false` | Never ask about summarizing when switching branches in /tree. |
| `default-export-format` | user | enum | `html`, `jsonl`, `md` | Format a bare /export (no format or path) writes — an explicit /export html\|jsonl\|md\|<path> always overrides. |
| `default-share-gist-format` | user | enum | `html`, `jsonl`, `md` | Format a bare /share gist (no format argument) posts — an explicit /share gist html\|jsonl\|md always overrides. |
| `taste-learning` | user | boolean | `true`, `false` | Learn your coding style from your sessions, user-wide (same setting as /taste). |
| `taste-learning-project` | project | enum | `inherit`, `enabled`, `disabled` | Learn your coding style from this project only (same setting as /taste). |
| `feature-model:titleGeneration` | user | enum | known model id or `default` | Names your sessions after the first exchange. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:compaction` | user | enum | known model id or `default` | Summarizes long conversations when context fills up. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:toolDescription` | user | enum | known model id or `default` | Writes the one-line command summaries on permission prompts. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:tasteLearning` | user | enum | known model id or `default` | Learns your coding style from your sessions. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:tasteOnboarding` | user | enum | known model id or `default` | Streams live observations during onboarding. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:branchSummarization` | user | enum | known model id or `default` | Summarizes an abandoned branch when you jump away from it. Value: a model id, or "default" to reset to the curated default. |
| `feature-model:vision` | user | enum | known model id or `default` | Describes attached images so a text-only model can read them. Value: a model id, or "default" to reset to the curated default. |

Commands:

```text
cmd config list [--scope effective|user|project] [--json]   # alias: cmd config ls
cmd config get <key> [--scope effective|user|project] [--json]
cmd config set <key> <value> --scope user|project [--json]
cmd config default <key> [--json]                            # reset to the built-in default
```

Values may be JSON scalars or plain strings. The command refuses unknown keys, invalid enum values, locked settings, invalid JSON files, and unsupported scopes. `default` writes the setting's built-in fallback value using the setting's own scope. On Windows the binary is `cmdc` (bare `cmd` opens the Windows shell): `cmdc config list`.

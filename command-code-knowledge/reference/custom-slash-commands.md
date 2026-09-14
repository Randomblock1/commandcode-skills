<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Slash Commands

Command Code ships with **over 60 built-in slash commands** covering sessions, context, permission modes, models, billing, and everything in between - and you can extend the set with your own custom commands, skills, and mod-added commands.

## How the slash menu works

Type `/` at the start of the input to open the command menu:

- **Filtering** - as you type, rows are ranked by match quality: a command whose name starts with your query ranks highest, then commands containing it, then description matches. The list re-sorts on every keystroke.
- **Exact-match highlighting** - the input text stays plain while you type a partial name; it only turns accent-colored once it names a real command (a half-typed `/mod` stays plain, `/model` lights up).
- **Aliases on canonical rows** - an alias is not a second menu row. `/new` resolves to `/clear` everywhere, and the single canonical row advertises it as `/clear (new)`. Typing the alias still surfaces and ranks that row.
- **Navigation** - `↑`/`↓` move the selection, `Enter` runs the selected command, `Tab` or `→` inserts it into the input with a trailing space so you can type arguments, `Esc` closes the menu.
- **Dynamic rows** - custom commands, mod commands, and skills load asynchronously; built-ins render first and the dynamic rows appear as discovery settles.

---

## Built-in commands

Every built-in command, grouped by area. Aliases are shown in parentheses on the canonical command; optional arguments in `[brackets]`, alternatives separated by `|`.

### Sessions

| **Command**                    | **Description**                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/clear` (`/new`)              | Start a new session with empty context; previous stays on disk, resumable with `/resume`              |
| `/resume` (`/sessions`)        | Resume a past conversation                                                                            |
| `/rename [name]`               | Rename the current session                                                                            |
| `/name [name]`                 | Alias of `/rename`; bare `/name` shows the current name                                               |
| `/fork [name]`                 | Fork the conversation into a new session                                                              |
| `/clone`                       | Clone the current branch into a new session and switch to it (never takes an argument)                |
| `/tree`                        | Browse the session tree and jump to any point in it                                                   |
| `/rewind`                      | Restore to a previous checkpoint (press Esc twice)                                                    |
| `/session-file`                | Show the current session id and session file path                                                     |
| `/export [html\|jsonl\|md]` or `/export <path>` | Export the session - a bare format keyword or a file path; HTML is the default format |
| `/share [gist [html\|jsonl\|md]]` | Share the conversation - bare `/share` copies a link; `/share gist` posts a secret GitHub gist     |
| `/unshare`                     | Stop sharing conversation                                                                             |
| `/exit` (`/quit`)              | Exit Command Code                                                                                     |
| `/reload`                      | Restart Command Code and resume this session (applies a staged update)                                |

### Context & compaction

| **Command**     | **Description**                              |
| --------------- | -------------------------------------------- |
| `/compact`      | Compact the conversation history             |
| `/compact-mode` | Select a compact mode to compact sessions    |
| `/context`      | Show context window usage and breakdown      |
| `/memory`       | Manage Command Code memory                   |
| `/init`         | Initialize AGENTS.md for this project        |

### Modes & planning

| **Command**                          | **Description**                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `/mode [default\|auto-accept\|plan]` | Show or switch the permission mode; bare `/mode` prints the current mode           |
| `/mode:default`                      | Switch to default mode (prompt before edits/commands)                              |
| `/mode:auto-accept`                  | Switch to auto-accept mode (accept edits automatically)                            |
| `/mode:plan`                         | Switch to plan mode (read-only, no side effects)                                   |
| `/plan [task]`                       | Enter plan mode; `/plan <task>` plans that task                                    |
| `/plans [name]`                      | Browse, review, and annotate saved plans; bare `/plans` opens the browser          |
| `/plan-review`                       | Open this session's latest plan in review                                          |
| `/goal <objective>\|clear\|status`   | Set an objective for the agent to work towards autonomously                        |
| `/todos`                             | Manage the session todo list - `c` completes the selected item, `x` removes it, `a` clears the list |
| `/review [pr-number]`                | Review a pull request                                                              |
| `/pr-comments`                       | Fetch all PR comments for current branch                                           |

	Yolo (bypass permissions) mode is deliberately **not** switchable via
	`/mode` - slash commands are agent-invokable, so a mid-session route into
	bypass would let the model disable its own permission prompts. It is only
	reachable through the explicit `--yolo` launch flag, which also adds it to
	the shift+tab mode cycle.

### Models & providers

| **Command**       | **Description**                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `/model [id]`     | Switch between Command Code models - `/model <id>` applies directly, bare opens a picker |
| `/effort [level]` | Set reasoning effort for the current model (levels depend on the model)                  |
| `/connect`      | Connect to AI providers. Command Code, [BYOK providers](./byok.md) and API keys |
| `/login`          | Log in to Command Code or a provider                                                     |
| `/logout`         | Log out of Command Code or a provider                                                    |

### Extensibility & integrations

| **Command**                                        | **Description**                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/skills`                                          | Browse and open agent skills                                                      |
| `/agents`                                          | Manage agent configurations                                                       |
| `/mcp`                                             | Manage MCP server connections                                                     |
| `/design [mode]`                                   | Design partner: audit, build, compose, and ship UI - bare `/design` browses modes |
| `/import [claude\|codex\|cursor\|pi\|opencode\|gemini]` | Import your setup from another coding agent; bare `/import` imports from all sources |
| `/taste`                                           | Manage Taste learning and usage                                                   |
| `/learn-taste`                                     | Learn taste from sessions with other coding agents (Claude Code, Cursor, etc)     |
| `/ide`                                             | Connect IDE to share your open file and selected lines                            |
| `/terminal-setup`                                  | Setup VSCode keybindings (only shown in the menu inside a VS Code terminal)       |

### Workspace

| **Command**                                | **Description**                                    |
| ------------------------------------------ | -------------------------------------------------- |
| `/add-dir <directory>`                     | Add directory to workspace context                 |
| `/worktree [name\|list\|remove <name>]`    | Create, list, or switch git worktrees              |

### Billing & account

| **Command** | **Description**                              |
| ----------- | -------------------------------------------- |
| `/usage`    | Display credits, plan, and usage metrics     |
| `/upgrade`  | Open billing page to upgrade your plan       |
| `/extra`    | Open billing page to buy on-demand credits   |

### Utilities

| **Command**        | **Description**                                                |
| ------------------ | -------------------------------------------------------------- |
| `/help`            | Show available shortcuts                                       |
| `/hotkeys`         | Show all keyboard shortcuts                                    |
| `/config [query]`  | Search and change settings                                     |
| `/theme [dark\|light\|auto]` | Switch themes; `auto` matches your terminal background |
| `/status`          | Show comprehensive environment status                          |
| `/changelog [all]` | See what's new in Command Code (`all` for the full history)    |
| `/learn`           | Open the Command Code learn hub in your browser                |
| `/update`          | Update Command Code to the latest version                      |
| `/feedback [title]` (alias `/issue`) | Report a bug or share feedback; opens a prefilled GitHub issue |
| `/trace`           | Copy the current trace id; required for support debugging      |
| `/copy`            | Copy the last response to the clipboard                        |

---

## Command behavior

### Bare invocations that open a picker

`/model`, `/effort`, and `/theme` each take an optional value (`/model gpt-5`, `/effort high`, `/theme dark`) that applies directly as a one-shot. But unlike other optional-value commands, running them **bare** doesn't perform a default action - it opens an interactive picker immediately. Bare `/mode` also runs immediately, printing the current mode and the available switches (`/mode:default`, `/mode:auto-accept`, `/mode:plan` - or press shift+tab to cycle).

`/effort` only opens its selector when the current model supports reasoning effort levels; otherwise it prints a notice that effort isn't supported for that model.

`/theme` offers three values. `dark` and `light` pin a palette; `auto`, the default, automatically detects your terminal's background color at startup (OSC 11, falling back to `COLORFGBG`) and uses light or dark to match. A terminal that won't report its background falls back to dark.

### Commands with meaningful default actions when bare

Some optional-argument commands do something useful with no argument instead of opening a picker: bare `/share` creates a share link, bare `/import` imports from all detected sources, bare `/export` exports in the default format, bare `/goal` (or `/goal status`) shows the current goal, bare `/name` shows the current session name, and bare `/plan` enters plan mode without a task.

### Safe while the agent is busy

Most commands are **blocked mid-turn** - mode flips, session switches, model changes, compaction, and anything that would race an active turn waits until the agent finishes. A deliberate set of read-only or local commands stays available while a turn is running:

- `/trace` - capture the live trace id of the running turn (its main purpose)
- `/session-file` - read-only session facts
- `/copy` - clipboard only
- `/todos` (also `ctrl+x`) - edits local todo state, most useful mid-turn while a plan is being driven
- `/exit` / `/quit` - always available
- `/goal clear` - stops the goal loop; the current step finishes, then the loop stops. Setting a **new** goal mid-turn is refused with a busy notice.

Most other commands - `/clear`, `/mode`, `/plan`, `/model`, `/compact`, `/worktree`, `/resume`, `/login`, and the like - report busy and ask you to wait for the current turn (or press Ctrl+C). (`/review` is an exception: it runs mid-turn.)

### `/goal` in detail

`/goal <objective>` sets an objective (up to a length limit) and arms an autonomous loop capped at a maximum number of turns. `/goal status` (or bare `/goal`) shows the active goal and progress; `/goal clear` clears it. `/goal resume` and `/goal pause` are reserved but not available yet.

---

## Custom slash commands

Custom slash commands let you save frequently used prompts as markdown files. Define a command once, then run it anytime with dynamic arguments.

```bash
/<command-name> [arguments]
```

The command name comes from the markdown filename (without the `.md` extension).

### Locations

| **Type**  | **Location**               | **Menu label** | **Scope**             |
| --------- | -------------------------- | -------------- | --------------------- |
| Project   | `.commandcode/commands/`   | `(project)`    | This project only     |
| User      | `~/.commandcode/commands/` | `(user)`       | All your projects     |

```bash
# Project-level command
mkdir -p .commandcode/commands
echo "Generate unit tests for this code following our testing conventions" > .commandcode/commands/test.md

# User-level command
mkdir -p ~/.commandcode/commands
echo "I am currently being onboarded on this project, help me understand it." > ~/.commandcode/commands/understand.md
```

The file's full trimmed body is the prompt that runs; the slash menu shows its first meaningful line (skipping YAML frontmatter and markdown markers, truncated to ~80 chars) plus the location label.

### Namespacing

Organize commands in subdirectories to any depth. The subdirectory appears in the description label but does **not** affect the command name:

| **File Location**                             | **Command**  | **Menu shows**        |
| --------------------------------------------- | ------------ | --------------------- |
| `.commandcode/commands/frontend/component.md` | `/component` | `(project: frontend)` |
| `~/.commandcode/commands/git/commit.md`       | `/commit`    | `(user: git)`         |
| `.commandcode/commands/simple.md`             | `/simple`    | `(project)`           |

	Because the name comes from the filename only, `frontend/button.md` and
	`backend/button.md` both create `/button` and will conflict. On a
	user/project name collision, the user copy wins at dispatch (user
	directories are scanned first), though both rows still appear in the menu.
	Use unique filenames to avoid this.

### Argument templating

Placeholders in the command body are replaced with your arguments in a single pass (substituted text is never re-scanned, so an argument containing `$1` lands literally):

| **Placeholder**       | **Description**                                                        |
| --------------------- | ---------------------------------------------------------------------- |
| `$ARGUMENTS` / `$@`   | All arguments as a single string (`${ARGUMENTS}` / `${@}` work too)    |
| `$1`, `$2`, … `$N`    | Positional arguments, 1-indexed (there is no `$0`); missing args → `""` |
| `${1}`, `${2}`, …     | Braced positional - safe directly next to other text (`v${1}.0`)       |
| `${N:-default}`       | Nth argument, or `default` when missing/empty                          |
| `${@:-default}`       | All arguments, or `default` when none were provided                    |
| `${@:N}`              | Arguments from the Nth position to the end                             |
| `${@:N:L}`            | `L` arguments starting at the Nth position (clamped to what exists)    |

Arguments split on whitespace, respecting single and double quotes:

```bash
/create-component React "Login Form" "email validation and submit handler"
# $1 → React    $2 → Login Form    $3 → email validation and submit handler
```

**Example** (`.commandcode/commands/commit.md`):

```markdown
Write a commit of type "${1:-fix}" with message: ${@:2}
```

```bash
/commit feat add slash command reference
# → Write a commit of type "feat" with message: add slash command reference
```

Edge cases: an out-of-range slice (`${@:9}` with three args) expands to an empty string; an unrecognized `${...}` expression (e.g. a literal `${HOME}`) is left untouched so shell/env-style text survives; a template with no placeholders passes through unchanged.

---

## Dispatch precedence

When multiple sources define the same name, dispatch resolves in this order - first writer wins:

1. **Built-in** commands (the full set, including any the menu hides)
2. **Mod** commands (added by active mods)
3. **Custom** commands (`.commandcode/commands/`, `~/.commandcode/commands/`)
4. **Skills**

So a custom command can never override a built-in, and a skill shadowed by any of the above resolves to its owner. Shadowed skills still render in the menu with a `- shadowed by /<name>` note so you know they exist, and they run under the `skill:` namespace: `/skill:<name>` bypasses this whole ladder and only ever resolves to a skill. Lookup is case-insensitive (`/Reload` resolves to `/reload`).

### Skill invocation

Installed skills are invocable as `/<skill-name>` and appear in the menu with a `[skill]` badge. A skill's `argument-hint` frontmatter leads its menu description (e.g. `/pr-desc  [skill] <branch> - Generate a PR…`), and skills marked `user-invocable: false` stay model-invocable but never appear in the `/` menu. Duplicate skill names dedupe with project taking precedence over global.

### Mod commands

Active mods can register their own slash commands; they slot in between built-ins and custom commands in both the menu and dispatch. Discovery is fault-tolerant - a broken commands directory or unreadable skill never breaks the menu; each source just degrades to empty.

---

## Next steps

- Explore the [CLI Reference](https://commandcode.ai/docs/reference/cli) for flags and subcommands
- Create your first custom command and try it out
- Join our [Discord community](https://commandcode.ai/discord) for feedback, requests, and support.

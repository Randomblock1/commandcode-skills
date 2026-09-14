---
name: skill-builder
description: Author a new Agent Skill for Command Code end to end — scaffold the directory, write valid SKILL.md frontmatter, structure the instructions for progressive disclosure, and verify the skill loads. Use when the user wants to create, build, or generate a skill, turn a repeated workflow, prompt, or set of scripts into a reusable skill, or fix a skill that fails validation.
---

# Skill Builder

You are turning a workflow the user cares about into an Agent Skill: a directory with a
`SKILL.md` manifest that any agent implementing the Agent Skills standard
(https://agentskills.io/specification) can discover and load on demand. Follow the steps in
order; each produces something the next step consumes.

## 1. Pin down the job

Before writing anything, get concrete answers to three questions — from the conversation if
they are already there, otherwise ask:

- **What does the skill do?** One capability per skill. If the user describes two loosely
  related jobs (e.g. "release notes and versioning"), propose splitting them.
- **When should an agent reach for it?** The trigger phrases and task shapes. These become the
  `description`, which is the only thing the model sees before deciding to load the skill.
- **What does it need?** Scripts, templates, reference documents, external tools. These decide
  whether the skill is a single SKILL.md or needs supporting files.

## 2. Choose name and location

Name rules (enforced at load time — a violation means the skill is skipped with a warning):

- 1–64 characters; only lowercase letters `a-z`, digits `0-9`, and hyphens
- No leading, trailing, or consecutive hyphens
- **Must equal the directory name** — `my-skill/SKILL.md` declares `name: my-skill`

Prefer a verb-or-domain name that survives out of context: `changelog-writer` beats `helper`.

Location decides who gets the skill:

| Location | Scope |
|----------|-------|
| `.commandcode/skills/<name>/` at the project root | everyone in this repo (commit it) |
| `~/.commandcode/skills/<name>/` | this user, every project |
| `.agents/skills/<name>/` or `~/.agents/skills/<name>/` | same scopes, shared with other Agent-Skills tools |

Default to the project location when the workflow is repo-specific, the user location when it is
personal habit. Skills may be grouped in subdirectories (e.g.
`.commandcode/skills/docs/changelog-writer/`) — discovery is recursive.

## 3. Write the frontmatter

Required fields:

```yaml
---
name: changelog-writer
description: Draft changelog entries from merged PRs and commit history, grouped by change type. Use when the user asks for a changelog, release notes, or "what changed since <version>".
---
```

The `description` carries the whole discovery burden. Write it as *what it does* + *when to use
it*, with the words a user would actually say. Under 1024 characters; two sentences is usually
right. Avoid "helps with X" — name the verbs and the artifacts.

Optional fields, all standard-compliant:

- `license` — a license name or bundled file reference
- `compatibility` — only when the skill has real environment requirements (≤500 chars)
- `metadata` — a string-to-string map for anything else (author, version, …)
- `allowed-tools` — space-separated pre-approved tools (experimental across implementations)

Command Code also honors these extensions (other tools ignore them safely):

- `argument-hint` — shown in the slash menu, e.g. `argument-hint: "<branch> [--draft]"`
- `disable-model-invocation: true` — the model never sees or auto-loads the skill; only an
  explicit `/name` invocation runs it. Use for destructive or highly contextual workflows.
- `model` — pin a model for the skill's work

## 4. Write the body

The body is the instruction set the agent follows after activation. Structure it for an agent,
not a human reader: imperative steps, exact commands, decision rules for edge cases, and one
worked example beat prose paragraphs.

Budget for progressive disclosure — the three-tier loading model the standard defines:

1. **Metadata** (name + description) is always in context. Spend it on triggers.
2. **The SKILL.md body** loads on activation. Keep it under ~500 lines; if you are pasting long
   reference material, move it out.
3. **Supporting files** load only when the body points at them. Link with paths relative to the
   skill directory: `references/format.md`, `scripts/collect.sh`.

Conventional (not required) subdirectories: `scripts/` for executable helpers, `references/` for
documentation the agent reads on demand, `assets/` for templates and static files. Positional
arguments from a slash invocation are available as `$ARGUMENTS` (all of them) or
`$ARGUMENTS[0]`, `$ARGUMENTS[1]`, … individually.

## 5. Verify

1. Re-read the frontmatter against the rules in step 2 — especially name ↔ directory match.
2. Run `cmd skills list` (or open `/skills` in the TUI): the skill must appear with no warning.
   A skipped skill shows up under its failure category — fix and re-check.
3. Invoke it once with `/name` and confirm the agent follows the body as written. Trim anything
   it did not need.

If the user will share the skill, remind them: skills are instructions plus executable code, so
consumers should review the content before trusting it.

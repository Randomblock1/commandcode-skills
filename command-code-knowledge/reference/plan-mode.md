<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Plan Mode

Plan mode is where the agent thinks before it touches anything. It explores read-only, writes a plan, and hands it to you in a review surface. You comment, it revises, you approve, then implementation starts.

---

## Start here

```bash
/plan                      # enter plan mode
/plan add rate limiting    # enter plan mode and plan that task
```

Or press `shift+tab` until the banner reads **plan**, or launch with `cmd --plan`.

In plan mode the agent can read files, search, and reason. It **cannot** edit files, run shell commands, or apply patches. When it's done it writes the plan to `~/.commandcode/plans/<name>.md` and opens **plan review**, a GitHub-style reader where one line is always selected, you leave inline comments, and you resolve with a verb:

| Key | Verb |
| --- | ---- |
| `ctrl+r` | **Submit review**: send your comments back; the agent revises the plan |
| `ctrl+a` | **Approve**: start implementing |
| `esc` | **Cancel**: the plan stays saved; reopen it with `/plans` |

---

## The permission modes

Plan mode is one rung on the permission-mode cycle. `shift+tab` moves between them: `default` → `auto-accept` → `plan` → back to `default`.

| Mode | File edits | Shell commands | Use it when |
| ---- | ---------- | -------------- | ----------- |
| **plan** | Blocked | Blocked | Exploring, designing, reviewing sensitive flows |
| **default** | Prompt for approval | Prompt for approval | Controlled iteration, the everyday mode |
| **auto-accept** | Applied directly | Run directly | The approach is clear and you're iterating fast |

Two modes sit off the cycle. `dont-ask` is selected from settings or `--permission-mode dont-ask`, and `shift+tab` from it moves to `auto-accept` and rejoins the normal cycle. `bypass` is only reachable by launching with `--yolo`, which also adds it to the cycle as a fourth rung (`plan` → `bypass` → `default`).

To jump straight to a mode without cycling, use `/mode` or its shorthands: `/mode:default`, `/mode:auto-accept`, `/mode:plan`.

**Permissions**
	Modes are only the baseline. The complete guide covers allow/ask/deny rule
	syntax, the decision ladder every tool call runs, safety behaviors, and the
	full mode-by-operation decision table.

Bypass mode is deliberately **not** reachable through `/mode`. Slash commands
are agent-invokable, so a mid-session route into bypass would let the model
disable its own permission prompts.

Command Code creates a [checkpoint](./sessions.md) before modifying files in any mode, so an auto-accept run is always rewindable.

### Picking a mode

| Situation | Mode |
| --------- | ---- |
| New feature with unclear scope | Plan |
| Debugging a complex issue | Plan |
| Multi-file refactor | Plan |
| Security review | Plan |
| Small bug fix | Auto-accept |
| Routine refactor | Auto-accept |
| Running tests and adjusting | Auto-accept |
| Quick typo fix | Auto-accept |

The usual loop: start in **plan**, explore and agree on the approach, approve the plan, let it run in **auto-accept**, rewind with checkpoints if something goes sideways.

---

## Plan review

Plan review turns a plan into a first-class, persistent artifact you can read, comment on, revise, and approve, instead of a block of text that scrolls away.

- **One mode: REVIEW.** Read line by line, comment on any line, resolve with a verb. There is no separate "edit mode"; plan edits go through your `$EDITOR`.
- **Plans persist.** Every plan is saved to `~/.commandcode/plans/` as markdown and indexed, so canceling a review never throws the plan away.
- **Comments are review artifacts, not plan text.** They live in a sidecar overlay and only reach the agent inside a prompt; they are never written into the plan document.
- **Review rounds.** When the agent revises a plan, the next round diffs against the last one: changed lines render green so you re-review only what moved.
- **Deterministic.** A harness backstop guarantees the review is offered even when a weaker model writes a plan and simply stops.

### How it works

```
  you: "plan a rate limiter"
             │
             ▼
  ┌─────────────────────┐
  │  PLAN MODE          │  read-only
  │  explore · design   │  writes <name>.md
  └──────────┬──────────┘
             │  exit_plan_mode
             ▼
  ┌─────────────────────┐
  │  PLAN REVIEW        │ ◀───────┐
  │  read · comment     │         │
  └──┬───────────────┬──┘         │
     │               │            │
     │ ctrl+r        │ ctrl+a     │
     │ submit        │ approve    │
     ▼               ▼            │
  ┌────────────┐  ┌───────────┐   │
  │ agent      │  │ IMPLEMENT │   │
  │ revises    │  └───────────┘   │
  └──────┬─────┘                  │
         └── another round ────────┘

  esc  →  plan saved, not-implemented
          reopen any time with /plans
```

Inside the reader one line is always selected, comments pin inline under their line, and the bottom bar holds the review verbs:

```
┌ Plan review · rate-limiter.md · v2 ─┐
│                                     │
│   5 ● 1. Add a token-bucket mw.     │
│       ↳ why not a sliding window?   │
│   6   2. Store buckets in Redis.    │
│   7   3. Return 429 + Retry-After.  │
│                                     │
│ ─────────────────────────────────── │
│ REVIEW    1 pending  ·  round 2     │
│ Submit review (1)      ctrl+r       │
│ Approve                ctrl+a       │
│ Cancel                 esc          │
└─────────────────────────────────────┘
```

`●` marks a commented line and `↳` is your comment pinned beneath it. In a revised round, changed lines render green. The hint row at the very bottom carries the rest: type + enter to comment, `ctrl+n`/`ctrl+p` to jump changes, `?` `x` `!` for quick comments, `ctrl+g` to edit.

### Four ways in

All of these open the same surface, scoped to a plan written during the **current session**.

1. **Finishing plan mode.** The agent writes the plan and calls `exit_plan_mode`, which opens plan review as the approval surface: the plan *is* the approval prompt. Approving here can also switch you into auto-accept mode so implementation runs without further prompts.
2. **Asking for it.** Outside plan mode, say *"review plan"* / *"open plan review"*. The agent calls the `plan_review` tool, which opens the panel for the most recent plan file, instead of pasting the plan back as a wall of text.
3. **`/plan-review`.** Jumps straight into a review of this session's latest plan.
4. **`/plans`.** Opens the full-screen plan browser: every plan from this session and past sessions, with status badges, comment counts, and search. `/plans <name>` jumps straight into a named plan.

**The automatic backstop.** Some models write a plan file and stop without ever presenting it. When a run ends naturally with a plan that was written but never reviewed (in **default** or **plan** mode), the harness presents the review panel itself. Approving continues the run with an instruction to implement; declining lets the run end so you can steer. Modes that mean "don't interrupt me" (auto-accept, bypass, and dont-ask) skip the backstop.

### Reading and commenting

The reader renders the plan like a document: headings, code, quotes, and tables styled per line. Long lines **wrap** at a comfortable reading width (80 columns when there's room, otherwise 60) rather than truncating.

**Navigating:**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move one line; past the last line drops onto the review verbs |
| `PgUp` / `PgDn` (`Fn+↑/↓` on Mac) | Page up/down one viewport, like `less` |
| `Home` / `End` (`Fn+←/→` on Mac) | Jump to the first / last line |
| `ctrl+n` / `ctrl+p` | Jump between marked lines: your comments, plus changed lines in a revised plan |

**Commenting** is Figma-style: start typing on a line and a draft box opens inline, directly under that line, exactly where it will sit once pinned.

| Key | Action |
|-----|--------|
| type + `Enter` | Open a draft on the selected line, then pin it |
| `Enter` on a commented line | Reopen the comment to edit it |
| empty + `Enter` | Remove the comment |
| `?` | Quick comment: "Why? Explain the reasoning behind this." |
| `x` | Quick comment: "Cut this — remove it from the plan." |
| `!` | Quick comment: "Risky — double-check this before implementing." |
| `esc` (while drafting) | Discard the draft |

Pinned comments show a `●` gutter marker and a `↳ comment` row beneath the line. They're saved to disk with the plan, so they survive closing the reader and even ending the session.

**Editing the plan** happens in your editor: `ctrl+g` hands the plan file to `$EDITOR` (or `$VISUAL`) and the reader reloads when you close it.

### Resolving a review

Trigger a verb by chord from anywhere, or arrow onto it and press `Enter`.

| Verb | Chord | What it does |
|------|-------|--------------|
| **Submit review** | `ctrl+r` | The agent takes your pending comments, revises the plan, and re-presents it for another round. Only shown when you have pending comments. |
| **Approve** *(approval surface)* | `ctrl+a` | Executes the plan and begins implementation. |
| **Execute plan** *(browser surface)* | `ctrl+e` | Executes the plan as written; from the `/plans` browser this is itself an approval. |
| **Cancel** / **Back** | `esc` | Ends the review. In plan mode the plan stays saved and you keep refining; from the browser it returns to the list. |

If you press Approve with comments still pending, Command Code asks rather than guessing:

```
Approve  (•) with N comments as notes    ( ) original plan · discard comments
```

**With comments as notes** sends them as a follow-up user turn: non-blocking notes the agent implements against. **Original plan** approves it clean and drops the comments. `←/→` switches, `Enter` confirms, `esc` backs out.

### Review rounds and versioning

Each time you **Submit review**, Command Code:

1. Snapshots the current plan to `~/.commandcode/plans/versions/<name>-v<N>.md`.
2. Bumps the plan's version and clears your pending comments (they were all handed to the agent in one prompt).
3. Lets the agent revise the plan, overwriting the live file.

When the revised plan comes back (version > 1), the reader **diffs it against the previous round's snapshot**. Changed lines render **green**, and the badge line reports `round N · M lines changed`, so a second review means re-reading only what actually moved. `ctrl+n`/`ctrl+p` jump between those changed lines.

---

## Where plans live

```
~/.commandcode/plans/<descriptive-name>.md      ← the plan markdown (written by the agent)
~/.commandcode/plans/plans-index.json           ← titles, status, comments, versions
~/.commandcode/plans/versions/<name>-v<N>.md    ← prior review-round snapshots
```

Every plan carries a status:

- **pending**: written but not yet taken through review.
- **approved**: you approved it and moved to implementation.
- **not-implemented**: you canceled the review; the plan is kept for later reading, commenting, and revision.

Because a canceled plan is recorded rather than discarded, planning never feels throwaway; reopen it any time with `/plans`. Writes to `~/.commandcode/plans/*.md` never prompt for permission in any mode, and only `.md` files there get that exemption, so the plans directory can't double as a scratchpad.

---

## Reference

### Slash commands

| Command | Description |
|---------|-------------|
| `/plan [task]` | Enter plan mode; `/plan <task>` plans that task |
| `/plans [name]` | Browse, review, and annotate saved plans; bare `/plans` opens the browser |
| `/plan-review` | Review this session's latest plan |
| `/mode [default\|auto-accept\|plan]` | Show or switch the permission mode |
| `/mode:plan` | Switch to plan mode (read-only, no side effects) |
| `/mode:auto-accept` | Switch to auto-accept mode |
| `/mode:default` | Switch to default mode |

### CLI flags

| Flag | Description |
|------|-------------|
| `--plan` | Start in plan mode |
| `--auto-accept` | Start in auto-accept mode |
| `--permission-mode <mode>` | `default`, `plan`, `auto-accept`, or `dont-ask` (legacy `standard` accepted) |
| `--yolo` | Bypass all permission prompts, and add `bypass` to the `shift+tab` cycle |

### Tools

| Tool | Description |
|------|-------------|
| `enter_plan_mode` | Switches into plan mode (with your confirmation) for read-only exploration |
| `exit_plan_mode` | Presents the plan for approval when leaving plan mode. Only valid *in* plan mode |
| `plan_review` | Opens the review panel on demand *outside* plan mode. Renders as `PLAN(review)` in the feed |

---

## See also

- [Permissions](./permissions.md): the rule syntax and decision model behind every mode.
- [Checkpoints](./sessions.md): rewind after an approved plan is implemented.
- [Tools](./tools.md) and [Slash Commands](./custom-slash-commands.md): the full references.

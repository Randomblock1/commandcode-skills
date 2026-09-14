---
name: command-code-knowledge
description: Authoritative Command Code product knowledge — slash commands, CLI options, permissions, skills, custom agents, MCP servers, hooks, memory, headless mode, plan mode, checkpoints, sessions, the model catalog, custom/BYOK providers (providers.json, OpenAI-compatible and Anthropic-wire endpoints, local servers like Ollama, API keys, /providers), taste, pricing, and troubleshooting. Use when the user asks how Command Code works, how to configure or extend it, which models exist, how to add their own provider or endpoint, or when you need product facts to answer a "can Command Code do X" question. Do NOT search the codebase for product behavior — read the reference files here instead.
---

# Command Code Knowledge

You are answering a question about Command Code itself (or configuring/extending it). The
`reference/` directory next to this file IS the authoritative product documentation — it is
generated from the public docs (commandcode.ai/docs) and from the same registries that drive
the product (`/model` catalog, billing tables, slash-command menu), so it can never be more
wrong than the product. Never guess and never grep the codebase for product behavior: open
the matching reference file.

## How to use this skill

1. Pick the reference file(s) below that cover the question and read them.
2. Answer from what they say; quote exact ids, flags, paths, and settings keys verbatim.
3. Model questions (which model, exact ids, context windows, efforts, prices incl. cache
   rates): read `reference/models.md` — ids there are EXACT; never invent a model id.
4. Account questions ("which plan am I on", "which models can/can't I use", credits,
   limits): read `reference/plans.md` and the Min plan column in `reference/models.md`. The
   plan itself is not readable headlessly — ask the user or point them at /usage. Never
   dig through auth files, API endpoints, or TTY tricks.
5. Custom/BYOK provider questions (the providers.json shape, `apiKey` references, local
   endpoints like Ollama/vLLM/LM Studio, `/providers`, "add X as a provider"): read
   `reference/byok.md`. Never invent config keys — the accepted fields are listed there
   verbatim. When you need current model ids, context windows, or prices for an EXTERNAL
   provider, fetch the models.dev registry (https://models.dev/api.json — the same catalog
   the CLI's /providers wizard uses) rather than inventing them.
6. Anything about the help surface (slash commands, keyboard shortcuts, CLI flags, taste,
   FAQ, pricing links): `reference/product-help.md` — the same document the
   bundled product-help reference.
7. Questions about the built-in tools — exact wire names, parameters, guards, limits, or how
   the agent is expected to drive one (e.g. the worked `todo_write` checklist examples):
   `reference/tools.md`.
8. Building a mod (a loadable ModApi plugin)? Switch to the `mod-builder` skill — it has
   the mods reference and runnable examples.

## Reference index

<!-- generated:reference-index:start -->
- `reference/permissions.md` — Permissions
- `reference/skills.md` — Agent Skills
- `reference/mcp.md` — MCP Servers
- `reference/hooks.md` — Hooks
- `reference/custom-slash-commands.md` — Slash Commands
- `reference/tools.md` — Tools
- `reference/custom-agents.md` — Custom Agents
- `reference/memory.md` — Memory
- `reference/headless.md` — Headless Mode
- `reference/plan-mode.md` — Plan Mode
- `reference/sessions.md` — Sessions & Checkpoints
- `reference/byok.md` — BYOK
- `reference/models.md` — Command Code Models
- `reference/plans.md` — Plans, credits, and per-plan model access
- `reference/product-help.md` — Product help (slash commands, CLI, taste, FAQ, pricing)
<!-- generated:reference-index:end -->

## Verify your answer

- Ids and flags must appear verbatim in a reference file — if you cannot find it, say so
  rather than inventing it.
- When the user should run something, prefer the exact command a reference file shows
  (e.g. `cmd mcp add --transport http …`, `cmd --mod ./file.ts`).
- These files regenerate from the docs via `pnpm generate:knowledge`; if the user reports a
  mismatch with the live product, the public docs at https://commandcode.ai/docs are the
  place to check.

<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Packaging and install

A mod starts life as a loose file in `~/.commandcode/mods/`. When it should be shared - with a team, or the world - it becomes a **package**: an npm package, a git repo, or a local directory that `cmd mods add` installs and Command Code loads on every session.

## Install, remove, list, update, open

```bash
cmd mods add cmd-mod-hi                     # bare name = npm package
cmd mods add @team/review-mod@1.2.0         # scoped npm name, pinned (npm: prefix optional)
cmd mods add owner/repo@v1                  # GitHub shorthand (any git host via git:<host>/…)
cmd mods add ./tools/local-mod              # local path, referenced in place
cmd mods add -g owner/repo                  # user scope instead of project
cmd mods list                               # alias: cmd mods ls
cmd mods update                             # reinstall missing, reconcile pinned refs (alias: up)
cmd mods remove owner/repo                  # alias: cmd mods rm
cmd mods remove fun-stuff                   # by the name `mods list` prints
cmd mods open                               # open the mods dir (project); --user for ~
```

`cmd mods list` prints one line per mod - name, scope, origin - project mods first, then user, then package-provided:

```
Mods (2)
  guard · project · .commandcode/mods/guard.ts
  cmd-mod-hi · user · from npm:cmd-mod-hi
```

The origin is the file for a drop-in mod and `from <source>` for a package mod (whose file lives under `.registry/`, which you never edit by hand). Built-in mods are Command Code's own internals and are never listed. Configured package sources stay out of the output entirely unless one needs attention - not installed, or installed but contributing no mods.

`remove` (`rm`) takes **either** a source or the mod NAME `cmd mods list` prints, and removes whatever backs that name: a drop-in file or directory is deleted from the mods dir, a package-provided mod removes its source (and says which sibling mods went with it), a `mods.paths` mod drops its settings entry. Scope follows where the mod actually lives, so a user-scope mod does not need `-g`; a source that is configured in neither scope reports that instead of a silent success.

`cmd mods open` opens the drop-in mods directory - `<project>/.commandcode/mods` by default, `~/.commandcode/mods` with `--user` (`-g`) - creating it if it does not exist yet. `--path` prints the directory instead of opening it.

A source with no slash is an npm package name, and so is a `@scope/name` - git shorthand always carries an `owner/repo` slash, so `npm:` is optional (an explicit `git:` prefix always wins). Sources persist in the `mods.sources` settings key (project scope writes `.commandcode/settings.json`, `-g` writes `~/.commandcode/settings.json`). Identity is version/ref-agnostic - `owner/repo@v1` and `https://github.com/owner/repo` are the same package, and a project entry shadows the same identity at user scope. Installs land in `<scope>/.commandcode/mods/.registry/{npm,git}/…`; startup never runs npm/git on its own - a configured-but-missing package is a warning pointing at `cmd mods update`.

## What a package ships

A package declares what it ships via `package.json` - exact paths, directories, or globs (expanded against the package root; entries escaping the root are dropped):

```json
{
	"name": "@team/review-mod",
	"commandcode": {"mods": ["./src/review.ts", "src/checks/*.ts"]}
}
```

No manifest → the `mods/` convention directory → a root `index.ts`, in that order.

## Filtering a source's mods

A `mods.sources` entry can be the object form to load only part of a package:

```json
{
	"mods": {
		"sources": [
			{"source": "owner/review-pack", "mods": ["review/*.ts", "!review/slow.ts"]}
		]
	}
}
```

Four pattern kinds, applied in precedence order: `-path` force-exclude (exact, beats everything) → `+path` force-include (exact, restores what globs dropped) → `!glob` exclude → plain-glob include (when any includes exist, an entry must match one). Patterns match the entry's package-relative path or its mod name. `cmd mods add` / `remove` preserve hand-written object entries - they never flatten your filters.

## Disabling without deleting

```json
{"mods": {"disabled": ["review-guard"]}}
```

Works for discovered files, installed packages, and the disable-able built-ins (`provider-copilot`, `update-notice`, `titling`, `learning`).

## Trust and safety

- **There is no sandbox** - a mod is arbitrary code; install packages you trust.
- **Project mods are trust-gated** like project skills: they load only after the workspace trust prompt. User-scope and `--mod` mods always load.
- **Package installs run npm with `--ignore-scripts`** - mods are jiti-loaded TypeScript; they need no build step, so lifecycle scripts are pure attack surface.
- **Print mode loads user-scope and `--mod` mods only.** Project mods stay out of headless runs because print never shows a trust prompt; pass `--dangerously-skip-permissions` to opt a repo's own mods into a headless run (CI).

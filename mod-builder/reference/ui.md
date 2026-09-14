<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# UI surface

Everything a mod can put on screen rides `cmd.ui`, `cmd.addRenderer`, and `cmd.showEntry`. All of it is line-based and host-agnostic: the TUI wires real rendering, headless runs degrade to deterministic defaults, and a crashing renderer becomes a warning - never a broken screen.

## Notifications and dialogs

- `cmd.ui.notify(message)` - a `notice` feed row.
- `cmd.ui.confirm({title, message?})` / `cmd.ui.select({title, options})` / `cmd.ui.input({title, placeholder?})` - the Interaction question modal in the TUI. Headless, each resolves its deterministic default: confirm → `false`, select/input → `undefined` - never auto-approved.

## Footer status segments and editor widgets

> **Widgets are not wired into the TUI yet.** `cmd.ui.widget` and `cmd.ui.refreshWidgets` exist on the surface and are safe to call - they never throw and return the documented `Disposable` - but they currently render **nowhere**. The contract below is the intended design; wire-up is pending. `cmd.ui.setStatus` **is** wired and renders today.

`cmd.ui.setStatus(text | null)` - a persistent per-mod segment in the TUI footer (under the input panel). One segment per mod: a new call replaces the text, `null` (or whitespace-only text) clears it, and the returned `Disposable` clears it too - but only while it still owns the segment, so a stale handle disposing late can't wipe a newer status. Segments from multiple mods render on one row in load order, and a call from async code repaints on its own. Text is printed verbatim (style it with ansi), collapsed to a single line: newlines and tabs become spaces. Headless: stored, rendered nowhere.

```ts
cmd.hooks({
	onSessionStart: () => cmd.ui.setStatus('#channel ✓ connected'),
	onSessionEnd: () => cmd.ui.setStatus(null),
});
```

`cmd.ui.capabilities.status` - whether this host renders footer segments (true in the interactive TUI, false headless). Use it to pick a surface instead of shipping a permanent fallback:

```ts
if (cmd.ui.capabilities.status) cmd.ui.setStatus(text);
else cmd.ui.notify(text);
```

`cmd.ui.widget({placement: 'above-editor' | 'below-editor', render: () => lines})` - a line-based widget the TUI renders around the input panel. Same verbatim-lines contract as `addRenderer` (style with ansi); `render` re-runs on every repaint, and `cmd.ui.refreshWidgets()` requests a repaint after your data changes. A throwing render is skipped (reported as a `mod_error`) so siblings keep rendering. Headless: no-op.

```ts
let failing = 0;
cmd.ui.widget({
	placement: 'above-editor',
	render: () => [failing > 0 ? `✗ ${failing} tests failing` : '✓ tests green'],
});
cmd.on('tool_completed', () => {
	failing = readFailingCount();
	cmd.ui.refreshWidgets();
});
```

## Custom feed rendering

- `cmd.addRenderer(customType, data => lines)` - a renderer for a custom entry type; returns the lines to print (style them with ansi escapes - picocolors, `@commandcode/tui` helpers, or raw codes). First registration per type wins across mods.
- `cmd.showEntry(customType, data)` - render a custom entry into the live feed through the renderer registered for that type (unrendered types pretty-print as JSON). The TUI wires the sink; headless runs drop entries. Pair with `cmd.session.appendCustomEntry` when the data should also persist.

Rendering is deliberately **line-based, not component-based**: mods return styled text lines, never React components. That keeps renderers host-agnostic (the same mod renders in any future host) and a crashing renderer degrades to a warning notice, never a broken screen.

## Headless behavior at a glance

| Surface | Interactive TUI | Headless (`-p`) |
|---|---|---|
| `notify` | notice feed row | printed notice |
| `confirm` | modal | resolves `false` |
| `select` / `input` | modal | resolves `undefined` |
| `setStatus` | footer segment under the input | stored, rendered nowhere |
| `widget` | no-op (wire-up pending) | no-op |
| `showEntry` | rendered feed row | dropped |

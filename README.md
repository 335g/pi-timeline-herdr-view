# pi-timeline-herdr-view

A [Herdr](https://herdr.dev) mod that shows [pi-timeline](../pi-timeline)'s task tree: a segmented progress bar, the tree with weighted shares, and a clicked task's note and result. It reads `<cwd>/timeline.json`, which pi-timeline writes on every `timeline` tool call.

[日本語](./README.ja.md)

```
Timeline                                   75%
████████████████░░░░░░
 ▶ Build the parser                w3
 ✔ Lex the tokens                  w2
 ✔ Emit the nodes
 ✓ Run the tests                   !waiting on typecheck
```

## Install

```sh
# 1. the writer (pi side)
pi install @335g/pi-timeline

# 2. the view: copy this package's mod folder into Herdr's home
cp -r packages/pi-timeline-herdr-view/mods/pi-timeline-herdr-view ~/.config/herdr-app/mods/
herdr-app check ~/.config/herdr-app/mods/pi-timeline-herdr-view
```

Install by copying, not by symlinking: Herdr hot-reloads a mod when a file inside its own folder changes, and a symlink runs but does not reload. After editing a checkout, copy again:

```sh
cp -r packages/pi-timeline-herdr-view/mods/pi-timeline-herdr-view ~/.config/herdr-app/mods/
```

Then show it one of three ways:

| Way | Command | Key |
|---|---|---|
| Window over the layout | `herdr-app do mod.open --name pi-timeline-herdr-view` | as bound in `keys.json` |
| A pane beside the terminal | `herdr-app do pane.split --direction right --mod pi-timeline-herdr-view` | — |
| A permanent column | add a block to a layout (see [RECIPE.md](./RECIPE.md)) | `layout.toggle:<block id>` |

`keys.json` in this package is a fragment to merge into `~/.config/herdr-app/keys.json`; it binds nothing by default. `layout.toggle:<id>` needs a block with that id, so a pane or the window is the one-command start.

## The file it reads

`<cwd>/timeline.json`, written by the writer, never by this mod:

```json
{ "version": 1, "title": "optional heading", "tasks": [
  { "id": "1", "title": "Build the parser", "status": "active", "weight": 3 },
  { "id": "1.1", "title": "Lex the tokens", "parent": "1", "status": "done",
    "note": "shown in warning colour", "result": "shown after →" }
] }
```

- `id` and `title` are required; `parent`, `weight`, `status`, `note`, `result` are optional.
- `status` is `done`, `active`, `pending` (the default) or `blocked`.
- A node's share comes from its `weight` among its siblings (default 1) and is handed down to its children; a node with children is measured by them, a leaf by its own status.
- The focused pane's folder is used when a file is not pinned with the block's `props.cwd` or `props.file`.

Anything that writes this file works; pi-timeline is one writer, not a requirement.

## Notes

- The mod only reads files: no `exec`, no network. It watches the folder with `watchFolder` and has no timer.
- The writer puts `timeline.json` in the folder you work in; add it to that repo's `.gitignore`.
- No API is stable across Herdr releases; this was checked against herdr-app 0.1.16. If a release breaks it, rebuild from [RECIPE.md](./RECIPE.md).

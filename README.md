# PatchPreview

A generic local React viewer for unified `.patch` and `.diff` files, powered by
[Diffs](https://diffs.com) and [Trees](https://trees.software).

## Run

```bash
git clone https://github.com/hatim-s/patchpreview.git
cd patchpreview
bun install
bun run dev
```

The app starts with a small example. Open, drop, or paste any unified patch to replace it.

To start with a specific patch, pass its path through `PATCHPREVIEW_FILE`:

```bash
PATCHPREVIEW_FILE=/absolute/path/to/change.patch bun run dev
```

The path can point to any patch and has no repository-specific convention.

## CLI

Link the command once from this project:

```bash
bun link
```

Then render any patch from any directory:

```bash
patchpreview /absolute/path/to/change.patch
```

The command starts or updates a detached local viewer, opens the patch in your browser, and exits.
Later calls reuse the same viewer process, so the CLI never occupies the terminal. Use `--no-open`,
`--host`, or `--port` when you need to control how the local viewer starts.

## Shortcuts

- `C` — collapse or expand all files
- `W` or `Z` — toggle line wrapping
- `T` — cycle system, light, and dark themes
- `V` — toggle split and unified diff layouts

Shortcuts are ignored while typing in an input or textarea.

## Production build

```bash
bun run build
bun run preview
```

Set `PATCHPREVIEW_FILE` during the build to include that patch as the initial document.

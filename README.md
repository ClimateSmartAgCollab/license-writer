# License Writer

Web UI for authoring Jinja license templates for the DRT project. Upload an OCA package for schema-guided editing, or start from an existing template. Export plain text, Markdown, or a SAID-signed `license_template/1.0` JSON record.

**Live:** [climatesmartagcollab.github.io/license-writer](https://climatesmartagcollab.github.io/license-writer/) (deploys from `main`)

## Workflows

| Entry point | Route | What you get |
|-------------|-------|--------------|
| OCA package JSON | `/attributes` | Attribute sidebar, insert variables and `for` blocks from schema |
| License template file | `/template-editor` | Template-only editor, no OCA required |

Both paths share the same dual-mode editor:

- **Builder** — bracket tokens (`[If: …]`, `[For: …]`) projected to Jinja
- **Advanced** — raw Jinja (`{{ }}`, `{% for %}`, `{% if %}`)

Mode switches preserve content via a shared plain-text AST. Unsupported Jinja (macros, includes, inheritance) is rejected or downgrades Builder to read-only with warnings.

## Stack

React 19 · TypeScript · Vite · TipTap · Tailwind · React Router (hash) · [saidify](https://www.npmjs.com/package/saidify)

Template logic lives in adapters (`jinjaAdapter`, `builderAdapter`) behind a command reducer in `templateStore`. SAID export canonicalizes the record, computes digest `d`, and self-verifies before download.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production bundle
npm run test     # vitest
npm run lint
npm run preview  # serve dist locally
```

Node 20+. Base path is `/license-writer/` for GitHub Pages (`vite.config.ts`).

## Docs

- [Supported template rules](docs/supported-template-rules.md) — whitelist, mode behavior, module map

## Layout

```
src/
  features/oca/          OCA package upload
  features/template/     Initial template upload + reducer store
  pages/                 AttributesPage, TemplateEditorPage
  lib/template/          Jinja + Builder adapters
  lib/editor/            TipTap ↔ plain-text sync
  lib/said/              SAID record build / verify / export
  components/            Editors, attribute UI
```

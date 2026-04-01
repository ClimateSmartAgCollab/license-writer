# Supported Template Rules

## Module map (source layout)

Short guide to where responsibilities live. Names align with `TemplateMode`: **builder** (guided brackets) and **advanced** (Jinja template text).

| Area | Path | Responsibility |
|------|------|------------------|
| OCA types | `src/types/oca.ts` | OCA Package JSON shapes |
| Template AST | `src/types/template-ast.ts` | Parsed template document model |
| State & commands | `src/types/templateStateAndCommands.ts` | Reducer commands, `TemplateState`, `TemplateMode`, builder repeat context |
| Adapter contracts | `src/types/templateAdapterInterfaces.ts` | `JinjaTemplateAdapter` / `BuilderTemplateAdapter` interfaces |
| Jinja adapter | `src/lib/template/jinjaAdapter.ts` | Advanced (Jinja) parse / print / insert |
| Builder adapter | `src/lib/template/builderAdapter.ts` | Builder mode projection and edits |
| Template store | `src/features/template/state/templateStore.ts` | `templateReducer`, dual-text state |
| OCA upload UI | `src/features/oca/OCAPackageUpload.tsx` | Load OCA Package JSON → attributes |
| Initial template upload | `src/features/template/InitialTemplateUpload.tsx` | Seed template text from a file |
| Advanced editor | `src/components/AdvancedTemplateEditor.tsx` | TipTap for **advanced** Jinja text |
| Builder editor | `src/components/BuilderTemplateEditor.tsx` | TipTap for **builder** mode text |
| Builder ↔ Jinja JSON | `src/lib/editor/editorTiptapBuilderJinjaJson.ts` | Map TipTap JSON text nodes between modes |
| Plain offset mapping | `src/lib/editor/editorTiptapPlainTextOffset.ts` | Plain-text offset ↔ ProseMirror position |
| Store ↔ editor sync | `src/lib/editor/editorTiptapPlainTextInsertSync.ts` | Verified inserts and single edit sync |
| OCA attribute helpers | `src/lib/oca/ocaPackageAttributes.ts` | Extract attributes, schema levels, form order |
| UI `cn()` | `src/lib/utils.ts` | Tailwind class merge helper only |

## Purpose and Scope

This template system intentionally supports a minimal Jinja-style subset for license template authoring and export.
It is designed to keep templates predictable, easy to validate, and safe to maintain.

Jinja-style delimiters used in this project follow the default pattern:

- `{{ ... }}` for printed expressions (variables)
- `{% ... %}` for statement blocks (control flow)

## Supported Constructs (Whitelist)

- Variable insertion using `{{ variable }}` and dotted paths such as `{{ parent.child }}`.
- For-loop blocks using `{% for item in collection %}` and `{% endfor %}`.
- Optional conditional blocks when needed:
  - `{% if ... %}`
  - `{% elif ... %}`
  - `{% else %}`
  - `{% endif %}`

## Unsupported Constructs (Explicit Non-Goals)

The following features are intentionally unsupported in this version:

- Macros (`{% macro %}`, `{% endmacro %}`)
- Includes/imports (`{% include %}`, `{% import %}`, `{% from %}`)
- Template inheritance (`{% extends %}`, `{% block %}`, `{% endblock %}`)
- Call blocks and advanced control tags

## Valid and Invalid Examples

### Example 1: Variable insertion

- Valid: `{{ holder.name }}`
- Invalid: `{% macro render_name(user) %}{{ user.name }}{% endmacro %}`

### Example 2: Loop block

- Valid:
  `{% for item in items %}`
  `{{ item.value }}`
  `{% endfor %}`
- Invalid:
  `{% for item in items %}`
  `{{ item.value }}`
  `{% continue %}`
  `{% endfor %}`

### Example 3: Optional conditional block

- Valid:
  `{% if item.active %}{{ item.label }}{% endif %}`
- Invalid:
  `{% include "shared-snippet.jinja" %}`

## Enforcement Notes

- Keep editor and export behavior aligned with this ruleset.
- If unsupported tags are present, block copy/download actions and prompt for correction.
- Treat expansion of this ruleset as a deliberate product decision, not ad hoc drift.

## Future Expansion

If a new Jinja construct is needed, update this document first, then update editor validation and tests in the same change.

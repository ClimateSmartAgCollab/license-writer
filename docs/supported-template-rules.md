# Supported Template Rules

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

## Why
We need clear differentiators vs. incumbents (TablePlus/DataGrip/DBeaver). Focusing on a MySQL‑first, delightful UX with powerful workflows will increase conversion and retention.

## What Changes
- Round‑trip Visual Builder with EXPLAIN overlay and cost hints
- Safe data editing with preview/undo and audit trail
- Schema diff + migration script generation (dry‑run safety)
- Smart SQL autocomplete/macros (schema‑aware, FK‑aware)
- Data diff & one‑way sync between environments

## Impact
- Affected specs: query-builder, data-editing, schema-diff, sql-editor, data-diff
- Affected code: src/features/queryBuilder/*, src/features/dataViewer/*, src/features/schema/*, src/features/query/SQLEditor.tsx


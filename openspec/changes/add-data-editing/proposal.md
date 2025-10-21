## Why
Users need to edit table data directly from the app. This requires safe backend endpoints (validation, constraints, transactions) and a rich frontend editing experience (inline edits, add/delete rows, undo/redo, FK dropdowns).

## What Changes
- Backend data editing capability (safe CRUD over rows)
- Transaction management + validation (types, constraints)
- Batch operations (multi-row updates)
- FK lookup endpoints for dropdowns
- Frontend inline editing in Data tab
- Add/Delete rows, dirty indicators, commit/rollback, undo/redo
- Data type-specific inputs, bulk edit, copy/paste, NULL setter, error display

## Impact
- Affected specs: backend-data-editing, frontend-data-editing
- Affected code:
  - server/routes (new: dataEditing)
  - server/services (new: DataEditingService)
  - src/features/dataViewer (extend grid for editing controls)
  - src/hooks/api clients (new: dataEditingApi)

## Notes
- No schema migrations; operates on existing MySQL tables
- Focus on safety: explicit primary key selection and constraint-aware operations

## Status (In Progress)

### Shipped (Backend)
- DataEditingService with validation + transactions
- Endpoints: update-row, insert-row, delete-row (FK-safe), batch-update (atomic optional)
- FK lookup endpoint for dropdowns (search + pagination)

### Shipped (Frontend)
- Inline cell editing in Data grid with dirty state
- Type-aware editors: number/date/datetime/enum/set/json/bool/text
- Add Row (with schema default autofill) and Delete Row
- Commit/Rollback actions; Undo/Redo edit stack
- FK dropdown editor with search
- NULL setter (inline + context menu)
- Bulk edit dialog; copy/paste (multi-line, column copy); per-cell inline errors

### Pending
- Proactive unique/check constraint validation (currently rely on DB errors)
- Persist user context (sort/filter/layout) across sessions (optional)

## How To Test

### Backend
- Update single row
  - POST /api/data-editing/:connectionId/update-row with { database, table, key:{pk...}, changes:{...} }
  - Expect success with updated row; NOT NULL violations rejected; numeric/date/json coerced
- Insert row
  - POST /api/data-editing/:connectionId/insert-row with { database, table, values:{...} }
  - Expect success with insertId/row; NOT NULL enforced; defaults applied when values omitted
- Delete row
  - POST /api/data-editing/:connectionId/delete-row with { database, table, key:{pk...} }
  - Expect success; FK violations return 409 with friendly message
- Batch update
  - POST /api/data-editing/:connectionId/batch-update with { database, table, updates:[{key,changes},...], atomic:true }
  - Expect all-or-nothing; per-row results included when atomic:false
- FK lookup
  - GET /api/data-editing/:connectionId/fk-lookup?database=&table=&column=&q=&limit=&offset=
  - Expect options value/label pairs; label selected from name-like/text columns

### Frontend (Data tab)
- Inline edit
  - Edit cells (text/number/date/datetime/json/enum/set/bool)
  - Dirty highlights appear; typing is smooth without lockups
- Commit/rollback
  - Commit writes changes; inline errors appear on failing cells; rollback clears edits
- Add/Delete row
  - Add row prefills schema defaults; delete removes selected rows after confirm
- Undo/Redo
  - Make several edits; Undo and Redo revert/apply changes before commit
- FK dropdown
  - FK column shows searchable dropdown; selecting sets FK value
- NULL setter
  - NULL button and context menu set cells to NULL for nullable columns
- Bulk edit
  - Select rows; apply value to a column via Bulk Edit dialog
- Copy/Paste
  - Copy selected column values (Ctrl/Cmd+C); paste multi-line values to fill successive rows
- Sorting
  - Click header to sort DESC → ASC → off; Shift+Click for multi-column sort; query refetches and data reorders

## Acceptance Criteria
- Backend endpoints return correct results and errors for happy/validation paths
- Data grid supports all edit actions without locking inputs or losing focus
- Per-cell inline errors display on the correct fields after commit failures
- FK dropdown shows appropriate labels and sets values correctly
- Add/Delete/Undo/Redo/Bulk/Copy/Paste behave as described and survive refetch
- Sorting works via header clicks with immediate refetch

## Known Issues / Limitations
- Constraint validation (unique/check) is currently surfaced from DB errors; proactive checks before write are pending (see Pending).
- Default value autofill relies on column metadata; dynamic defaults (e.g., triggers) are not predicted client-side.
- JSON editor validates syntax only; schema-level JSON constraints are not enforced client-side.
- Batch update per-row error details depend on DB error messages; field-level mapping uses edited fields heuristically.
- Context persistence (sort/filter/layout) is not enabled by default; can be added via localStorage in a follow-up change.

## Out of Scope
- Complex data transformations (computed columns, expression editors) beyond bulk-edit value application.
- Full audit logging/versioning of row edits.
- Cross-connection transactions.

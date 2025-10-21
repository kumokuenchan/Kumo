## ADDED Requirements

### Requirement: Inline Cell Editing
The UI SHALL support inline editing in the data grid with per-cell dirty state.

#### Scenario: Edit cell
- WHEN user edits a value
- THEN the cell shows a dirty marker and validation runs on blur/commit

### Requirement: Data Type-specific Inputs
The UI SHALL render inputs suited to column types (number, date, datetime, enum, text).

#### Scenario: Date column
- WHEN editing a DATE
- THEN UI shows date picker and normalizes to YYYY-MM-DD

### Requirement: Add Row
The UI SHALL allow adding a new row with default values and editing before commit.

#### Scenario: Add
- WHEN user clicks Add Row
- THEN a new editable row appears with defaults/NULLs as allowed

### Requirement: Delete Row
The UI SHALL allow deleting selected row(s) with confirmation.

#### Scenario: Confirm
- WHEN user confirms delete
- THEN rows are removed and grid refreshes

### Requirement: Dirty Indicators
The UI SHALL indicate modified cells/rows and pending uncommitted changes.

### Requirement: Commit and Rollback
The UI SHALL provide Commit and Rollback actions applying pending changes.

### Requirement: Undo/Redo
The UI SHALL support local undo/redo of edits before committing.

### Requirement: FK Dropdown with Search
The UI SHALL offer searchable dropdowns for FK columns using backend lookup.

### Requirement: NULL Setter via Context Menu
The UI SHALL set a cell to NULL via right-click menu if column allows NULL.

### Requirement: Bulk Edit Dialog
The UI SHALL apply a value or expression to multiple selected rows.

### Requirement: Copy/Paste Between Cells
The UI SHALL support copying/pasting values across cells with compatible types.

### Requirement: Inline Validation Errors
The UI SHALL inline-display validation errors with clear messages.

### Requirement: Default Value Autofill
The UI SHALL prefill defaults for new rows and show read-only auto fields.


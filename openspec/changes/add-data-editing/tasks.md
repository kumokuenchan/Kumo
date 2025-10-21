## 1. Backend Implementation
- [x] 1.1 Create service `DataEditingService` with helpers
- [x] 1.2 Add route file `server/routes/dataEditing.ts`
- [x] 1.3 Endpoint: Update single row with validation
- [x] 1.4 Endpoint: Insert single row
- [x] 1.5 Endpoint: Delete single row with constraint checks
- [x] 1.6 Endpoint: Batch update (multiple rows)
- [x] 1.7 Add transaction support wrapper (begin/commit/rollback)
- [x] 1.8 Implement data type validation
- [~] 1.9 Implement constraint validation (FK, unique, check, NOT NULL)
      - Implemented: NOT NULL pre-checks, FK delete error mapping
      - Pending: proactive unique/check validation (currently relies on DB errors)
- [x] 1.10 Endpoint: FK lookup for dropdowns

## 2. Frontend Implementation
- [x] 2.1 Extend DataGrid to enable inline cell editing
- [x] 2.2 Inputs by type (number/date/datetime/enum/set/json/bool/text)
- [x] 2.3 Add "Add Row" UI and flow
- [x] 2.4 Add "Delete Row" with confirm dialog
- [x] 2.5 Dirty state indicators at cell/row level
- [x] 2.6 Commit/rollback toolbar actions
- [x] 2.7 Undo/redo local stack (per table)
- [x] 2.8 FK dropdown (lookup + search)
- [x] 2.9 NULL setter (context menu & inline button)
- [x] 2.10 Bulk edit dialog (selected rows)
- [x] 2.11 Copy/paste between cells
- [x] 2.12 Inline validation error display
      - Implemented: JSON invalid highlighting; per‑cell error mapping from batch update and insert responses
- [x] 2.13 Default value autofill for new rows

## 3. Wiring & Validation
- [x] 3.1 API client `src/api/dataEditing.ts`
- [x] 3.2 Hooks `src/hooks/useDataEditing.ts`
- [x] 3.3 Integrate into Data tab toolbar and grid
- [x] 3.4 Manual validation with test tables

## 4. Docs & Polishing
- [ ] 4.1 Update README with editing features
- [ ] 4.2 Usage tips in UI (tooltips)
- [ ] 4.3 Error messages review

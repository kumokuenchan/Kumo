## 1. Implementation

- [ ] 1.1 Visual Builder parity
  - [ ] Maintain SQL <-> graph parity (round trip)
  - [ ] EXPLAIN overlay: cost coloring, row estimates per edge
  - [ ] Missing/unused index hints
  - [ ] Entry in tab bar and canvas toolbar

- [ ] 1.2 Safe editing with preview/undo
  - [ ] Generate SQL diff preview before commit
  - [ ] Wrap edits in transactions; support Undo/Redo
  - [ ] Optional audit log per table/session

- [ ] 1.3 Schema diff + migrations
  - [ ] Diff two connections/databases (DDL only)
  - [ ] Generate migration scripts (SQL; adapters later)
  - [ ] Dry run and destructive‑change warnings

- [ ] 1.4 Smart autocomplete & macros
  - [ ] FK‑aware JOIN suggestions
  - [ ] WHERE hints via sampled values (safe limit)
  - [ ] Snippet macros with parameters

- [ ] 1.5 Data diff & sync
  - [ ] Row‑level compare with key awareness
  - [ ] One‑way sync with conflict handling
  - [ ] Batching and constraints safety

## 2. UI Surfaces

- [ ] Tabs/toolbar entries (builder, diff, profile)
- [ ] Dialogs: preview, dry run, conflicts
- [ ] Panels: EXPLAIN overlay, cost legend

## 3. Technical

- [ ] Query service: EXPLAIN, sampling, batched ops
- [ ] Diff engines: schema (DDL), data (PK/FK aware)
- [ ] Persistence: saved diffs/migrations, history

## 4. QA

- [ ] Large schema perf checks (lazy load/virtualize)
- [ ] Safety: transaction rollback, timeouts
- [ ] DX: keyboard shortcuts, command palette items


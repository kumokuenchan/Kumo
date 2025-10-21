## ADDED Requirements

### Requirement: Safe Edit Preview & Undo
The system SHALL preview generated SQL for edits and support Undo/Redo.

#### Scenario: Preview before commit
- WHEN user modifies cells
- THEN a preview dialog shows the batched SQL diff before commit

#### Scenario: Undo/Redo
- WHEN user confirms changes
- THEN changes can be undone/redone within the session

### Requirement: Optional Audit Trail
The system SHALL record an audit entry per commit when enabled.

#### Scenario: Audit enabled
- GIVEN audit is enabled for a table
- WHEN user commits edits
- THEN an entry is stored with user, time, and diff summary


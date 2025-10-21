## ADDED Requirements

### Requirement: Data Diff & One‑Way Sync
The system SHALL compare tables across connections and sync changes safely.

#### Scenario: Row‑level compare
- WHEN user selects source and target tables
- THEN differences are shown by key with insert/update/delete classification

#### Scenario: One‑way sync
- WHEN user confirms sync
- THEN batched operations are applied with constraint/transaction safety and a dry‑run option


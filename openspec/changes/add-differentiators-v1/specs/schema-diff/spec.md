## ADDED Requirements

### Requirement: Schema Diff & Migration
The system SHALL diff schemas across two connections/databases and generate migration scripts.

#### Scenario: Diff two databases
- WHEN user selects source and target
- THEN the system lists DDL differences grouped by object

#### Scenario: Migration generation
- WHEN user selects changes to apply
- THEN SQL scripts are generated with a dry‑run option and destructive warnings


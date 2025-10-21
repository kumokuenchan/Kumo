## ADDED Requirements

### Requirement: Update Single Row With Validation
The system SHALL update a single row identified by a stable key with type and constraint validation.

#### Scenario: Success
- WHEN client sends connectionId, database, table, key (pk values), and changes
- THEN server validates types and constraints and commits within a transaction
- AND responds with updated row snapshot

### Requirement: Insert Row
The system SHALL insert a row with validation and return the inserted row (including auto-increment ids).

#### Scenario: Success
- WHEN client provides field values (missing fields use defaults)
- THEN server validates and inserts within a transaction and returns the row

### Requirement: Delete Row With Constraint Checks
The system SHALL delete a row when not prohibited by FK constraints.

#### Scenario: Constraint violation
- WHEN deletion would violate FK
- THEN server rejects with a descriptive error

### Requirement: Batch Update Multiple Rows
The system SHALL process multiple independent row updates in a single request.

#### Scenario: Partial failure
- WHEN any row fails
- THEN server returns per-row status; transaction boundaries configurable (per-row vs all-or-nothing)

### Requirement: Transaction Management
The system SHALL support begin/commit/rollback around a sequence of write operations.

#### Scenario: Rollback on error
- WHEN any step fails
- THEN the transaction is rolled back and client informed

### Requirement: Data Type Validation
The system SHALL validate values against MySQL column types.

#### Scenario: Invalid type
- WHEN value cannot be coerced to column type
- THEN server rejects with validation errors per field

### Requirement: Constraint Validation (FK, Unique, Check, NOT NULL)
The system SHALL validate constraints pre-insert/update when feasible.

#### Scenario: Unique conflict
- WHEN update would violate unique index
- THEN server rejects with field-level error indicating conflict

### Requirement: Foreign Key Lookup Endpoint
The system SHALL provide FK value lookup for dropdowns with pagination and search.

#### Scenario: Lookup
- WHEN client requests FK options for a column
- THEN server returns value/label pairs and supports `q`, `limit`, `offset`


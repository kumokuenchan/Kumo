## ADDED Requirements

### Requirement: Inline Cell Editing

The system SHALL allow editing cell values directly in the data grid.

#### Scenario: Edit text cell
- **WHEN** user double-clicks cell containing "John" and types "Jane"
- **THEN** cell enters edit mode and accepts new value

#### Scenario: Edit numeric cell
- **WHEN** user edits numeric cell
- **THEN** system validates input is valid number for column data type

#### Scenario: Set NULL value
- **WHEN** user right-clicks cell and selects "Set NULL"
- **THEN** cell value is set to NULL (if column allows NULL)

### Requirement: Data Type Validation

The system SHALL validate edited values against column data types before saving.

#### Scenario: Validate data type
- **WHEN** user enters "abc" in INT column
- **THEN** system displays error and prevents saving invalid value

#### Scenario: Validate string length
- **WHEN** user enters 300 characters in VARCHAR(255) column
- **THEN** system displays error about exceeding maximum length

#### Scenario: Validate date format
- **WHEN** user enters "2024-02-30" in DATE column
- **THEN** system displays error about invalid date

### Requirement: Insert New Rows

The system SHALL provide interface for inserting new rows into tables.

#### Scenario: Add new row
- **WHEN** user clicks "Add Row" button
- **THEN** new empty row appears at top of grid in edit mode

#### Scenario: Insert with default values
- **WHEN** new row is created
- **THEN** columns with default values are pre-filled

#### Scenario: Auto-increment handling
- **WHEN** new row is created in table with auto-increment primary key
- **THEN** auto-increment column is disabled for editing

### Requirement: Delete Rows

The system SHALL allow deleting selected rows with confirmation.

#### Scenario: Delete single row
- **WHEN** user selects row and clicks "Delete"
- **THEN** system prompts for confirmation before executing DELETE statement

#### Scenario: Delete multiple rows
- **WHEN** user selects 5 rows and clicks "Delete"
- **THEN** system shows confirmation with count and deletes all selected rows

#### Scenario: Prevent deleting rows with dependencies
- **WHEN** attempting to delete row referenced by foreign key
- **THEN** system displays error about foreign key constraint

### Requirement: Transaction Management

The system SHALL wrap data modifications in transactions with commit/rollback support.

#### Scenario: Commit changes
- **WHEN** user edits multiple cells and clicks "Commit"
- **THEN** all changes are saved to database in single transaction

#### Scenario: Rollback changes
- **WHEN** user makes edits and clicks "Rollback"
- **THEN** all pending changes are discarded and data is reloaded

#### Scenario: Track pending changes
- **WHEN** user makes edits
- **THEN** modified cells are visually indicated (e.g., highlighted border) until committed

### Requirement: Bulk Edit Operations

The system SHALL support editing multiple rows at once.

#### Scenario: Update multiple rows
- **WHEN** user selects 10 rows and chooses "Set status = 'active'"
- **THEN** system updates all selected rows with new value

#### Scenario: Bulk edit confirmation
- **WHEN** performing bulk edit on 100+ rows
- **THEN** system displays warning and requires explicit confirmation

### Requirement: Foreign Key Column Editing

The system SHALL provide lookup/dropdown for editing foreign key columns.

#### Scenario: Edit foreign key with lookup
- **WHEN** user edits user_id column linked to users table
- **THEN** system displays dropdown with available users (id + display name)

#### Scenario: Search foreign key values
- **WHEN** foreign key table has many rows
- **THEN** dropdown provides search/filter capability

### Requirement: Copy and Paste Support

The system SHALL support copying and pasting data between cells and external applications.

#### Scenario: Copy cell value
- **WHEN** user copies cell with Ctrl+C
- **THEN** cell value is copied to clipboard

#### Scenario: Paste from Excel
- **WHEN** user pastes tab-separated data from Excel
- **THEN** data is pasted into corresponding cells starting from selected cell

#### Scenario: Copy multiple rows
- **WHEN** user selects multiple rows and copies
- **THEN** data is copied in tab-separated format suitable for Excel

### Requirement: Edit History Tracking

The system SHALL track edit history for undo/redo functionality.

#### Scenario: Undo edit
- **WHEN** user presses Ctrl+Z after editing cell
- **THEN** cell value reverts to previous state

#### Scenario: Redo edit
- **WHEN** user presses Ctrl+Y after undo
- **THEN** edit is reapplied

#### Scenario: Multiple undo/redo
- **WHEN** user has made 10 edits
- **THEN** user can undo/redo through complete edit history

### Requirement: Constraint Validation

The system SHALL validate edits against all table constraints before saving.

#### Scenario: Unique constraint validation
- **WHEN** user enters duplicate value in unique column
- **THEN** system displays error and prevents commit

#### Scenario: Check constraint validation
- **WHEN** user enters value violating CHECK constraint
- **THEN** system displays constraint violation error

#### Scenario: NOT NULL constraint validation
- **WHEN** user attempts to set NULL on NOT NULL column
- **THEN** system prevents the operation and displays error message

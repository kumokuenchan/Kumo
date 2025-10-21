## ADDED Requirements

### Requirement: CSV Import

The system SHALL import data from CSV files into database tables.

#### Scenario: Import CSV with headers
- **WHEN** user imports CSV file with header row
- **THEN** system maps CSV columns to table columns based on header names

#### Scenario: Handle delimiter detection
- **WHEN** importing CSV file
- **THEN** system auto-detects delimiter (comma, semicolon, tab) or allows manual selection

#### Scenario: Preview before import
- **WHEN** user selects CSV file
- **THEN** system displays preview of first 10 rows with column mapping options

#### Scenario: Handle data type conversion
- **WHEN** importing CSV data
- **THEN** system converts string values to appropriate data types (numbers, dates, booleans)

### Requirement: CSV Export

The system SHALL export table data or query results to CSV format.

#### Scenario: Export entire table
- **WHEN** user exports "users" table to CSV
- **THEN** system generates CSV file with headers and all rows

#### Scenario: Export query results
- **WHEN** user exports results of SELECT query
- **THEN** system generates CSV with columns from query result set

#### Scenario: Select CSV delimiter
- **WHEN** exporting to CSV
- **THEN** user can choose delimiter (comma, semicolon, tab, pipe)

#### Scenario: Handle special characters
- **WHEN** exporting data containing commas or quotes
- **THEN** values are properly escaped and quoted in CSV output

### Requirement: JSON Import

The system SHALL import data from JSON files into database tables.

#### Scenario: Import JSON array
- **WHEN** user imports JSON array of objects
- **THEN** each object is inserted as table row with matching field names

#### Scenario: Nested JSON handling
- **WHEN** JSON contains nested objects
- **THEN** user can select to flatten or store as JSON column type

#### Scenario: JSON schema validation
- **WHEN** importing JSON
- **THEN** system validates JSON structure matches table schema

### Requirement: JSON Export

The system SHALL export data to JSON format.

#### Scenario: Export as JSON array
- **WHEN** user exports table to JSON
- **THEN** system generates JSON array with objects for each row

#### Scenario: Pretty-print JSON
- **WHEN** exporting JSON
- **THEN** user can choose between compact and formatted (indented) output

#### Scenario: Handle date serialization
- **WHEN** exporting date/datetime columns to JSON
- **THEN** dates are formatted as ISO 8601 strings

### Requirement: SQL Dump Export

The system SHALL generate SQL dump files for backup and migration.

#### Scenario: Export table as SQL dump
- **WHEN** user exports "users" table as SQL
- **THEN** system generates file with CREATE TABLE and INSERT statements

#### Scenario: Export database as SQL dump
- **WHEN** user exports entire database
- **THEN** system generates complete SQL dump with all tables, data, and constraints

#### Scenario: Include DROP statements
- **WHEN** exporting SQL dump
- **THEN** user can optionally include DROP TABLE IF EXISTS statements

#### Scenario: Export schema only
- **WHEN** user selects "Schema Only" option
- **THEN** SQL dump contains only CREATE TABLE statements without INSERT data

#### Scenario: Export data only
- **WHEN** user selects "Data Only" option
- **THEN** SQL dump contains only INSERT statements without CREATE TABLE

### Requirement: SQL Dump Import

The system SHALL execute SQL dump files to restore data.

#### Scenario: Import SQL dump
- **WHEN** user imports SQL dump file
- **THEN** system executes SQL statements to recreate tables and insert data

#### Scenario: Handle large SQL files
- **WHEN** importing multi-GB SQL dump
- **THEN** system processes file in chunks to avoid memory issues

#### Scenario: Import error handling
- **WHEN** SQL dump contains invalid statements
- **THEN** system displays error, shows problematic statement, and allows skipping or stopping

### Requirement: Excel Export

The system SHALL export data to Excel format (XLSX).

#### Scenario: Export to Excel workbook
- **WHEN** user exports table to Excel
- **THEN** system generates XLSX file with data in first worksheet

#### Scenario: Export multiple tables
- **WHEN** user exports multiple tables to Excel
- **THEN** each table is placed in separate worksheet within single workbook

#### Scenario: Preserve formatting
- **WHEN** exporting to Excel
- **THEN** column headers are bold and columns are auto-sized to fit content

### Requirement: Import Progress and Cancellation

The system SHALL show progress during import operations and allow cancellation.

#### Scenario: Display import progress
- **WHEN** importing large file
- **THEN** system displays progress bar with rows processed count

#### Scenario: Cancel import operation
- **WHEN** user clicks "Cancel" during import
- **THEN** import stops and changes are rolled back (if in transaction)

### Requirement: Data Transformation During Import

The system SHALL provide options for transforming data during import.

#### Scenario: Skip duplicate rows
- **WHEN** importing CSV with duplicate primary keys
- **THEN** user can choose to skip duplicates or update existing rows

#### Scenario: Update on duplicate key
- **WHEN** importing data with existing primary keys
- **THEN** user can select "Update on duplicate" to overwrite existing rows

#### Scenario: Custom column mapping
- **WHEN** importing CSV where column names don't match table
- **THEN** user can manually map CSV columns to table columns

### Requirement: Export Filtering and Selection

The system SHALL allow exporting subsets of data based on filters or selection.

#### Scenario: Export filtered data
- **WHEN** user has applied filters to data grid and exports
- **THEN** only filtered rows are included in export

#### Scenario: Export selected rows
- **WHEN** user selects specific rows and chooses "Export Selected"
- **THEN** only selected rows are exported

#### Scenario: Export with custom WHERE clause
- **WHEN** user provides WHERE condition for export
- **THEN** only rows matching condition are exported

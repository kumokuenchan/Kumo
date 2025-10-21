## ADDED Requirements

### Requirement: Visual Table Selection

The system SHALL allow users to visually select tables for queries from the database schema.

#### Scenario: Add table to query builder
- **WHEN** user drags "users" table from schema tree to query builder canvas
- **THEN** table is displayed with its columns in the visual designer

#### Scenario: Display table relationships
- **WHEN** multiple related tables are added to canvas
- **THEN** foreign key relationships are displayed as connecting lines

### Requirement: Column Selection Interface

The system SHALL provide visual interface for selecting columns to include in the query.

#### Scenario: Select columns from table
- **WHEN** user checks columns "id", "name", "email" from users table
- **THEN** those columns are added to SELECT clause of generated query

#### Scenario: Select all columns
- **WHEN** user clicks "Select All" on table
- **THEN** all columns from table are included in SELECT clause

### Requirement: JOIN Operations

The system SHALL support visual creation of JOIN operations between tables.

#### Scenario: Create INNER JOIN
- **WHEN** user drags connection from users.id to orders.user_id and selects "INNER JOIN"
- **THEN** generated query includes "INNER JOIN orders ON users.id = orders.user_id"

#### Scenario: Select JOIN type
- **WHEN** user clicks on relationship line
- **THEN** system displays options for INNER, LEFT, RIGHT, and FULL OUTER joins

### Requirement: WHERE Clause Builder

The system SHALL provide visual interface for adding WHERE conditions.

#### Scenario: Add simple condition
- **WHEN** user adds condition "status = 'active'"
- **THEN** WHERE clause is added to generated query

#### Scenario: Add multiple conditions with AND/OR
- **WHEN** user adds conditions "status = 'active'" AND "age > 18"
- **THEN** query includes "WHERE status = 'active' AND age > 18"

#### Scenario: Use comparison operators
- **WHEN** building condition
- **THEN** user can select from operators: =, !=, <, >, <=, >=, LIKE, IN, BETWEEN, IS NULL

### Requirement: ORDER BY and LIMIT Controls

The system SHALL provide controls for sorting and limiting query results.

#### Scenario: Add ORDER BY clause
- **WHEN** user selects "name" column and chooses "Sort Ascending"
- **THEN** query includes "ORDER BY name ASC"

#### Scenario: Add LIMIT clause
- **WHEN** user sets limit to 100
- **THEN** query includes "LIMIT 100"

### Requirement: GROUP BY and Aggregations

The system SHALL support GROUP BY operations and aggregate functions.

#### Scenario: Add GROUP BY clause
- **WHEN** user selects "category" for grouping
- **THEN** query includes "GROUP BY category"

#### Scenario: Add aggregate function
- **WHEN** user adds COUNT(*) aggregation
- **THEN** query includes aggregate function in SELECT clause

### Requirement: Query Preview and Execution

The system SHALL display generated SQL query and allow execution from query builder.

#### Scenario: Preview generated SQL
- **WHEN** user builds query visually
- **THEN** generated SQL is displayed in read-only preview pane with syntax highlighting

#### Scenario: Execute query from builder
- **WHEN** user clicks "Execute" in query builder
- **THEN** generated SQL is executed and results are displayed

#### Scenario: Edit generated SQL
- **WHEN** user clicks "Edit SQL"
- **THEN** generated query is copied to SQL editor for manual modification

### Requirement: Query Builder State Persistence

The system SHALL save query builder state for later modification.

#### Scenario: Save query builder configuration
- **WHEN** user saves query from builder
- **THEN** visual configuration and generated SQL are both saved

#### Scenario: Reopen saved visual query
- **WHEN** user opens previously saved visual query
- **THEN** query builder restores table positions, joins, and conditions

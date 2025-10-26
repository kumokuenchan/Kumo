## MODIFIED Requirements

### Requirement: Table Creation

The system SHALL provide a visual interface for creating new tables with columns, data types, constraints, indexes, foreign keys, and triggers through a tabbed designer UI.

#### Scenario: Create new table visually
- **WHEN** user opens table designer and adds fields with properties
- **THEN** system displays live SQL preview and allows saving to execute CREATE TABLE statement

#### Scenario: Add primary key visually
- **WHEN** user clicks primary key icon for a field in designer
- **THEN** field is marked with key icon and PRIMARY KEY constraint is included in SQL

#### Scenario: Add indexes visually
- **WHEN** user adds index in Indexes tab
- **THEN** index definition appears in SQL preview and is created when table is saved

### Requirement: Table Modification

The system SHALL allow modifying existing table structure through visual designer with live preview of ALTER TABLE statements.

#### Scenario: Add column to existing table visually
- **WHEN** user opens existing table in designer and adds new field
- **THEN** system shows ALTER TABLE ADD COLUMN in SQL preview

#### Scenario: Modify column definition visually
- **WHEN** user changes field properties in designer grid
- **THEN** system generates appropriate ALTER TABLE MODIFY COLUMN statement

#### Scenario: Drop column visually
- **WHEN** user deletes field from designer grid
- **THEN** system prompts for confirmation and shows ALTER TABLE DROP COLUMN in preview

## ADDED Requirements

### Requirement: Visual Table Designer Interface

The system SHALL provide a tabbed interface for comprehensive table design including Fields, Indexes, Foreign Keys, Triggers, Options, Comment, and SQL Preview tabs.

#### Scenario: Open table designer for new table
- **WHEN** user selects "New Table" from schema menu
- **THEN** designer opens with empty Fields tab and all other tabs available

#### Scenario: Open table designer for existing table
- **WHEN** user double-clicks table in schema tree
- **THEN** designer opens with all current table properties loaded into respective tabs

#### Scenario: Switch between designer tabs
- **WHEN** user clicks different tabs (Fields, Indexes, etc.)
- **THEN** appropriate editor interface is displayed for that aspect of table design

### Requirement: Fields Tab - Visual Field Editor

The system SHALL provide an inline-editable data grid for managing table fields with support for all MySQL column attributes.

#### Scenario: Add new field
- **WHEN** user clicks "Add Field" button in toolbar
- **THEN** new empty row appears in fields grid ready for editing

#### Scenario: Edit field inline
- **WHEN** user clicks on any cell in fields grid
- **THEN** cell becomes editable with appropriate input (text, dropdown, checkbox)

#### Scenario: Define field name and type
- **WHEN** user enters field name "user_id" and selects type "int"
- **THEN** field is added to table definition with specified name and data type

#### Scenario: Set field length or values
- **WHEN** user enters length "11" for int or values for enum
- **THEN** data type includes length specification or enum values in SQL

#### Scenario: Configure field attributes
- **WHEN** user checks "Not null", "Unsigned", "Auto Increment", or "Zerofill" checkboxes
- **THEN** corresponding attributes are applied to field definition

#### Scenario: Set default value
- **WHEN** user enters default value in Default column
- **THEN** DEFAULT clause is included in field definition

#### Scenario: Add field comment
- **WHEN** user enters text in Comment column
- **THEN** COMMENT clause is included in field definition

#### Scenario: Mark field as virtual
- **WHEN** user checks "Virtual" checkbox and provides expression
- **THEN** field is defined as generated column with VIRTUAL keyword

#### Scenario: Mark field as primary key
- **WHEN** user clicks key icon in toolbar with field selected
- **THEN** field is marked with key icon and added to PRIMARY KEY constraint

#### Scenario: Delete field
- **WHEN** user selects field and clicks "Delete Field" button
- **THEN** field is removed from grid and table definition

#### Scenario: Reorder fields
- **WHEN** user selects field and clicks "Move Up" or "Move Down" buttons
- **THEN** field position changes in grid and in CREATE TABLE column order

### Requirement: Indexes Tab - Visual Index Designer

The system SHALL provide interface for creating and managing table indexes including simple, composite, unique, and fulltext indexes.

#### Scenario: Create simple index
- **WHEN** user adds index with name "idx_email" on single column "email"
- **THEN** CREATE INDEX statement is included in SQL preview

#### Scenario: Create composite index
- **WHEN** user adds index with multiple columns (last_name, first_name)
- **THEN** multi-column index definition appears in SQL

#### Scenario: Create unique index
- **WHEN** user adds index and selects "Unique" type
- **THEN** CREATE UNIQUE INDEX statement is generated

#### Scenario: Create fulltext index
- **WHEN** user adds index on text column and selects "Fulltext" type
- **THEN** FULLTEXT INDEX is included in table definition

#### Scenario: Set index method
- **WHEN** user selects index method (BTREE or HASH)
- **THEN** USING clause is included in index definition

#### Scenario: Delete index
- **WHEN** user removes index from indexes tab
- **THEN** index is removed from table definition and DROP INDEX shown for existing tables

### Requirement: Foreign Keys Tab - Visual Foreign Key Designer

The system SHALL provide interface for creating and managing foreign key relationships with cascade options.

#### Scenario: Create foreign key
- **WHEN** user adds FK from "user_id" column to "users.id"
- **THEN** FOREIGN KEY constraint with REFERENCES clause is generated

#### Scenario: Set cascade options
- **WHEN** user selects ON DELETE CASCADE and ON UPDATE SET NULL
- **THEN** foreign key includes specified referential actions

#### Scenario: Name foreign key constraint
- **WHEN** user provides constraint name "fk_user"
- **THEN** CONSTRAINT clause with name is included in FK definition

#### Scenario: Multi-column foreign key
- **WHEN** user creates FK referencing composite primary key
- **THEN** multiple columns are included in FOREIGN KEY column list

#### Scenario: Delete foreign key
- **WHEN** user removes FK from foreign keys tab
- **THEN** constraint is removed from definition and DROP FOREIGN KEY shown for existing tables

### Requirement: Triggers Tab - Trigger Management

The system SHALL provide interface for creating and editing table triggers with SQL editor.

#### Scenario: Create trigger
- **WHEN** user adds trigger with name, timing (BEFORE/AFTER), and event (INSERT/UPDATE/DELETE)
- **THEN** CREATE TRIGGER template is generated with editable SQL body

#### Scenario: Edit trigger SQL
- **WHEN** user enters trigger body SQL in code editor
- **THEN** syntax highlighting and validation are provided

#### Scenario: Set trigger timing
- **WHEN** user selects "BEFORE" or "AFTER" timing
- **THEN** trigger executes at specified time relative to triggering event

#### Scenario: Set trigger event
- **WHEN** user selects INSERT, UPDATE, or DELETE event
- **THEN** trigger activates only for specified DML operation

#### Scenario: Delete trigger
- **WHEN** user removes trigger from triggers tab
- **THEN** DROP TRIGGER statement is generated for existing triggers

### Requirement: Options Tab - Table Configuration

The system SHALL provide interface for configuring table-level options including engine, character set, collation, and auto-increment settings.

#### Scenario: Select storage engine
- **WHEN** user selects engine from dropdown (InnoDB, MyISAM, MEMORY, etc.)
- **THEN** ENGINE clause is included in CREATE TABLE statement

#### Scenario: Set character set
- **WHEN** user selects character set (utf8, utf8mb4, latin1, etc.)
- **THEN** CHARACTER SET clause is included in table options

#### Scenario: Set collation
- **WHEN** user selects collation specific to character set
- **THEN** COLLATE clause is included in table options

#### Scenario: Set auto-increment start value
- **WHEN** user enters starting value for AUTO_INCREMENT
- **THEN** AUTO_INCREMENT = N clause is included in table options

#### Scenario: Set table comment
- **WHEN** user enters table-level comment in Comment tab
- **THEN** COMMENT clause is included in CREATE TABLE statement

### Requirement: SQL Preview Tab - Live DDL Preview

The system SHALL display real-time preview of generated SQL DDL statements as user modifies table design.

#### Scenario: Preview CREATE TABLE
- **WHEN** user designs new table with fields and constraints
- **THEN** SQL preview shows complete CREATE TABLE statement with all definitions

#### Scenario: Preview ALTER TABLE
- **WHEN** user modifies existing table structure
- **THEN** SQL preview shows ALTER TABLE statements for each change

#### Scenario: Copy SQL to clipboard
- **WHEN** user clicks "Copy SQL" button in preview tab
- **THEN** generated SQL is copied to clipboard for manual execution or review

#### Scenario: Preview updates on change
- **WHEN** user makes any change in any designer tab
- **THEN** SQL preview immediately reflects the modification

### Requirement: Designer Toolbar Actions

The system SHALL provide toolbar with common actions for table design workflow.

#### Scenario: Save table design
- **WHEN** user clicks "Save" button in toolbar
- **THEN** generated SQL is executed and table is created or altered in database

#### Scenario: Add field via toolbar
- **WHEN** user clicks "Add Field" button
- **THEN** new field row is inserted at bottom of fields grid

#### Scenario: Delete field via toolbar
- **WHEN** user selects field and clicks "Delete Field" button
- **THEN** confirmation dialog appears and field is removed on confirmation

#### Scenario: Move field up
- **WHEN** user selects field and clicks "Move Up" button
- **THEN** field swaps position with field above it

#### Scenario: Move field down
- **WHEN** user selects field and clicks "Move Down" button
- **THEN** field swaps position with field below it

#### Scenario: Set primary key via toolbar
- **WHEN** user selects field and clicks key icon button
- **THEN** field is marked as primary key or removed from primary key

### Requirement: Field Data Type Support

The system SHALL provide dropdown selection for all MySQL data types with appropriate parameter inputs.

#### Scenario: Select numeric types with length
- **WHEN** user selects INT, BIGINT, TINYINT, etc.
- **THEN** length field is enabled for display width specification

#### Scenario: Select decimal types with precision
- **WHEN** user selects DECIMAL or NUMERIC
- **THEN** length field accepts precision and scale (e.g., "10,2")

#### Scenario: Select string types with length
- **WHEN** user selects VARCHAR or CHAR
- **THEN** length field is required and accepts maximum character length

#### Scenario: Select text types without length
- **WHEN** user selects TEXT, MEDIUMTEXT, LONGTEXT
- **THEN** length field is disabled (not applicable)

#### Scenario: Select enum/set with values
- **WHEN** user selects ENUM or SET type
- **THEN** values field accepts comma-separated quoted values (e.g., 'value1','value2')

#### Scenario: Select date/time types
- **WHEN** user selects DATE, TIME, DATETIME, TIMESTAMP, YEAR
- **THEN** appropriate type is applied without length requirement

#### Scenario: Select binary types
- **WHEN** user selects BINARY, VARBINARY, BLOB types
- **THEN** appropriate parameters are enabled based on type

### Requirement: Table Designer Validation

The system SHALL validate table design before allowing save and provide clear error messages.

#### Scenario: Validate table name required
- **WHEN** user attempts to save table without entering table name
- **THEN** error message indicates table name is required

#### Scenario: Validate at least one field required
- **WHEN** user attempts to save table with no fields
- **THEN** error message indicates table must have at least one column

#### Scenario: Validate duplicate field names
- **WHEN** user enters duplicate field names
- **THEN** error highlights duplicate fields and prevents save

#### Scenario: Validate primary key on NOT NULL fields
- **WHEN** user sets field as primary key that allows NULL
- **THEN** system automatically sets field to NOT NULL

#### Scenario: Validate foreign key references
- **WHEN** user creates FK referencing non-existent table or column
- **THEN** error message indicates referenced table/column must exist

#### Scenario: Validate enum/set values format
- **WHEN** user enters malformed enum values (missing quotes or commas)
- **THEN** error indicates correct format: 'value1','value2','value3'

#### Scenario: Validate data type compatibility
- **WHEN** user sets incompatible attributes (e.g., AUTO_INCREMENT on VARCHAR)
- **THEN** error indicates AUTO_INCREMENT requires numeric primary key

### Requirement: Table Designer Persistence

The system SHALL preserve unsaved changes and warn before discarding modifications.

#### Scenario: Warn on close with unsaved changes
- **WHEN** user attempts to close designer with unsaved changes
- **THEN** confirmation dialog warns about losing unsaved work

#### Scenario: Highlight save button when modified
- **WHEN** user makes any change to table design
- **THEN** save button becomes highlighted/enabled indicating unsaved changes

#### Scenario: Disable save when no changes
- **WHEN** designer is opened with no modifications
- **THEN** save button is disabled until changes are made

#### Scenario: Reset to original on cancel
- **WHEN** user clicks cancel in unsaved changes warning
- **THEN** all changes are discarded and original table structure is restored

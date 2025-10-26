# Table Designer UI Enhancement

## Why

The existing schema management specification covers basic table creation and modification through programmatic APIs, but lacks a comprehensive visual table designer interface that database administrators expect from professional database management tools. Users need a spreadsheet-like interface to design table structures visually with immediate feedback, similar to tools like Navicat, MySQL Workbench, and phpMyAdmin. The current implementation requires users to manually write or generate SQL, which is error-prone and time-consuming for complex table designs involving multiple columns, indexes, foreign keys, and triggers.

## What Changes

- **ADDED**: Visual table designer with tabbed interface (Fields, Indexes, Foreign Keys, Triggers, Options, Comment, SQL Preview)
- **ADDED**: Inline editable data grid for field management with drag-and-drop reordering
- **ADDED**: Real-time SQL preview showing generated DDL statements
- **ADDED**: Visual index designer with composite index support
- **ADDED**: Visual foreign key designer with relationship configuration
- **ADDED**: Trigger management UI for creating and editing triggers
- **ADDED**: Table options editor (engine, charset, collation, auto-increment, comment)
- **ADDED**: Field property editors for all MySQL data types and attributes
- **ADDED**: Toolbar with Save, Add Field, Delete Field, Move Up/Down, and Primary Key designation
- **MODIFIED**: Enhanced schema-management capability to include comprehensive UI-driven table design

## Impact

- Affected specs: `schema-management`
- Affected code:
  - New: `src/features/schema/TableDesigner.tsx` (main designer component)
  - New: `src/features/schema/FieldsTab.tsx` (field grid editor)
  - New: `src/features/schema/IndexesTab.tsx` (index designer)
  - New: `src/features/schema/ForeignKeysTab.tsx` (FK designer)
  - New: `src/features/schema/TriggersTab.tsx` (trigger editor)
  - New: `src/features/schema/OptionsTab.tsx` (table options)
  - New: `src/features/schema/SqlPreviewTab.tsx` (DDL preview)
  - New: `src/api/schema.ts` (additional endpoints for table design operations)
  - New: `server/routes/schema.ts` (backend API for DDL generation and validation)
- Dependencies: TanStack Table for grid, Monaco Editor for trigger SQL editing
- Performance: Minimal impact - UI is reactive and updates only on user action
- Migration: None required - this is a new UI feature that enhances existing functionality

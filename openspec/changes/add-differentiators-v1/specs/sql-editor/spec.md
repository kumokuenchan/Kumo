## ADDED Requirements

### Requirement: Smart Autocomplete & Macros
The system SHALL provide schema‑aware autocomplete and reusable macros.

#### Scenario: FK‑aware JOIN suggestion
- WHEN user types FROM <table> and triggers autocomplete
- THEN JOIN suggestions to FK‑related tables are listed with ON clause templates

#### Scenario: Parameterized snippets
- WHEN user inserts a macro snippet
- THEN parameters are prompted and expanded into SQL


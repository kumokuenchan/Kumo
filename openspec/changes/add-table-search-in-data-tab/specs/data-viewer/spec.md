## ADDED Requirements

### Requirement: Table List Search in Data Tab

The system SHALL allow users to search tables by name within the Data tab's table selector.

#### Scenario: Filter tables by name
- WHEN the user types "user" in the table search box
- THEN only tables whose names contain "user" (case-insensitive) are shown

#### Scenario: Clear search
- WHEN the user clicks Clear
- THEN the search term is emptied and the full table list is restored

#### Scenario: No matches
- WHEN the search term matches no tables
- THEN an empty-state message is displayed instead of the grid


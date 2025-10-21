## ADDED Requirements

### Requirement: Round‑Trip Visual Builder
The system SHALL maintain 1:1 parity between the visual graph and SQL text.

#### Scenario: Edit graph updates SQL
- WHEN user adds a JOIN edge
- THEN SQL updates with correct JOIN clause

#### Scenario: Edit SQL updates graph
- WHEN user edits SELECT/JOIN in SQL
- THEN graph nodes/edges update to match

### Requirement: EXPLAIN Overlay
The system SHALL display EXPLAIN data over the visual graph.

#### Scenario: Cost visualization
- WHEN user toggles EXPLAIN overlay
- THEN edges display row estimates and color by cost

#### Scenario: Index hints
- WHEN EXPLAIN indicates missing/unused index
- THEN the related node shows a hint icon with details


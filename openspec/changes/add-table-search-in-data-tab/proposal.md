## Why
Users need a quick way to find a table within databases when using the Data tab. Large schemas make scrolling cumbersome.

## What Changes
- Add client-side table search box to the Data tab's table selector.
- Filter tables by name (case-insensitive) as the user types.
- Show empty-state when no matches.

## Impact
- Affected specs: data-viewer (table selection UX)
- Affected code: `src/features/dataViewer/TableSelector.tsx`


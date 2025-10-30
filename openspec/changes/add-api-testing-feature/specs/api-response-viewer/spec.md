## ADDED Requirements

### Requirement: Response Status Display

The system SHALL prominently display HTTP response status code and text.

#### Scenario: Display 200 OK status
- **WHEN** request returns 200 status code
- **THEN** system displays "200 OK" in green color

#### Scenario: Display 404 Not Found status
- **WHEN** request returns 404 status code
- **THEN** system displays "404 Not Found" in orange color

#### Scenario: Display 500 Server Error status
- **WHEN** request returns 500 status code
- **THEN** system displays "500 Internal Server Error" in red color

### Requirement: Response Body Formatting

The system SHALL format and display response body with syntax highlighting.

#### Scenario: Format JSON response
- **WHEN** response Content-Type is "application/json"
- **THEN** system displays formatted JSON with syntax highlighting in Monaco Editor

#### Scenario: Format XML response
- **WHEN** response Content-Type is "application/xml"
- **THEN** system displays formatted XML with syntax highlighting

#### Scenario: Display HTML response
- **WHEN** response Content-Type is "text/html"
- **THEN** system displays HTML code with syntax highlighting

#### Scenario: Display plain text response
- **WHEN** response Content-Type is "text/plain"
- **THEN** system displays plain text without formatting

#### Scenario: Display image response
- **WHEN** response Content-Type is image (image/png, image/jpeg)
- **THEN** system displays image preview

### Requirement: Response Body View Options

The system SHALL provide different view modes for response body.

#### Scenario: Pretty view for JSON
- **WHEN** user selects "Pretty" view for JSON response
- **THEN** JSON is formatted with proper indentation and colors

#### Scenario: Raw view for any response
- **WHEN** user selects "Raw" view
- **THEN** response body is displayed as-is without formatting

#### Scenario: Preview view for HTML
- **WHEN** user selects "Preview" view for HTML response
- **THEN** HTML is rendered in iframe preview

### Requirement: Response Headers Display

The system SHALL display response headers in organized format.

#### Scenario: View response headers
- **WHEN** user clicks "Headers" tab in response viewer
- **THEN** all response headers are displayed in table format

#### Scenario: Search response headers
- **WHEN** user types "content" in headers search
- **THEN** only headers containing "content" are displayed (e.g., Content-Type, Content-Length)

#### Scenario: Copy response header value
- **WHEN** user clicks copy icon next to header value
- **THEN** header value is copied to clipboard

### Requirement: Response Metadata Display

The system SHALL display request metadata and timing information.

#### Scenario: Display response time
- **WHEN** request completes
- **THEN** system displays "Time: 245 ms" in response header

#### Scenario: Display response size
- **WHEN** request completes
- **THEN** system displays "Size: 1.2 KB" in response header

#### Scenario: Display request timestamp
- **WHEN** request completes
- **THEN** system displays timestamp "Completed at 2:30:45 PM"

### Requirement: Response Body Copy and Export

The system SHALL allow copying and exporting response body.

#### Scenario: Copy response body
- **WHEN** user clicks "Copy" button
- **THEN** entire response body is copied to clipboard

#### Scenario: Export response to file
- **WHEN** user clicks "Save to File" button
- **THEN** system prompts to save response with appropriate file extension

#### Scenario: Copy as cURL command
- **WHEN** user clicks "Copy as cURL"
- **THEN** equivalent cURL command is copied to clipboard

### Requirement: Response Size Handling

The system SHALL handle large responses efficiently.

#### Scenario: Warn on large responses
- **WHEN** response size exceeds 10 MB
- **THEN** system displays warning "Large response (12 MB). Display may be slow."

#### Scenario: Truncate very large responses
- **WHEN** response size exceeds 50 MB
- **THEN** system displays first 10 MB with message "Response truncated. Full response: 52 MB"

#### Scenario: Stream large file downloads
- **WHEN** user downloads file response > 50 MB
- **THEN** system streams download instead of loading into memory

### Requirement: Response Navigation

The system SHALL provide navigation within response body.

#### Scenario: Search within response
- **WHEN** user opens search in response viewer (Ctrl+F)
- **THEN** search bar appears with find/replace functionality

#### Scenario: Collapse/expand JSON nodes
- **WHEN** user clicks collapse icon next to JSON array or object
- **THEN** node collapses to show only key without values

#### Scenario: Navigate to specific JSON path
- **WHEN** user clicks on nested JSON property
- **THEN** breadcrumb shows JSON path (e.g., "data.users[0].name")

### Requirement: Error Response Handling

The system SHALL display error responses with helpful context.

#### Scenario: Display validation error details
- **WHEN** API returns 422 with validation errors in body
- **THEN** system highlights errors and displays them prominently

#### Scenario: Display error message extraction
- **WHEN** response contains error in standard format {"error": "message"}
- **THEN** system extracts and displays error message prominently

### Requirement: Response Comparison

The system SHALL allow comparing responses from multiple requests.

#### Scenario: Save response for comparison
- **WHEN** user clicks "Save for Comparison" button
- **THEN** response is stored temporarily for comparison

#### Scenario: Compare two responses
- **WHEN** user clicks "Compare" with saved response
- **THEN** side-by-side diff view displays differences between responses

### Requirement: Integration Actions

The system SHALL provide quick actions for database integration.

#### Scenario: Quick SQL query from response
- **WHEN** user clicks "Query Database" button in response viewer
- **THEN** system switches to SQL tab with extracted IDs pre-filled in query

#### Scenario: Extract data from response
- **WHEN** user selects JSON path in response (e.g., data.users[].id)
- **THEN** system offers to extract selected values to variable or SQL query

## ADDED Requirements

### Requirement: HTTP Method Selection

The system SHALL provide a dropdown to select HTTP request methods.

#### Scenario: Select common HTTP methods
- **WHEN** user clicks method selector dropdown
- **THEN** system displays options: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

#### Scenario: Change request method
- **WHEN** user changes method from GET to POST
- **THEN** request body editor becomes available for editing

### Requirement: URL Input and Validation

The system SHALL provide URL input with validation and environment variable interpolation.

#### Scenario: Enter valid URL
- **WHEN** user types "https://api.example.com/users"
- **THEN** system validates URL format and shows no errors

#### Scenario: Enter invalid URL
- **WHEN** user types "not-a-valid-url"
- **THEN** system displays validation error "Invalid URL format"

#### Scenario: Use environment variable in URL
- **WHEN** user types "{{baseUrl}}/users" and baseUrl is defined
- **THEN** system displays resolved URL preview below input

### Requirement: Query Parameters Editor

The system SHALL provide key-value editor for URL query parameters.

#### Scenario: Add query parameter
- **WHEN** user adds parameter key="page" value="1"
- **THEN** URL updates to include "?page=1"

#### Scenario: Multiple query parameters
- **WHEN** user adds multiple parameters (page=1, limit=10, sort=desc)
- **THEN** URL updates to "?page=1&limit=10&sort=desc"

#### Scenario: Disable query parameter
- **WHEN** user unchecks parameter checkbox
- **THEN** parameter is excluded from request but remains in editor

#### Scenario: Bulk edit query parameters
- **WHEN** user clicks "Bulk Edit" in query params section
- **THEN** system shows textarea for editing parameters in query string format

### Requirement: Request Headers Editor

The system SHALL provide key-value editor for HTTP headers.

#### Scenario: Add custom header
- **WHEN** user adds header "X-Custom-Header: value"
- **THEN** header is included in request

#### Scenario: Auto-suggest common headers
- **WHEN** user types "Content" in header key field
- **THEN** system suggests "Content-Type", "Content-Length", "Content-Encoding"

#### Scenario: Auto-suggest header values
- **WHEN** user selects "Content-Type" header
- **THEN** system suggests common values: "application/json", "application/x-www-form-urlencoded", "multipart/form-data"

#### Scenario: Disable header temporarily
- **WHEN** user unchecks header checkbox
- **THEN** header is excluded from request but remains in editor

### Requirement: Request Body Editor

The system SHALL provide tabbed interface for different body types.

#### Scenario: JSON body editing
- **WHEN** user selects "JSON" body type
- **THEN** Monaco Editor opens with JSON syntax highlighting and validation

#### Scenario: Form-data body editing
- **WHEN** user selects "form-data" body type
- **THEN** key-value editor displays with file upload support for values

#### Scenario: Raw text body editing
- **WHEN** user selects "raw" body type
- **THEN** textarea displays for entering plain text body

#### Scenario: No body for GET requests
- **WHEN** user selects GET or DELETE method
- **THEN** body editor is disabled or hidden

#### Scenario: Body type affects Content-Type header
- **WHEN** user selects "JSON" body type
- **THEN** Content-Type header auto-updates to "application/json"

### Requirement: Request Execution

The system SHALL send HTTP requests and handle responses.

#### Scenario: Execute simple GET request
- **WHEN** user clicks "Send" button with GET request to "https://api.example.com/users"
- **THEN** system makes request and displays response in response viewer

#### Scenario: Execute POST request with JSON body
- **WHEN** user sends POST request with JSON body {"name": "John"}
- **THEN** system includes body in request and displays response

#### Scenario: Display request progress
- **WHEN** request is in flight
- **THEN** "Send" button shows loading spinner and displays "Sending..."

#### Scenario: Cancel pending request
- **WHEN** user clicks "Cancel" during request execution
- **THEN** request is aborted and response viewer shows cancellation message

### Requirement: Request Error Handling

The system SHALL display clear error messages for request failures.

#### Scenario: Network error
- **WHEN** request fails due to network error
- **THEN** system displays "Network Error: Unable to reach server"

#### Scenario: Timeout error
- **WHEN** request exceeds 30 second timeout
- **THEN** system displays "Request Timeout: No response after 30 seconds"

#### Scenario: DNS resolution failure
- **WHEN** hostname cannot be resolved
- **THEN** system displays "DNS Error: Cannot resolve hostname"

### Requirement: Request Timing Information

The system SHALL display timing information for requests.

#### Scenario: Show response time
- **WHEN** request completes successfully
- **THEN** system displays "Response time: 245 ms"

#### Scenario: Show response size
- **WHEN** request completes successfully
- **THEN** system displays "Response size: 1.2 KB"

### Requirement: Pre-request Processing

The system SHALL process environment variables before sending requests.

#### Scenario: Interpolate variables in URL
- **WHEN** URL contains "{{apiKey}}" and apiKey is defined
- **THEN** system replaces with actual value before sending

#### Scenario: Interpolate variables in headers
- **WHEN** header value contains "Bearer {{token}}"
- **THEN** system replaces {{token}} with actual value before sending

#### Scenario: Interpolate variables in body
- **WHEN** JSON body contains "{{userId}}"
- **THEN** system replaces with actual value before sending

#### Scenario: Undefined variable warning
- **WHEN** request contains "{{undefinedVar}}"
- **THEN** system displays warning "Variable 'undefinedVar' is not defined"

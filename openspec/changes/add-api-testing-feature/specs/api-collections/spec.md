## ADDED Requirements

### Requirement: Save API Requests

The system SHALL allow users to save API requests with descriptive names.

#### Scenario: Save new request
- **WHEN** user clicks "Save" button after configuring request
- **THEN** dialog prompts for request name and optional folder

#### Scenario: Save request with name
- **WHEN** user enters "Get All Users" as name and clicks Save
- **THEN** request is saved and appears in Saved Requests sidebar

#### Scenario: Update existing saved request
- **WHEN** user modifies saved request and clicks "Save"
- **THEN** changes are saved to existing request without prompting

#### Scenario: Save As new request
- **WHEN** user clicks "Save As" on existing request
- **THEN** dialog prompts for new name to create copy

### Requirement: Organize Requests in Folders

The system SHALL support organizing saved requests into folders.

#### Scenario: Create new folder
- **WHEN** user clicks "New Folder" in sidebar
- **THEN** dialog prompts for folder name

#### Scenario: Save request to folder
- **WHEN** user saves request and selects "User Management" folder
- **THEN** request appears under User Management folder in sidebar

#### Scenario: Move request between folders
- **WHEN** user drags request to different folder
- **THEN** request is moved to target folder

#### Scenario: Rename folder
- **WHEN** user right-clicks folder and selects "Rename"
- **THEN** folder name becomes editable

### Requirement: Request Collections Sidebar

The system SHALL display saved requests in organized sidebar.

#### Scenario: Display folder structure
- **WHEN** user opens API tab
- **THEN** sidebar shows folders with saved requests in tree structure

#### Scenario: Collapse/expand folders
- **WHEN** user clicks folder name
- **THEN** folder expands or collapses to show/hide contained requests

#### Scenario: Search saved requests
- **WHEN** user types "user" in sidebar search
- **THEN** only requests containing "user" in name are displayed

#### Scenario: Recent requests section
- **WHEN** user views sidebar
- **THEN** "Recent" section shows last 5 executed requests at top

### Requirement: Load Saved Request

The system SHALL load saved request configuration into request builder.

#### Scenario: Click saved request
- **WHEN** user clicks "Get All Users" in sidebar
- **THEN** request builder loads with saved method, URL, headers, and body

#### Scenario: Modified indicator
- **WHEN** user modifies loaded saved request
- **THEN** asterisk (*) appears next to request name indicating unsaved changes

#### Scenario: Discard changes to saved request
- **WHEN** user clicks "Revert" on modified saved request
- **THEN** request builder reloads original saved configuration

### Requirement: Duplicate Saved Request

The system SHALL allow duplicating saved requests.

#### Scenario: Duplicate request
- **WHEN** user right-clicks request and selects "Duplicate"
- **THEN** copy is created with " (Copy)" appended to name

#### Scenario: Duplicate to different folder
- **WHEN** user duplicates request and selects different target folder
- **THEN** copy is created in selected folder

### Requirement: Delete Saved Requests

The system SHALL allow deleting saved requests and folders.

#### Scenario: Delete single request
- **WHEN** user right-clicks request and selects "Delete"
- **THEN** confirmation dialog appears "Delete 'Get All Users'?"

#### Scenario: Delete folder
- **WHEN** user deletes folder containing requests
- **THEN** confirmation warns "This will delete 5 requests. Continue?"

#### Scenario: Soft delete protection
- **WHEN** user accidentally deletes request
- **THEN** undo notification appears for 5 seconds

### Requirement: Export/Import Collections

The system SHALL support exporting and importing request collections.

#### Scenario: Export folder as JSON
- **WHEN** user right-clicks folder and selects "Export"
- **THEN** JSON file downloads with all requests in folder

#### Scenario: Export all requests
- **WHEN** user clicks "Export All" in sidebar menu
- **THEN** JSON file downloads with complete collection structure

#### Scenario: Import collection file
- **WHEN** user clicks "Import" and selects JSON file
- **THEN** requests are added to collection with folder structure preserved

#### Scenario: Import Postman collection (optional)
- **WHEN** user imports Postman collection JSON
- **THEN** system converts and imports compatible requests

### Requirement: Request Metadata

The system SHALL store and display request metadata.

#### Scenario: View request details
- **WHEN** user hovers over saved request
- **THEN** tooltip shows last modified date and execution count

#### Scenario: Sort requests by usage
- **WHEN** user selects "Sort by Most Used"
- **THEN** requests are ordered by execution frequency

#### Scenario: Request description
- **WHEN** user right-clicks request and selects "Edit Description"
- **THEN** dialog allows adding multi-line description text

### Requirement: Bulk Operations

The system SHALL support bulk operations on multiple requests.

#### Scenario: Select multiple requests
- **WHEN** user Ctrl+clicks multiple requests
- **THEN** selected requests are highlighted

#### Scenario: Bulk delete
- **WHEN** user selects multiple requests and clicks "Delete Selected"
- **THEN** confirmation shows count and deletes all selected

#### Scenario: Bulk move to folder
- **WHEN** user drags multiple selected requests to folder
- **THEN** all selected requests move to target folder

### Requirement: Request Sharing

The system SHALL generate shareable request links.

#### Scenario: Copy request as link
- **WHEN** user right-clicks request and selects "Copy as Link"
- **THEN** shareable URL with base64-encoded request is copied

#### Scenario: Open shared request link
- **WHEN** user pastes shared link in URL bar
- **THEN** request builder loads with shared configuration

## ADDED Requirements

### Requirement: Environment Management

The system SHALL support creating and managing multiple environments.

#### Scenario: Create new environment
- **WHEN** user clicks "New Environment" button
- **THEN** dialog prompts for environment name (e.g., "Development", "Staging", "Production")

#### Scenario: Switch active environment
- **WHEN** user selects "Production" from environment dropdown
- **THEN** all variable references use Production environment values

#### Scenario: Environment indicator
- **WHEN** Production environment is active
- **THEN** red badge displays "PROD" in header (similar to connection environment)

### Requirement: Variable Definition

The system SHALL allow defining variables within environments.

#### Scenario: Add variable to environment
- **WHEN** user adds variable "baseUrl" with value "https://api.example.com"
- **THEN** variable becomes available for use in requests

#### Scenario: Variable with multiple environments
- **WHEN** user defines "baseUrl" in Development (http://localhost:3000) and Production (https://api.example.com)
- **THEN** variable value changes based on active environment

#### Scenario: Variable naming rules
- **WHEN** user creates variable with name "my-api-key"
- **THEN** system validates name allows letters, numbers, dashes, underscores

### Requirement: Variable Interpolation

The system SHALL interpolate variables in request configuration.

#### Scenario: Variable in URL
- **WHEN** URL contains "{{baseUrl}}/users"
- **THEN** system replaces {{baseUrl}} with environment value before sending

#### Scenario: Variable in headers
- **WHEN** header value contains "Bearer {{token}}"
- **THEN** system replaces {{token}} with environment value

#### Scenario: Variable in request body
- **WHEN** JSON body contains {"userId": "{{userId}}"}
- **THEN** system replaces {{userId}} with environment value

#### Scenario: Variable in query parameters
- **WHEN** query param contains "api_key={{apiKey}}"
- **THEN** system replaces {{apiKey}} with environment value

### Requirement: Variable Syntax

The system SHALL support variable syntax and expressions.

#### Scenario: Simple variable reference
- **WHEN** user enters "{{baseUrl}}"
- **THEN** system replaces with variable value

#### Scenario: Nested variable path
- **WHEN** user enters "{{config.api.url}}"
- **THEN** system resolves nested object path

#### Scenario: Default value
- **WHEN** user enters "{{apiKey:default-key}}"
- **THEN** system uses "default-key" if apiKey is undefined

#### Scenario: Undefined variable highlighting
- **WHEN** variable {{undefined}} is used
- **THEN** system highlights in yellow and shows warning tooltip

### Requirement: Variable Types

The system SHALL support different variable value types.

#### Scenario: String variable
- **WHEN** user defines variable "name" as "John Doe"
- **THEN** variable is treated as string value

#### Scenario: Number variable
- **WHEN** user defines variable "userId" as 12345
- **THEN** variable maintains number type in interpolation

#### Scenario: Boolean variable
- **WHEN** user defines variable "debug" as true
- **THEN** variable is interpolated as boolean in JSON

#### Scenario: Secret variable
- **WHEN** user marks variable as "Secret"
- **THEN** value is masked in UI and encrypted in storage

### Requirement: Environment Variables UI

The system SHALL provide interface for managing environment variables.

#### Scenario: View environment variables table
- **WHEN** user opens "Environments" panel
- **THEN** table displays all variables with columns: Name, Value, Type, Description

#### Scenario: Edit variable inline
- **WHEN** user double-clicks variable value cell
- **THEN** cell becomes editable for quick updates

#### Scenario: Bulk edit variables
- **WHEN** user clicks "Bulk Edit" button
- **THEN** text editor opens for editing variables in KEY=VALUE format

#### Scenario: Search variables
- **WHEN** user types "api" in variables search box
- **THEN** only variables containing "api" are displayed

### Requirement: Variable Scopes

The system SHALL support different variable scopes.

#### Scenario: Global variables
- **WHEN** user defines variable in "Global" scope
- **THEN** variable is available in all environments

#### Scenario: Environment-specific variables
- **WHEN** user defines variable in "Development" environment
- **THEN** variable is only available when Development is active

#### Scenario: Request-level variables
- **WHEN** request execution sets variable via script
- **THEN** variable is available only for current request session

### Requirement: Dynamic Variables

The system SHALL provide built-in dynamic variables.

#### Scenario: Timestamp variable
- **WHEN** user references "{{$timestamp}}"
- **THEN** system generates current Unix timestamp

#### Scenario: Random UUID variable
- **WHEN** user references "{{$guid}}"
- **THEN** system generates random UUID

#### Scenario: Random string variable
- **WHEN** user references "{{$randomString}}"
- **THEN** system generates random alphanumeric string

#### Scenario: Date/time variables
- **WHEN** user references "{{$isoTimestamp}}"
- **THEN** system generates ISO 8601 formatted timestamp

### Requirement: Variable Export/Import

The system SHALL support exporting and importing environment configurations.

#### Scenario: Export environment
- **WHEN** user clicks "Export" on "Development" environment
- **THEN** JSON file downloads with all variables (secrets optionally excluded)

#### Scenario: Import environment
- **WHEN** user imports environment JSON file
- **THEN** new environment is created with imported variables

#### Scenario: Share environment without secrets
- **WHEN** user exports with "Exclude Secrets" option
- **THEN** exported file contains placeholders for secret variables

### Requirement: Variable Dependencies

The system SHALL handle variable dependencies.

#### Scenario: Variable referencing another variable
- **WHEN** user defines "apiUrl" as "{{baseUrl}}/api"
- **THEN** system resolves baseUrl first, then apiUrl

#### Scenario: Circular reference detection
- **WHEN** user creates circular reference (A references B, B references A)
- **THEN** system displays error "Circular variable reference detected"

#### Scenario: Variable resolution order
- **WHEN** multiple variables reference each other
- **THEN** system resolves in correct dependency order

### Requirement: Environment Security

The system SHALL handle environment data securely.

#### Scenario: Encrypt secret variables
- **WHEN** user marks variable as secret
- **THEN** value is encrypted using OS keychain before storage

#### Scenario: Production environment protection
- **WHEN** Production environment is active
- **THEN** warning displays before executing destructive requests

#### Scenario: Environment access control (optional)
- **WHEN** user attempts to use Production environment
- **THEN** system requires password or confirmation

### Requirement: Variable Validation

The system SHALL validate variable definitions.

#### Scenario: Duplicate variable name
- **WHEN** user creates variable with existing name in same environment
- **THEN** system displays error "Variable 'baseUrl' already exists"

#### Scenario: Invalid variable syntax
- **WHEN** user enters "{{base-url}}" with hyphen in request
- **THEN** system highlights as potential typo (suggest baseUrl)

#### Scenario: Unused variable warning
- **WHEN** variable is defined but not used in any request
- **THEN** system shows warning indicator next to variable

### Requirement: Variable Preview

The system SHALL show variable resolution preview.

#### Scenario: Preview resolved URL
- **WHEN** user enters "{{baseUrl}}/users" in URL field
- **THEN** system displays resolved preview "https://api.example.com/users" below input

#### Scenario: Preview all resolved variables
- **WHEN** user clicks "Preview" button on request
- **THEN** modal displays request with all variables resolved

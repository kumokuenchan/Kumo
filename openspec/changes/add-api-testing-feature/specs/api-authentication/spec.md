## ADDED Requirements

### Requirement: Authentication Type Selection

The system SHALL provide multiple authentication methods.

#### Scenario: Select authentication type
- **WHEN** user opens "Auth" tab in request builder
- **THEN** dropdown displays options: No Auth, Bearer Token, Basic Auth, API Key

#### Scenario: Switch authentication type
- **WHEN** user changes from "No Auth" to "Bearer Token"
- **THEN** Bearer Token input fields appear

### Requirement: Bearer Token Authentication

The system SHALL support Bearer Token authentication.

#### Scenario: Configure Bearer Token
- **WHEN** user selects "Bearer Token" and enters token "abc123xyz"
- **THEN** Authorization header is set to "Bearer abc123xyz"

#### Scenario: Token with environment variable
- **WHEN** user enters "{{authToken}}" in token field
- **THEN** variable is interpolated before request is sent

#### Scenario: Token prefix configuration
- **WHEN** user selects custom prefix "JWT" instead of "Bearer"
- **THEN** Authorization header is set to "JWT abc123xyz"

### Requirement: Basic Authentication

The system SHALL support HTTP Basic Authentication.

#### Scenario: Configure Basic Auth credentials
- **WHEN** user enters username "john" and password "secret123"
- **THEN** Authorization header is set to "Basic base64(john:secret123)"

#### Scenario: Basic Auth with special characters
- **WHEN** user enters password with special characters "p@ss:word!"
- **THEN** credentials are properly encoded in Authorization header

#### Scenario: Basic Auth credential security
- **WHEN** user saves request with Basic Auth
- **THEN** password is encrypted before storage

### Requirement: API Key Authentication

The system SHALL support API Key authentication in multiple locations.

#### Scenario: API Key in header
- **WHEN** user selects "Header" location for API key
- **THEN** fields appear for key name (e.g., "X-API-Key") and value

#### Scenario: API Key in query parameter
- **WHEN** user selects "Query Param" location for API key
- **THEN** API key is added as URL parameter (e.g., "?api_key=value")

#### Scenario: Multiple API keys
- **WHEN** user adds multiple API keys (e.g., "X-API-Key" and "X-Client-ID")
- **THEN** all configured keys are included in request

### Requirement: No Authentication

The system SHALL support requests without authentication.

#### Scenario: No Auth selected
- **WHEN** user selects "No Auth"
- **THEN** no authentication headers or parameters are added to request

#### Scenario: Clear previous authentication
- **WHEN** user changes from "Bearer Token" to "No Auth"
- **THEN** Authorization header is removed from request

### Requirement: Authentication Inheritance

The system SHALL support authentication inheritance from folders/collections.

#### Scenario: Folder-level authentication
- **WHEN** user sets Bearer Token on "User API" folder
- **THEN** all requests in folder inherit Bearer Token authentication

#### Scenario: Override folder authentication
- **WHEN** request has specific auth configured
- **THEN** request-level auth overrides folder-level auth

#### Scenario: Clear inherited authentication
- **WHEN** user selects "No Auth" on request with folder auth
- **THEN** folder authentication is not applied to this request

### Requirement: OAuth 2.0 Support

The system SHALL support OAuth 2.0 authentication flows for advanced use cases.

#### Scenario: Configure OAuth 2.0
- **WHEN** user selects "OAuth 2.0" authentication type
- **THEN** configuration panel displays for Authorization Code flow

#### Scenario: OAuth callback handling
- **WHEN** user initiates OAuth flow
- **THEN** system opens browser for authorization and captures callback

#### Scenario: Token refresh
- **WHEN** access token expires
- **THEN** system automatically uses refresh token to obtain new access token

### Requirement: Certificate-Based Authentication

The system SHALL support client certificate authentication for enterprise security requirements.

#### Scenario: Configure client certificate
- **WHEN** user selects "Client Certificate" authentication
- **THEN** file pickers appear for certificate and private key files

#### Scenario: Certificate passphrase
- **WHEN** certificate requires passphrase
- **THEN** secure input field appears for passphrase entry

### Requirement: Authentication Security

The system SHALL handle authentication credentials securely.

#### Scenario: Encrypt stored credentials
- **WHEN** user saves request with authentication
- **THEN** credentials are encrypted using OS keychain (desktop) or secure storage

#### Scenario: Mask sensitive values
- **WHEN** user views saved request with Bearer Token
- **THEN** token is displayed as "••••••••" with option to reveal

#### Scenario: Don't log credentials
- **WHEN** request with authentication is logged to history
- **THEN** sensitive values are redacted from logs

### Requirement: Authentication Templates

The system SHALL provide templates for common authentication patterns.

#### Scenario: AWS Signature authentication template
- **WHEN** user selects "AWS Signature" template
- **THEN** fields appear for AWS Access Key, Secret Key, and Region

#### Scenario: Custom authentication template
- **WHEN** user creates custom auth template
- **THEN** template is saved and available for reuse across requests

### Requirement: Authentication Testing

The system SHALL help users test authentication configuration.

#### Scenario: Test authentication
- **WHEN** user clicks "Test Auth" button
- **THEN** system makes test request to verify credentials are valid

#### Scenario: Authentication error details
- **WHEN** request fails with 401 Unauthorized
- **THEN** system displays specific guidance: "Authentication failed. Check your credentials."

#### Scenario: Token expiration warning
- **WHEN** JWT token is close to expiration
- **THEN** system displays warning "Token expires in 5 minutes"

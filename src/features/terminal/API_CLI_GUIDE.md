# API CLI - Make API Calls from Terminal

The terminal now includes a powerful built-in API client that lets you make HTTP requests directly from the command line, leveraging your saved API collections from the API Tester module.

## 🚀 Quick Start

```bash
# Show help
api --help

# List all your saved API requests
api list

# Execute a saved request
api exec 0.0

# Make a quick GET request
api get https://api.github.com/users/octocat

# Make a POST request with data
api post https://api.example.com/users -d '{"name":"John","email":"john@example.com"}'
```

## 📚 Commands

### List Commands

```bash
# List all saved API requests from your collections
api list
api ls

# List all collections
api collections

# Search for requests by name or URL
api search user
api search github
```

### Execute Saved Requests

```bash
# Execute a saved request by index
api exec <collection>.<request>

# Examples:
api exec 0.0    # First request in first collection
api exec 1.2    # Third request in second collection
api run 0.0     # 'run' is an alias for 'exec'
```

The index format is `<collection>.<request>` where:
- Collection index: The collection number from `api list` (starts at 0)
- Request index: The request number within that collection (starts at 0)

### Quick HTTP Requests

Make HTTP requests without saving them:

```bash
# GET request
api get <url> [options]

# POST request
api post <url> [options]

# PUT request
api put <url> [options]

# DELETE request
api delete <url> [options]
api del <url>     # shorthand

# PATCH request
api patch <url> [options]
```

### Request Options

```bash
# Add headers
-H "Authorization: Bearer token123"
--header "Content-Type: application/json"

# Add request body (JSON)
-d '{"key":"value"}'
--data '{"name":"John"}'

# Add query parameters
-q term=hello
--query page=1
```

## 💡 Examples

### Using Saved Requests

```bash
# 1. List your saved requests
api list

# Output shows:
# 0.0 GET User Profile API
#     https://api.example.com/users/me
# 0.1 POST Create User
#     https://api.example.com/users
# 1.0 GET GitHub User
#     https://api.github.com/users/octocat

# 2. Execute a specific request
api exec 1.0

# Output shows the response with status, headers, and body
```

### Quick GET Requests

```bash
# Simple GET
api get https://api.github.com/users/octocat

# GET with query parameters
api get https://api.example.com/search -q term=hello -q limit=10

# GET with authentication
api get https://api.example.com/me -H "Authorization: Bearer YOUR_TOKEN"
```

### Quick POST Requests

```bash
# POST with JSON data
api post https://api.example.com/users -d '{"name":"John Doe","email":"john@example.com"}'

# POST with headers and data
api post https://api.example.com/users \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'
```

### Search Requests

```bash
# Search for requests containing "user"
api search user

# Search for requests with specific URLs
api search github.com
```

## 🎨 Response Format

API CLI displays responses in a beautifully formatted way:

```
🚀 Executing Request

GET User Profile
GET https://api.example.com/users/me

📥 Response

200 OK
Time: 145ms | Size: 1.2 KB

Headers:
  content-type: application/json
  cache-control: no-cache
  ... and 8 more

Body:
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Color Coding

- **HTTP Methods**: Color-coded by method (GET=Green, POST=Yellow, DELETE=Red, etc.)
- **Status Codes**:
  - 2xx: Green (Success)
  - 3xx: Cyan (Redirect)
  - 4xx: Yellow (Client Error)
  - 5xx: Red (Server Error)

## 🔗 Integration with API Tester

The API CLI seamlessly integrates with your API Tester module:

1. **Saved Collections**: All your saved collections from the API Tester are available in the terminal
2. **Auto-save to History**: Every API request executed from the terminal is automatically saved to your API Tester history
3. **Environment Variables**: (Coming soon) Use environment variables from API Tester in terminal commands

### Workflow Example

1. Create and test API requests in the API Tester UI
2. Save them to collections
3. Execute them quickly from the terminal using `api exec`
4. View results inline without leaving the terminal

## ⚡ Pro Tips

### Quick Commands Integration

Add your most-used API commands to Quick Commands:

1. Open Quick Commands menu (command icon in terminal header)
2. Go to "Quick Commands" tab
3. Add new command:
   - Name: "Check API Status"
   - Command: `api get https://api.example.com/health`
   - Description: "Health check endpoint"

### Combine with Shell Commands

```bash
# Chain API calls with shell commands
api get https://api.github.com/users/octocat && echo "Request completed!"

# Use in scripts
if api get https://api.example.com/health; then
  echo "API is healthy"
fi
```

### Response Inspection

Responses are automatically saved to API Tester history, so you can:
1. Execute request from terminal
2. Open API Tester
3. View full response with all details in the History panel

## 🛠️ Advanced Usage

### Multiple Headers

```bash
api post https://api.example.com/users \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -H "X-Custom-Header: value" \
  -d '{"name":"John"}'
```

### Complex JSON Bodies

```bash
api post https://api.example.com/users -d '{
  "name": "John Doe",
  "email": "john@example.com",
  "address": {
    "city": "San Francisco",
    "country": "USA"
  }
}'
```

### Testing Different Environments

```bash
# Development
api get https://dev-api.example.com/users

# Staging
api get https://staging-api.example.com/users

# Production
api get https://api.example.com/users
```

## 📝 Notes

- All requests are executed through your backend server (http://localhost:3001)
- Responses are limited to 1000 characters in terminal display (full response saved to history)
- Large responses are truncated in terminal but fully accessible in API Tester history
- All authentication headers and data are processed securely

## 🔜 Coming Soon

- Environment variables support (`api get {{base_url}}/users`)
- Request chaining (`api exec 0.0 | api exec 0.1`)
- Response filtering (`api get url --filter "data.users"`)
- Request templates
- Batch execution

## 🆘 Help

```bash
# Show help anytime
api --help
api -h
api help
```

---

**Happy API Testing! 🚀**

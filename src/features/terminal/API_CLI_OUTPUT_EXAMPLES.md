# API CLI Output Examples

This document shows what the API CLI output looks like with proper formatting.

## Help Command

```bash
api --help
```

**Output:**
```
API CLI - Make API calls from terminal

USAGE:
  api <command> [options]

COMMANDS:
  list, ls                 List all saved API requests
  collections              List all collections
  exec, run <id>           Execute a saved request by index
  search <query>          Search requests by name or URL

  Quick Requests:
  get <url> [options]     Make a GET request
  post <url> [options]    Make a POST request
  put <url> [options]     Make a PUT request
  delete <url> [options]  Make a DELETE request
  patch <url> [options]   Make a PATCH request

OPTIONS:
  -H, --header <key:value>  Add header
  -d, --data <json>        Add request body (JSON)
  -q, --query <key=value>  Add query parameter

EXAMPLES:
  api list
  api exec 0.0
  api search user
  api get https://api.github.com/users/octocat
  api post https://api.example.com/users -d '{"name":"John"}'

Tip: Use "api list" to see all your saved requests
```

## List Saved Requests

```bash
api list
```

**Output:**
```
📚 Saved API Requests

GitHub API (3 requests)
  0.0 GET Get User
      https://api.github.com/users/octocat
  0.1 GET List Repos
      https://api.github.com/users/octocat/repos
  0.2 POST Create Issue
      https://api.github.com/repos/owner/repo/issues

Example API (2 requests)
  1.0 GET User Profile
      https://api.example.com/users/me
  1.1 POST Create User
      https://api.example.com/users

Use "api exec <collection>.<request>" to execute a request
Example: api exec 0.0
```

## Execute a Saved Request

```bash
api exec 0.0
```

**Output:**
```
🚀 Executing Request

Get User
GET https://api.github.com/users/octocat

📥 Response

200 OK
Time: 234ms | Size: 1.45 KB

Headers:
  content-type: application/json; charset=utf-8
  cache-control: public, max-age=60
  x-ratelimit-limit: 60
  x-ratelimit-remaining: 59
  ... and 12 more

Body:
{
  "login": "octocat",
  "id": 1,
  "avatar_url": "https://github.com/images/error/octocat_happy.gif",
  "name": "The Octocat",
  "company": "@github",
  "blog": "https://github.blog",
  "location": "San Francisco",
  "bio": "There once was..."
}
```

## Quick GET Request

```bash
api get https://api.github.com/users/octocat
```

**Output:**
```
🚀 Executing Request

GET https://api.github.com/users/octocat

📥 Response

200 OK
Time: 156ms | Size: 1.45 KB

Headers:
  content-type: application/json
  ...

Body:
{
  "login": "octocat",
  "id": 1,
  ...
}
```

## Quick POST Request

```bash
api post https://jsonplaceholder.typicode.com/posts -d '{"title":"Hello","body":"World"}'
```

**Output:**
```
🚀 Executing Request

POST https://jsonplaceholder.typicode.com/posts

📥 Response

201 Created
Time: 892ms | Size: 78 B

Headers:
  content-type: application/json
  ...

Body:
{
  "title": "Hello",
  "body": "World",
  "id": 101
}
```

## Search Requests

```bash
api search github
```

**Output:**
```
🔍 Search results for "github"

GitHub API
  0.0 GET Get User
      https://api.github.com/users/octocat
  0.1 GET List Repos
      https://api.github.com/users/octocat/repos

Found 2 request(s)
```

## Error Handling

```bash
api exec 99.99
```

**Output:**
```
✗ Error: Collection 99 not found. Use "api list" to see available collections.
```

## No Saved Requests

```bash
api list
```

**Output (when no requests saved):**
```
No saved API requests found.

Create requests in the API Tester and save them to collections.
```

## Color Legend

- **Commands**: Green text
- **URLs**: Cyan text
- **HTTP Methods**:
  - GET: Green
  - POST: Yellow
  - PUT: Blue
  - DELETE: Red
  - PATCH: Magenta
- **Status Codes**:
  - 2xx (Success): Green
  - 3xx (Redirect): Cyan
  - 4xx (Client Error): Yellow
  - 5xx (Server Error): Red
- **Metadata**: Dim/gray text
- **Errors**: Red text with ✗ symbol
- **Headings**: Bold cyan text

---

All output is now properly formatted with clean line breaks and consistent spacing!

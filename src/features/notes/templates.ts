import { NoteTemplate } from '../../types/notes';

export const defaultTemplates: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with an empty note',
    icon: '📝',
    type: 'general',
    content: '',
    category: 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Track and document bugs',
    icon: '🐛',
    type: 'ticket',
    priority: 'high',
    tags: ['bug', 'issue'],
    content: `<h1>Bug Report</h1>

<h2>Description</h2>
<p>Brief description of the bug...</p>

<h2>Steps to Reproduce</h2>
<ol>
<li>Step 1</li>
<li>Step 2</li>
<li>Step 3</li>
</ol>

<h2>Expected Behavior</h2>
<p>What should happen...</p>

<h2>Actual Behavior</h2>
<p>What actually happens...</p>

<h2>Environment</h2>
<ul>
<li><strong>OS:</strong> </li>
<li><strong>Browser:</strong> </li>
<li><strong>Version:</strong> </li>
</ul>

<h2>Screenshots</h2>
<p>Add screenshots here...</p>

<h2>Additional Context</h2>
<p>Any other relevant information...</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Document meetings and decisions',
    icon: '📅',
    type: 'general',
    priority: 'medium',
    tags: ['meeting'],
    content: `<h1>Meeting Notes</h1>

<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>

<h2>Agenda</h2>
<ul>
<li>Topic 1</li>
<li>Topic 2</li>
<li>Topic 3</li>
</ul>

<h2>Discussion Points</h2>
<p>Key points discussed...</p>

<h2>Decisions Made</h2>
<ul>
<li>Decision 1</li>
<li>Decision 2</li>
</ul>

<h2>Action Items</h2>
<ul>
<li>[ ] Action item 1 - Assigned to: </li>
<li>[ ] Action item 2 - Assigned to: </li>
</ul>

<h2>Next Meeting</h2>
<p><strong>Date:</strong> </p>
<p><strong>Topics:</strong> </p>`,
    category: 'meeting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Document version releases',
    icon: '🚀',
    type: 'release',
    priority: 'high',
    tags: ['release', 'changelog'],
    content: `<h1>Release Notes - v1.0.0</h1>

<p><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Release Type:</strong> Major / Minor / Patch</p>

<h2>🎉 New Features</h2>
<ul>
<li>Feature 1 - Description</li>
<li>Feature 2 - Description</li>
</ul>

<h2>🔧 Improvements</h2>
<ul>
<li>Improvement 1</li>
<li>Improvement 2</li>
</ul>

<h2>🐛 Bug Fixes</h2>
<ul>
<li>Fixed issue with...</li>
<li>Resolved bug where...</li>
</ul>

<h2>⚠️ Breaking Changes</h2>
<ul>
<li>Breaking change 1 - Migration steps</li>
</ul>

<h2>📝 Notes</h2>
<p>Additional notes...</p>

<h2>🔗 Links</h2>
<ul>
<li><strong>Documentation:</strong> </li>
<li><strong>GitHub Release:</strong> </li>
</ul>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'technical-spec',
    name: 'Technical Spec',
    description: 'Design and architecture documentation',
    icon: '⚙️',
    type: 'developer',
    priority: 'high',
    tags: ['spec', 'technical', 'architecture'],
    content: `<h1>Technical Specification</h1>

<h2>Overview</h2>
<p>High-level description of the feature or system...</p>

<h2>Goals & Non-Goals</h2>
<h3>Goals</h3>
<ul>
<li>Goal 1</li>
<li>Goal 2</li>
</ul>

<h3>Non-Goals</h3>
<ul>
<li>What we're NOT trying to solve</li>
</ul>

<h2>Architecture</h2>
<p>System architecture and design decisions...</p>

<h2>Data Model</h2>
<pre><code>interface Example {
  id: string;
  name: string;
}</code></pre>

<h2>API Design</h2>
<h3>Endpoints</h3>
<ul>
<li><code>GET /api/resource</code> - Description</li>
<li><code>POST /api/resource</code> - Description</li>
</ul>

<h2>Implementation Plan</h2>
<ol>
<li>Phase 1 - Foundation</li>
<li>Phase 2 - Core features</li>
<li>Phase 3 - Polish</li>
</ol>

<h2>Testing Strategy</h2>
<ul>
<li>Unit tests</li>
<li>Integration tests</li>
<li>E2E tests</li>
</ul>

<h2>Security Considerations</h2>
<p>Security implications and mitigations...</p>

<h2>Performance Considerations</h2>
<p>Performance targets and optimizations...</p>

<h2>Open Questions</h2>
<ul>
<li>Question 1</li>
<li>Question 2</li>
</ul>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'database-schema',
    name: 'Database Schema',
    description: 'Document database structure',
    icon: '🗄️',
    type: 'developer',
    priority: 'medium',
    tags: ['database', 'schema', 'mysql'],
    content: `<h1>Database Schema Documentation</h1>

<h2>Overview</h2>
<p>Purpose and scope of this database schema...</p>

<h2>Tables</h2>

<h3>Table: users</h3>
<p><strong>Description:</strong> Stores user information</p>

<pre><code>CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_username (username)
);</code></pre>

<h4>Columns</h4>
<ul>
<li><strong>id</strong> - Primary key</li>
<li><strong>username</strong> - Unique username</li>
<li><strong>email</strong> - User email address</li>
<li><strong>password_hash</strong> - Hashed password</li>
</ul>

<h2>Relationships</h2>
<ul>
<li><strong>users</strong> → <strong>posts</strong> (One-to-Many)</li>
<li><strong>users</strong> → <strong>comments</strong> (One-to-Many)</li>
</ul>

<h2>Indexes</h2>
<ul>
<li><code>idx_email</code> - Optimize email lookups</li>
<li><code>idx_username</code> - Optimize username searches</li>
</ul>

<h2>Constraints</h2>
<ul>
<li>UNIQUE constraint on email and username</li>
<li>Foreign key constraints for referential integrity</li>
</ul>

<h2>Sample Queries</h2>
<pre><code>-- Get user with posts
SELECT u.*, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id;</code></pre>

<h2>Migration Notes</h2>
<p>Important notes for database migrations...</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'api-documentation',
    name: 'API Documentation',
    description: 'Document API endpoints',
    icon: '🔌',
    type: 'developer',
    priority: 'medium',
    tags: ['api', 'documentation', 'endpoints'],
    content: `<h1>API Documentation</h1>

<h2>Base URL</h2>
<p><code>https://api.example.com/v1</code></p>

<h2>Authentication</h2>
<p>All API requests require authentication using a Bearer token:</p>
<pre><code>Authorization: Bearer YOUR_API_TOKEN</code></pre>

<h2>Endpoints</h2>

<h3>GET /users</h3>
<p><strong>Description:</strong> Retrieve all users</p>

<h4>Query Parameters</h4>
<ul>
<li><code>page</code> (number) - Page number (default: 1)</li>
<li><code>limit</code> (number) - Results per page (default: 20)</li>
<li><code>sort</code> (string) - Sort field (default: created_at)</li>
</ul>

<h4>Response</h4>
<pre><code>{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}</code></pre>

<h3>POST /users</h3>
<p><strong>Description:</strong> Create a new user</p>

<h4>Request Body</h4>
<pre><code>{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password"
}</code></pre>

<h4>Response</h4>
<pre><code>{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2025-01-13T10:00:00Z"
}</code></pre>

<h2>Error Codes</h2>
<ul>
<li><strong>400</strong> - Bad Request</li>
<li><strong>401</strong> - Unauthorized</li>
<li><strong>404</strong> - Not Found</li>
<li><strong>500</strong> - Internal Server Error</li>
</ul>

<h2>Rate Limiting</h2>
<p>API is limited to 1000 requests per hour per API key.</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Code review checklist and notes',
    icon: '👀',
    type: 'developer',
    priority: 'medium',
    tags: ['code-review', 'quality'],
    content: `<h1>Code Review</h1>

<p><strong>PR/MR:</strong> #</p>
<p><strong>Author:</strong> </p>
<p><strong>Reviewer:</strong> </p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Summary</h2>
<p>Brief description of changes...</p>

<h2>Review Checklist</h2>

<h3>Code Quality</h3>
<ul>
<li>[ ] Code follows project conventions and style guide</li>
<li>[ ] No code duplication</li>
<li>[ ] Functions are small and focused</li>
<li>[ ] Variable and function names are clear</li>
<li>[ ] Complex logic is commented</li>
</ul>

<h3>Functionality</h3>
<ul>
<li>[ ] Code does what it's supposed to do</li>
<li>[ ] Edge cases are handled</li>
<li>[ ] Error handling is appropriate</li>
<li>[ ] No obvious bugs</li>
</ul>

<h3>Testing</h3>
<ul>
<li>[ ] Unit tests included</li>
<li>[ ] Tests cover happy path and edge cases</li>
<li>[ ] All tests pass</li>
<li>[ ] Test coverage is adequate</li>
</ul>

<h3>Security</h3>
<ul>
<li>[ ] No SQL injection vulnerabilities</li>
<li>[ ] No XSS vulnerabilities</li>
<li>[ ] Input validation is present</li>
<li>[ ] Sensitive data is protected</li>
</ul>

<h3>Performance</h3>
<ul>
<li>[ ] No unnecessary database queries</li>
<li>[ ] Efficient algorithms used</li>
<li>[ ] No memory leaks</li>
</ul>

<h2>Comments</h2>
<p>Specific feedback and suggestions...</p>

<h2>Approval Status</h2>
<p>✅ Approved / ⚠️ Needs Changes / ❌ Rejected</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getTemplateById(id: string): NoteTemplate | undefined {
  return defaultTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: NoteTemplate['category']): NoteTemplate[] {
  return defaultTemplates.filter(t => t.category === category);
}

export function getTemplatesByType(type: NoteTemplate['type']): NoteTemplate[] {
  return defaultTemplates.filter(t => t.type === type);
}

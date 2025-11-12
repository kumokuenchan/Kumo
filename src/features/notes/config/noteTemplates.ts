import { NoteTemplate } from '../../../types/notes';

export const defaultTemplates: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with a clean slate',
    icon: '📄',
    type: 'general',
    content: '',
    isDefault: true,
    category: 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for recording meeting discussions and action items',
    icon: '📋',
    type: 'general',
    priority: 'medium',
    tags: ['meeting'],
    content: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong></p>
<ul><li></li></ul>

<h2>Agenda</h2>
<ol>
  <li></li>
</ol>

<h2>Discussion Points</h2>
<ul>
  <li></li>
</ul>

<h2>Action Items</h2>
<ul>
  <li>[ ] </li>
</ul>

<h2>Next Meeting</h2>
<p><strong>Date:</strong> </p>
<p><strong>Topic:</strong> </p>`,
    category: 'meeting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Document bugs with all necessary details',
    icon: '🐛',
    type: 'ticket',
    priority: 'high',
    tags: ['bug', 'issue'],
    content: `<h1>Bug Report</h1>

<h2>Description</h2>
<p>A clear and concise description of what the bug is.</p>

<h2>Steps to Reproduce</h2>
<ol>
  <li>Go to '...'</li>
  <li>Click on '...'</li>
  <li>Scroll down to '...'</li>
  <li>See error</li>
</ol>

<h2>Expected Behavior</h2>
<p>A clear and concise description of what you expected to happen.</p>

<h2>Actual Behavior</h2>
<p>What actually happened.</p>

<h2>Screenshots</h2>
<p>If applicable, add screenshots to help explain your problem.</p>

<h2>Environment</h2>
<ul>
  <li><strong>OS:</strong> </li>
  <li><strong>Browser:</strong> </li>
  <li><strong>Version:</strong> </li>
</ul>

<h2>Additional Context</h2>
<p>Add any other context about the problem here.</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feature-spec',
    name: 'Feature Specification',
    description: 'Plan and document new features',
    icon: '✨',
    type: 'general',
    priority: 'medium',
    tags: ['feature', 'spec'],
    content: `<h1>Feature Specification</h1>

<h2>Overview</h2>
<p>Brief description of the feature</p>

<h2>Problem Statement</h2>
<p>What problem does this feature solve?</p>

<h2>Target Users</h2>
<ul>
  <li></li>
</ul>

<h2>User Stories</h2>
<ul>
  <li>As a [user type], I want to [action] so that [benefit]</li>
</ul>

<h2>Requirements</h2>
<h3>Functional Requirements</h3>
<ul>
  <li></li>
</ul>

<h3>Non-Functional Requirements</h3>
<ul>
  <li><strong>Performance:</strong> </li>
  <li><strong>Security:</strong> </li>
  <li><strong>Usability:</strong> </li>
</ul>

<h2>Technical Design</h2>
<p>High-level technical approach</p>

<h2>UI/UX Mockups</h2>
<p>Link to designs or embed mockups</p>

<h2>Success Criteria</h2>
<ul>
  <li></li>
</ul>

<h2>Timeline</h2>
<p><strong>Estimated completion:</strong> </p>

<h2>Dependencies</h2>
<ul>
  <li></li>
</ul>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup',
    description: 'Quick daily update template',
    icon: '☀️',
    type: 'general',
    priority: 'low',
    tags: ['standup', 'daily'],
    content: `<h1>Daily Standup - ${new Date().toLocaleDateString()}</h1>

<h2>✅ Yesterday</h2>
<ul>
  <li></li>
</ul>

<h2>🎯 Today</h2>
<ul>
  <li></li>
</ul>

<h2>🚧 Blockers</h2>
<ul>
  <li>None</li>
</ul>

<h2>💡 Notes</h2>
<p></p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Comprehensive project planning template',
    icon: '📊',
    type: 'general',
    priority: 'high',
    tags: ['project', 'planning'],
    content: `<h1>Project Plan</h1>

<h2>Project Overview</h2>
<p><strong>Project Name:</strong> </p>
<p><strong>Start Date:</strong> </p>
<p><strong>Expected End Date:</strong> </p>
<p><strong>Project Manager:</strong> </p>

<h2>Objectives</h2>
<ul>
  <li></li>
</ul>

<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
  <li></li>
</ul>

<h3>Out of Scope</h3>
<ul>
  <li></li>
</ul>

<h2>Deliverables</h2>
<ul>
  <li></li>
</ul>

<h2>Timeline & Milestones</h2>
<table>
  <thead>
    <tr>
      <th>Milestone</th>
      <th>Due Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

<h2>Team Members</h2>
<ul>
  <li></li>
</ul>

<h2>Budget</h2>
<p><strong>Total Budget:</strong> </p>

<h2>Risks</h2>
<ul>
  <li></li>
</ul>

<h2>Success Metrics</h2>
<ul>
  <li></li>
</ul>`,
    category: 'project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Structured code review checklist',
    icon: '👀',
    type: 'developer',
    priority: 'medium',
    tags: ['code-review', 'development'],
    content: `<h1>Code Review</h1>

<p><strong>PR/MR Link:</strong> </p>
<p><strong>Author:</strong> </p>
<p><strong>Reviewer:</strong> </p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Summary</h2>
<p>Brief description of the changes</p>

<h2>Code Quality</h2>
<ul>
  <li>[ ] Code follows project style guidelines</li>
  <li>[ ] No obvious bugs or logic errors</li>
  <li>[ ] Functions are small and focused</li>
  <li>[ ] Variable and function names are clear</li>
  <li>[ ] No code duplication</li>
</ul>

<h2>Testing</h2>
<ul>
  <li>[ ] Unit tests included and passing</li>
  <li>[ ] Edge cases covered</li>
  <li>[ ] Integration tests if applicable</li>
</ul>

<h2>Security</h2>
<ul>
  <li>[ ] No sensitive data exposed</li>
  <li>[ ] Input validation present</li>
  <li>[ ] No SQL injection vulnerabilities</li>
  <li>[ ] Authentication/authorization checks</li>
</ul>

<h2>Performance</h2>
<ul>
  <li>[ ] No obvious performance issues</li>
  <li>[ ] Efficient algorithms used</li>
  <li>[ ] Database queries optimized</li>
</ul>

<h2>Documentation</h2>
<ul>
  <li>[ ] Code comments where necessary</li>
  <li>[ ] README updated if needed</li>
  <li>[ ] API documentation updated</li>
</ul>

<h2>Comments & Suggestions</h2>
<p></p>

<h2>Decision</h2>
<p>✅ Approved / 🔄 Changes Requested / ❌ Rejected</p>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Document release changes and updates',
    icon: '🚀',
    type: 'release',
    priority: 'high',
    tags: ['release', 'changelog'],
    content: `<h1>Release Notes - v1.0.0</h1>

<p><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Release Type:</strong> Major / Minor / Patch</p>

<h2>🎉 New Features</h2>
<ul>
  <li></li>
</ul>

<h2>✨ Improvements</h2>
<ul>
  <li></li>
</ul>

<h2>🐛 Bug Fixes</h2>
<ul>
  <li></li>
</ul>

<h2>⚠️ Breaking Changes</h2>
<ul>
  <li>None</li>
</ul>

<h2>📝 Migration Guide</h2>
<p>Steps to upgrade from previous version:</p>
<ol>
  <li></li>
</ol>

<h2>🙏 Contributors</h2>
<ul>
  <li></li>
</ul>

<h2>📦 Dependencies</h2>
<ul>
  <li></li>
</ul>`,
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'personal-journal',
    name: 'Personal Journal',
    description: 'Daily personal reflection and notes',
    icon: '📔',
    type: 'general',
    priority: 'low',
    tags: ['personal', 'journal'],
    content: `<h1>Journal Entry - ${new Date().toLocaleDateString()}</h1>

<h2>How I'm Feeling</h2>
<p></p>

<h2>Today's Highlights</h2>
<ul>
  <li></li>
</ul>

<h2>Challenges</h2>
<ul>
  <li></li>
</ul>

<h2>Learnings</h2>
<ul>
  <li></li>
</ul>

<h2>Tomorrow's Goals</h2>
<ul>
  <li></li>
</ul>

<h2>Gratitude</h2>
<p>Three things I'm grateful for today:</p>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>`,
    category: 'personal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getTemplateById = (id: string): NoteTemplate | undefined => {
  return defaultTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): NoteTemplate[] => {
  return defaultTemplates.filter(template => template.category === category);
};

import express from 'express';
import multer from 'multer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {
  Note,
  DevCommand,
  Developer,
  DeveloperTask,
  Ticket,
  ReleaseFlow,
  NoteFilter,
  NoteSort,
  NoteStats,
  NoteType,
  NoteStatus,
  Priority,
} from '../../src/types/notes.js';
import { sqliteNotesStorage as notesStorage } from '../services/SQLiteNotesStorage.js';
import puppeteer from 'puppeteer';

// Helper function to convert markdown to HTML (server-side)
function convertMarkdownToHtml(markdownText: string): string {
  try {
    return markdownText
      // Convert headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Convert bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Convert code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Convert lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$1</ul>')
      // Convert line breaks
      .replace(/\n/g, '<br>')
      // Clean up multiple <br> tags
      .replace(/<br>\s*<br>/g, '</p><p>')
      // Wrap in paragraph if not already wrapped
      .replace(/^(?!<|<h|<ul|<li|<pre|<code)/gm, '<p>')
      .replace(/(?!>|\/li|\/ul|\/pre|\/code)$/gm, '</p>')
      // Clean up empty paragraphs and multiple <br> tags
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<br>\s*<\/p>/g, '')
      // Fix nested list issues
      .replace(/<\/ul>\s*<ul>/g, '')
      // Fix paragraph around headers
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      // Fix paragraph around lists
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1')
      // Fix paragraph around code blocks
      .replace(/<p>(<pre>)/g, '$1')
      .replace(/(<\/pre>)<\/p>/g, '$1')
      // Final cleanup
      .replace(/<p>\s*<\/p>/g, '');
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    return `<p>${markdownText.replace(/\n/g, '<br>')}</p>`;
  }
}

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only Markdown files (.md) are allowed'));
    }
  }
});

// Helper function to parse markdown content and extract frontmatter
function parseMarkdownContent(content: string) {
  const lines = content.split('\n');
  const notes: Partial<Note>[] = [];
  
  let inFrontmatter = false;
  let frontmatterContent = '';
  let contentBuffer: string[] = [];
  let title = '';
  let foundTitle = false;
  let frontmatterFound = false;
  
  // First pass: extract frontmatter and find title
  for (const line of lines) {
    if (line.trim() === '---' && !inFrontmatter && !frontmatterFound) {
      // Start of frontmatter (only first occurrence)
      inFrontmatter = true;
      frontmatterContent = '';
      frontmatterFound = true;
    } else if (line.trim() === '---' && inFrontmatter) {
      // End of frontmatter
      inFrontmatter = false;
    } else if (inFrontmatter) {
      // Inside frontmatter
      frontmatterContent += line + '\n';
    } else if (line.startsWith('# ') && !foundTitle) {
      // First h1 header as note title
      title = line.substring(2).trim();
      foundTitle = true;
      // Don't include the title line in content
    } else if (foundTitle) {
      // Content line (including subsequent headers)
      contentBuffer.push(line);
    } else if (!foundTitle && line.trim() !== '') {
      // Content before title (shouldn't normally happen, but handle it)
      contentBuffer.push(line);
    }
  }
  
  // Create single note from markdown file
  if (title || contentBuffer.length > 0) {
    const note: Partial<Note> = {
      title: title || 'Untitled Note',
      type: 'general' as NoteType,
      status: 'active' as NoteStatus,
      priority: 'medium' as Priority,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: convertMarkdownToHtml(contentBuffer.join('\n').trim())
    };
    
    // Parse frontmatter and merge with note data
    if (frontmatterContent.trim()) {
      const frontmatter = parseFrontmatter(frontmatterContent);
      Object.assign(note, frontmatter);
    }
    
    notes.push(note);
  }
  
  return notes;
}

// Helper function to parse YAML frontmatter
function parseFrontmatter(frontmatter: string) {
  const lines = frontmatter.split('\n');
  const result: any = {};
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      
      switch (key) {
        case 'type':
          if (['general', 'command', 'developer', 'ticket', 'release', 'flow'].includes(value)) {
            result.type = value as NoteType;
          }
          break;
        case 'status':
          if (['draft', 'active', 'archived'].includes(value)) {
            result.status = value as NoteStatus;
          }
          break;
        case 'priority':
          if (['low', 'medium', 'high', 'urgent'].includes(value)) {
            result.priority = value as Priority;
          }
          break;
        case 'tags':
          result.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
          break;
        case 'assignedTo':
          result.assignedTo = value.split(',').map(person => person.trim()).filter(person => person);
          break;
        case 'dueDate':
          result.dueDate = value;
          break;
        default:
          result[key] = value;
      }
    }
  }
  
  return result;
}

// Helper functions for export
function generateMarkdownContent(data: {
  notes: Note[];
  devCommands: DevCommand[];
  developers: Developer[];
  developerTasks: DeveloperTask[];
  tickets: Ticket[];
  releaseFlows: ReleaseFlow[];
}): string {
  const { notes, devCommands, developers, developerTasks, tickets, releaseFlows } = data;
  
  let markdown = '# Notes Export\n\n';
  markdown += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Notes Section
  if (notes.length > 0) {
    markdown += '## Notes\n\n';
    notes.forEach(note => {
      markdown += `### ${note.title}\n\n`;
      markdown += `**Type:** ${note.type} | **Status:** ${note.status} | **Priority:** ${note.priority}\n\n`;
      if (note.tags.length > 0) {
        markdown += `**Tags:** ${note.tags.join(', ')}\n\n`;
      }
      if (note.assignedTo && note.assignedTo.length > 0) {
        markdown += `**Assigned To:** ${note.assignedTo.join(', ')}\n\n`;
      }
      if (note.dueDate) {
        markdown += `**Due Date:** ${note.dueDate}\n\n`;
      }
      markdown += `${note.content}\n\n`;
      markdown += '---\n\n';
    });
  }
  
  // Dev Commands Section
  if (devCommands.length > 0) {
    markdown += '## Developer Commands\n\n';
    devCommands.forEach(command => {
      markdown += `### ${command.name}\n\n`;
      markdown += `**Category:** ${command.category}\n\n`;
      markdown += `**Command:** \`${command.command}\`\n\n`;
      markdown += `${command.description}\n\n`;
      if (command.usage) {
        markdown += `**Usage:** ${command.usage}\n\n`;
      }
      if (command.examples && command.examples.length > 0) {
        markdown += `**Examples:**\n${command.examples.map(ex => `- ${ex}`).join('\n')}\n\n`;
      }
      if (command.tags.length > 0) {
        markdown += `**Tags:** ${command.tags.join(', ')}\n\n`;
      }
      markdown += '---\n\n';
    });
  }
  
  // Developers Section
  if (developers.length > 0) {
    markdown += '## Developers\n\n';
    developers.forEach(dev => {
      markdown += `### ${dev.name}\n\n`;
      markdown += `**Email:** ${dev.email}\n\n`;
      markdown += `**Role:** ${dev.role} (${dev.level})\n\n`;
      markdown += `**Availability:** ${dev.availability}\n\n`;
      if (dev.skills.length > 0) {
        markdown += `**Skills:** ${dev.skills.join(', ')}\n\n`;
      }
      if (dev.notes) {
        markdown += `**Notes:** ${dev.notes}\n\n`;
      }
      markdown += '---\n\n';
    });
  }
  
  // Developer Tasks Section
  if (developerTasks.length > 0) {
    markdown += '## Developer Tasks\n\n';
    developerTasks.forEach(task => {
      markdown += `### ${task.title}\n\n`;
      markdown += `**Status:** ${task.status} | **Priority:** ${task.priority}\n\n`;
      markdown += `${task.description}\n\n`;
      if (task.dueDate) {
        markdown += `**Due Date:** ${task.dueDate}\n\n`;
      }
      if (task.tickets.length > 0) {
        markdown += `**Related Tickets:** ${task.tickets.join(', ')}\n\n`;
      }
      if (task.notes) {
        markdown += `**Notes:** ${task.notes}\n\n`;
      }
      markdown += '---\n\n';
    });
  }
  
  // Tickets Section
  if (tickets.length > 0) {
    markdown += '## Tickets\n\n';
    tickets.forEach(ticket => {
      markdown += `### ${ticket.title}\n\n`;
      markdown += `**Type:** ${ticket.type} | **Status:** ${ticket.status} | **Priority:** ${ticket.priority}\n\n`;
      markdown += `${ticket.description}\n\n`;
      if (ticket.assignee) {
        markdown += `**Assignee:** ${ticket.assignee}\n\n`;
      }
      markdown += `**Reporter:** ${ticket.reporter}\n\n`;
      if (ticket.dueDate) {
        markdown += `**Due Date:** ${ticket.dueDate}\n\n`;
      }
      if (ticket.releaseVersion) {
        markdown += `**Release Version:** ${ticket.releaseVersion}\n\n`;
      }
      if (ticket.notes) {
        markdown += `**Notes:** ${ticket.notes}\n\n`;
      }
      markdown += '---\n\n';
    });
  }
  
  // Release Flows Section
  if (releaseFlows.length > 0) {
    markdown += '## Release Flows\n\n';
    releaseFlows.forEach(flow => {
      markdown += `### ${flow.name}\n\n`;
      markdown += `**Environment:** ${flow.environment} | **Status:** ${flow.status}\n\n`;
      markdown += `${flow.description}\n\n`;
      if (flow.notes) {
        markdown += `**Notes:** ${flow.notes}\n\n`;
      }
      if (flow.steps.length > 0) {
        markdown += '**Steps:**\n\n';
        flow.steps.forEach(step => {
          markdown += `${step.order}. **${step.title}** (${step.type})\n`;
          markdown += `   - ${step.description}\n`;
          if (step.commands.length > 0) {
            markdown += `   - Commands: ${step.commands.join(', ')}\n`;
          }
          if (step.expectedOutcome) {
            markdown += `   - Expected: ${step.expectedOutcome}\n`;
          }
          if (step.estimatedTime) {
            markdown += `   - Estimated Time: ${step.estimatedTime} minutes\n`;
          }
          if (step.assignedTo) {
            markdown += `   - Assigned To: ${step.assignedTo}\n`;
          }
          markdown += '\n';
        });
      }
      markdown += '---\n\n';
    });
  }
  
  return markdown;
}

function generateHTMLContent(data: {
  notes: Note[];
  devCommands: DevCommand[];
  developers: Developer[];
  developerTasks: DeveloperTask[];
  tickets: Ticket[];
  releaseFlows: ReleaseFlow[];
}): string {
  const { notes, devCommands, developers, developerTasks, tickets, releaseFlows } = data;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Notes Export</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
        h3 { margin-top: 25px; }
        .note, .command, .developer, .task, .ticket, .flow { 
            margin-bottom: 25px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            border-left: 4px solid #3498db; 
        }
        .meta { 
            color: #7f8c8d; 
            font-size: 0.9em; 
            margin-bottom: 10px; 
        }
        .tags { margin: 10px 0; }
        .tag { 
            background: #e9ecef; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 0.85em; 
            margin-right: 5px; 
        }
        .command-block { 
            background: #2d3748; 
            color: #e2e8f0; 
            padding: 10px; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            margin: 10px 0; 
        }
        .step { 
            margin-bottom: 15px; 
            padding: 10px; 
            background: #fff; 
            border-radius: 3px; 
            border: 1px solid #e9ecef; 
        }
        .divider { 
            height: 1px; 
            background: #bdc3c7; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <h1>Notes Export</h1>
    <div class="meta">Generated on: ${new Date().toISOString()}</div>
`;

  // Notes Section
  if (notes.length > 0) {
    html += '<h2>Notes</h2>';
    notes.forEach(note => {
      html += `<div class="note">
        <h3>${note.title}</h3>
        <div class="meta">Type: ${note.type} | Status: ${note.status} | Priority: ${note.priority}</div>`;
      
      if (note.tags.length > 0) {
        html += `<div class="tags">${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
      }
      
      if (note.assignedTo && note.assignedTo.length > 0) {
        html += `<div class="meta">Assigned To: ${note.assignedTo.join(', ')}</div>`;
      }
      
      if (note.dueDate) {
        html += `<div class="meta">Due Date: ${note.dueDate}</div>`;
      }
      
      html += `<div>${note.content.replace(/\n/g, '<br>')}</div>`;
      html += '</div>';
    });
  }
  
  // Dev Commands Section
  if (devCommands.length > 0) {
    html += '<h2>Developer Commands</h2>';
    devCommands.forEach(command => {
      html += `<div class="command">
        <h3>${command.name}</h3>
        <div class="meta">Category: ${command.category}</div>
        <div class="command-block">${command.command}</div>
        <div>${command.description}</div>`;
      
      if (command.usage) {
        html += `<div><strong>Usage:</strong> ${command.usage}</div>`;
      }
      
      if (command.examples && command.examples.length > 0) {
        html += `<div><strong>Examples:</strong><br>${command.examples.map(ex => `• ${ex}`).join('<br>')}</div>`;
      }
      
      if (command.tags.length > 0) {
        html += `<div class="tags">${command.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
      }
      
      html += '</div>';
    });
  }
  
  // Developers Section
  if (developers.length > 0) {
    html += '<h2>Developers</h2>';
    developers.forEach(dev => {
      html += `<div class="developer">
        <h3>${dev.name}</h3>
        <div class="meta">Email: ${dev.email}</div>
        <div class="meta">Role: ${dev.role} (${dev.level})</div>
        <div class="meta">Availability: ${dev.availability}</div>`;
      
      if (dev.skills.length > 0) {
        html += `<div><strong>Skills:</strong> ${dev.skills.join(', ')}</div>`;
      }
      
      if (dev.notes) {
        html += `<div><strong>Notes:</strong> ${dev.notes}</div>`;
      }
      
      html += '</div>';
    });
  }
  
  // Developer Tasks Section
  if (developerTasks.length > 0) {
    html += '<h2>Developer Tasks</h2>';
    developerTasks.forEach(task => {
      html += `<div class="task">
        <h3>${task.title}</h3>
        <div class="meta">Status: ${task.status} | Priority: ${task.priority}</div>
        <div>${task.description}</div>`;
      
      if (task.dueDate) {
        html += `<div class="meta">Due Date: ${task.dueDate}</div>`;
      }
      
      if (task.tickets.length > 0) {
        html += `<div><strong>Related Tickets:</strong> ${task.tickets.join(', ')}</div>`;
      }
      
      if (task.notes) {
        html += `<div><strong>Notes:</strong> ${task.notes}</div>`;
      }
      
      html += '</div>';
    });
  }
  
  // Tickets Section
  if (tickets.length > 0) {
    html += '<h2>Tickets</h2>';
    tickets.forEach(ticket => {
      html += `<div class="ticket">
        <h3>${ticket.title}</h3>
        <div class="meta">Type: ${ticket.type} | Status: ${ticket.status} | Priority: ${ticket.priority}</div>
        <div>${ticket.description}</div>`;
      
      if (ticket.assignee) {
        html += `<div class="meta">Assignee: ${ticket.assignee}</div>`;
      }
      
      html += `<div class="meta">Reporter: ${ticket.reporter}</div>`;
      
      if (ticket.dueDate) {
        html += `<div class="meta">Due Date: ${ticket.dueDate}</div>`;
      }
      
      if (ticket.releaseVersion) {
        html += `<div><strong>Release Version:</strong> ${ticket.releaseVersion}</div>`;
      }
      
      if (ticket.notes) {
        html += `<div><strong>Notes:</strong> ${ticket.notes}</div>`;
      }
      
      html += '</div>';
    });
  }
  
  // Release Flows Section
  if (releaseFlows.length > 0) {
    html += '<h2>Release Flows</h2>';
    releaseFlows.forEach(flow => {
      html += `<div class="flow">
        <h3>${flow.name}</h3>
        <div class="meta">Environment: ${flow.environment} | Status: ${flow.status}</div>
        <div>${flow.description}</div>`;
      
      if (flow.notes) {
        html += `<div><strong>Notes:</strong> ${flow.notes}</div>`;
      }
      
      if (flow.steps.length > 0) {
        html += '<div><strong>Steps:</strong></div>';
        flow.steps.forEach(step => {
          html += `<div class="step">
            <div><strong>${step.order}. ${step.title}</strong> (${step.type})</div>
            <div>${step.description}</div>`;
          
          if (step.commands.length > 0) {
            html += `<div class="command-block">${step.commands.join(', ')}</div>`;
          }
          
          if (step.expectedOutcome) {
            html += `<div><strong>Expected:</strong> ${step.expectedOutcome}</div>`;
          }
          
          if (step.estimatedTime) {
            html += `<div><strong>Estimated Time:</strong> ${step.estimatedTime} minutes</div>`;
          }
          
          if (step.assignedTo) {
            html += `<div><strong>Assigned To:</strong> ${step.assignedTo}</div>`;
          }
          
          html += '</div>';
        });
      }
      
      html += '</div>';
    });
  }
  
  html += `
</body>
</html>`;
  
  return html;
}

// Stats endpoint
router.get('/stats/overview', async (req, res) => {
  try {
    const notes = await notesStorage.getNotes();
    const stats: NoteStats = {
      total: notes.length,
      byType: {
        general: notes.filter(n => n.type === 'general').length,
        command: notes.filter(n => n.type === 'command').length,
        developer: notes.filter(n => n.type === 'developer').length,
        ticket: notes.filter(n => n.type === 'ticket').length,
        release: notes.filter(n => n.type === 'release').length,
        flow: notes.filter(n => n.type === 'flow').length,
      },
      byStatus: {
        draft: notes.filter(n => n.status === 'draft').length,
        active: notes.filter(n => n.status === 'active').length,
        archived: notes.filter(n => n.status === 'archived').length,
      },
      byPriority: {
        low: notes.filter(n => n.priority === 'low').length,
        medium: notes.filter(n => n.priority === 'medium').length,
        high: notes.filter(n => n.priority === 'high').length,
        urgent: notes.filter(n => n.priority === 'urgent').length,
      },
      overdue: notes.filter(n => n.dueDate && new Date(n.dueDate) < new Date()).length,
      dueThisWeek: notes.filter(n => {
        if (!n.dueDate) return false;
        const dueDate = new Date(n.dueDate);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return dueDate <= weekFromNow && dueDate >= new Date();
      }).length,
      completed: notes.filter(n => n.completedAt).length,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note stats' });
  }
});

// Dev Commands endpoints
router.get('/dev-commands', async (req, res) => {
  try {
    const devCommands = await notesStorage.getDevCommands();
    res.json(devCommands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dev commands' });
  }
});

// Developers endpoints
router.get('/developers', async (req, res) => {
  try {
    const developers = await notesStorage.getDevelopers();
    res.json(developers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
});

// Developer Tasks endpoints
router.get('/developer-tasks', async (req, res) => {
  try {
    const { developerId } = req.query;
    const tasks = await notesStorage.getDeveloperTasks(developerId as string);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch developer tasks' });
  }
});

// Tickets endpoints
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await notesStorage.getTickets();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Release Flows endpoints
router.get('/release-flows', async (req, res) => {
  try {
    const releaseFlows = await notesStorage.getReleaseFlows();
    res.json(releaseFlows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release flows' });
  }
});

// Search endpoint - Enhanced with FTS5 full-text search
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const types = req.query.types ? (req.query.types as string).split(',') : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Use SQLite's FTS5 for fast full-text search
    const results = await notesStorage.searchNotes(query, limit);

    // Filter by types if specified
    let filteredResults = results;
    if (types?.length) {
      filteredResults = results.filter(note => types.includes(note.type));
    }

    res.json(filteredResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search notes' });
  }
});

// Import/Export endpoints
router.get('/export', async (req, res) => {
  try {
    const format = (req.query.format as string) || 'json';

    // Get all data
    const [notes, devCommands, developers, developerTasks, tickets, releaseFlows] = await Promise.all([
      notesStorage.getNotes(),
      notesStorage.getDevCommands(),
      notesStorage.getDevelopers(),
      notesStorage.getDeveloperTasks(),
      notesStorage.getTickets(),
      notesStorage.getReleaseFlows(),
    ]);

    const data = {
      notes,
      devCommands,
      developers,
      developerTasks,
      tickets,
      releaseFlows,
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="notes.json"');
      res.json(data);
    } else if (format === 'markdown') {
      const markdownContent = generateMarkdownContent(data);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="notes.md"');
      res.send(markdownContent);
    } else if (format === 'pdf') {
      const htmlContent = generateHTMLContent(data);
      
      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in'
          }
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="notes.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer, 'binary');
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({ error: 'Failed to generate PDF document', details: pdfError.message });
      } finally {
        await browser.close();
      }
    } else {
      res.status(400).json({ error: 'Unsupported export format. Supported formats: json, markdown, pdf' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export notes' });
  }
});

// Main notes endpoint - Now uses SQLite's optimized filtering
router.get('/', async (req, res) => {
  try {
    const filter: NoteFilter = {
      search: req.query.search as string,
      type: req.query.type ? (req.query.type as string).split(',') as NoteType[] : undefined,
      status: req.query.status ? (req.query.status as string).split(',') as NoteStatus[] : undefined,
      priority: req.query.priority ? (req.query.priority as string).split(',') as Priority[] : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: req.query.startDate as string,
        end: req.query.endDate as string,
      } : undefined,
      assignedTo: req.query.assignedTo ? (req.query.assignedTo as string).split(',') : undefined,
      createdBy: req.query.createdBy as string,
    };

    const sort: NoteSort = {
      field: (req.query.sortField as any) || 'updatedAt',
      direction: (req.query.sortDirection as any) || 'desc',
    };

    // Use SQLite's optimized filtering and sorting
    const notes = await notesStorage.getNotes(filter, sort);

    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST, PUT, DELETE routes for dev commands
router.post('/dev-commands', async (req, res) => {
  try {
    const newCommand = await notesStorage.createDevCommand(req.body);
    res.status(201).json(newCommand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dev command' });
  }
});

router.put('/dev-commands/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateDevCommand(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Dev command not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dev command' });
  }
});

router.delete('/dev-commands/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteDevCommand(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dev command not found' });
    }
    res.json({ message: 'Dev command deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dev command' });
  }
});

// POST, PUT, DELETE routes for developers
router.post('/developers', async (req, res) => {
  try {
    const newDeveloper = await notesStorage.createDeveloper(req.body);
    res.status(201).json(newDeveloper);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create developer' });
  }
});

router.put('/developers/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateDeveloper(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Developer not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update developer' });
  }
});

router.delete('/developers/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteDeveloper(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Developer not found' });
    }
    res.json({ message: 'Developer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete developer' });
  }
});

// POST, PUT, DELETE routes for developer tasks
router.post('/developer-tasks', async (req, res) => {
  try {
    const newTask = await notesStorage.createDeveloperTask(req.body);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create developer task' });
  }
});

router.put('/developer-tasks/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateDeveloperTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Developer task not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update developer task' });
  }
});

router.delete('/developer-tasks/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteDeveloperTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Developer task not found' });
    }
    res.json({ message: 'Developer task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete developer task' });
  }
});

// POST, PUT, DELETE routes for tickets
router.post('/tickets', async (req, res) => {
  try {
    const newTicket = await notesStorage.createTicket(req.body);
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.put('/tickets/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateTicket(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

router.delete('/tickets/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteTicket(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// POST, PUT, DELETE routes for release flows
router.post('/release-flows', async (req, res) => {
  try {
    const newFlow = await notesStorage.createReleaseFlow(req.body);
    res.status(201).json(newFlow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create release flow' });
  }
});

router.put('/release-flows/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateReleaseFlow(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Release flow not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update release flow' });
  }
});

router.delete('/release-flows/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteReleaseFlow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Release flow not found' });
    }
    res.json({ message: 'Release flow deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete release flow' });
  }
});

// Credentials routes
router.get('/credentials', async (req, res) => {
  try {
    const credentials = await notesStorage.getCredentials();
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

router.get('/credentials/:id', async (req, res) => {
  try {
    const credential = await notesStorage.getCredential(req.params.id);
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    res.json(credential);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credential' });
  }
});

router.post('/credentials', async (req, res) => {
  try {
    const newCredential = await notesStorage.createCredential(req.body);
    res.status(201).json(newCredential);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

router.put('/credentials/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateCredential(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update credential' });
  }
});

router.delete('/credentials/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteCredential(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    res.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

// Import/Export endpoints
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const format = req.body.format || 'markdown';
    
    if (format !== 'markdown') {
      return res.status(400).json({ error: 'Only Markdown format is supported for import' });
    }

    const markdownContent = req.file.buffer.toString('utf-8');
    
    // Parse markdown content to extract notes
    const notesData = parseMarkdownContent(markdownContent);
    
    if (notesData.length === 0) {
      return res.status(400).json({ error: 'No valid notes found in the markdown file' });
    }

    // Create notes in database
    const createdNotes: Note[] = [];
    const errors: string[] = [];
    
    for (const noteData of notesData) {
      try {
        // Generate a unique ID
        noteData.id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const createdNote = await notesStorage.createNote(noteData);
        if (createdNote) {
          createdNotes.push(createdNote);
        }
      } catch (error) {
        console.error('Failed to create note:', noteData.title, error);
        errors.push(`Failed to create note: ${noteData.title}`);
      }
    }

    res.json({
      message: `Successfully imported ${createdNotes.length} notes from markdown`,
      importedCount: createdNotes.length,
      totalFound: notesData.length,
      errors: errors.length > 0 ? errors : undefined,
      notes: createdNotes
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import notes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newNote = await notesStorage.createNote(req.body);
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateNote(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const note = await notesStorage.getNote(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await notesStorage.updateNote(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await notesStorage.deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;

import express from 'express';
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

const router = express.Router();

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
    const format = req.query.format as string;

    if (format === 'json') {
      const [notes, devCommands, developers, developerTasks, tickets, releaseFlows] = await Promise.all([
        notesStorage.getNotes(),
        notesStorage.getDevCommands(),
        notesStorage.getDevelopers(),
        notesStorage.getDeveloperTasks(),
        notesStorage.getTickets(),
        notesStorage.getReleaseFlows(),
      ]);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="notes.json"');
      res.json({
        notes,
        devCommands,
        developers,
        developerTasks,
        tickets,
        releaseFlows,
      });
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
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

// Import/Export endpoints
router.post('/import', async (req, res) => {
  try {
    // TODO: Implement file import logic
    res.json({ message: 'Import functionality not yet implemented' });
  } catch (error) {
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

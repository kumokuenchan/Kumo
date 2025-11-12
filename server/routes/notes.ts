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
} from '../../src/types/notes';

const router = express.Router();

// In-memory storage (in production, use a database)
let notes: Note[] = [];
let devCommands: DevCommand[] = [];
let developers: Developer[] = [];
let developerTasks: DeveloperTask[] = [];
let tickets: Ticket[] = [];
let releaseFlows: ReleaseFlow[] = [];

// Stats endpoint
router.get('/stats/overview', async (req, res) => {
  try {
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
    res.json(devCommands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dev commands' });
  }
});

// Developers endpoints
router.get('/developers', async (req, res) => {
  try {
    res.json(developers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
});

// Developer Tasks endpoints
router.get('/developer-tasks', async (req, res) => {
  try {
    const { developerId } = req.query;
    let tasks = [...developerTasks];
    
    if (developerId) {
      tasks = tasks.filter(t => t.assignedTo === developerId);
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch developer tasks' });
  }
});

// Tickets endpoints
router.get('/tickets', async (req, res) => {
  try {
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Release Flows endpoints
router.get('/release-flows', async (req, res) => {
  try {
    res.json(releaseFlows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release flows' });
  }
});

// Search endpoint
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string).toLowerCase();
    const types = req.query.types ? (req.query.types as string).split(',') : undefined;
    
    let results = [...notes];
    
    if (types?.length) {
      results = results.filter(note => types.includes(note.type));
    }
    
    results = results.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search notes' });
  }
});

// Import/Export endpoints
router.get('/export', async (req, res) => {
  try {
    const format = req.query.format as string;
    
    if (format === 'json') {
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

// Main notes endpoint
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

    let filteredNotes = [...notes];

    // Apply filters
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredNotes = filteredNotes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filter.type?.length) {
      filteredNotes = filteredNotes.filter(note => filter.type!.includes(note.type));
    }

    if (filter.status?.length) {
      filteredNotes = filteredNotes.filter(note => filter.status!.includes(note.status));
    }

    if (filter.priority?.length) {
      filteredNotes = filteredNotes.filter(note => filter.priority!.includes(note.priority));
    }

    if (filter.tags?.length) {
      filteredNotes = filteredNotes.filter(note =>
        filter.tags!.some(tag => note.tags.includes(tag))
      );
    }

    if (filter.dateRange) {
      const startDate = new Date(filter.dateRange.start);
      const endDate = new Date(filter.dateRange.end);
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.updatedAt);
        return noteDate >= startDate && noteDate <= endDate;
      });
    }

    if (filter.assignedTo?.length) {
      filteredNotes = filteredNotes.filter(note =>
        note.assignedTo?.some(assignee => filter.assignedTo!.includes(assignee))
      );
    }

    if (filter.createdBy) {
      filteredNotes = filteredNotes.filter(note => note.createdBy === filter.createdBy);
    }

    // Apply sorting
    filteredNotes.sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];
      
      if (sort.field === 'title') {
        aValue = aValue as string;
        bValue = bValue as string;
        return sort.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (sort.field === 'dueDate' || sort.field === 'createdAt' || sort.field === 'updatedAt') {
        const aDate = aValue ? new Date(aValue as string).getTime() : 0;
        const bDate = bValue ? new Date(bValue as string).getTime() : 0;
        return sort.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      return sort.direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    res.json(filteredNotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const note = notes.find(n => n.id === req.params.id);
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
    const newCommand: DevCommand = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    devCommands.push(newCommand);
    res.status(201).json(newCommand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dev command' });
  }
});

router.put('/dev-commands/:id', async (req, res) => {
  try {
    const index = devCommands.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Dev command not found' });
    }
    
    devCommands[index] = {
      ...devCommands[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(devCommands[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dev command' });
  }
});

router.delete('/dev-commands/:id', async (req, res) => {
  try {
    const index = devCommands.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Dev command not found' });
    }
    
    devCommands.splice(index, 1);
    res.json({ message: 'Dev command deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dev command' });
  }
});

// POST, PUT, DELETE routes for developers
router.post('/developers', async (req, res) => {
  try {
    const newDeveloper: Developer = {
      id: Date.now().toString(),
      ...req.body,
      currentTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    developers.push(newDeveloper);
    res.status(201).json(newDeveloper);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create developer' });
  }
});

router.put('/developers/:id', async (req, res) => {
  try {
    const index = developers.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Developer not found' });
    }
    
    developers[index] = {
      ...developers[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(developers[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update developer' });
  }
});

router.delete('/developers/:id', async (req, res) => {
  try {
    const index = developers.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Developer not found' });
    }
    
    developers.splice(index, 1);
    res.json({ message: 'Developer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete developer' });
  }
});

// POST, PUT, DELETE routes for developer tasks
router.post('/developer-tasks', async (req, res) => {
  try {
    const newTask: DeveloperTask = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    developerTasks.push(newTask);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create developer task' });
  }
});

router.put('/developer-tasks/:id', async (req, res) => {
  try {
    const index = developerTasks.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Developer task not found' });
    }
    
    developerTasks[index] = {
      ...developerTasks[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(developerTasks[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update developer task' });
  }
});

router.delete('/developer-tasks/:id', async (req, res) => {
  try {
    const index = developerTasks.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Developer task not found' });
    }
    
    developerTasks.splice(index, 1);
    res.json({ message: 'Developer task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete developer task' });
  }
});

// POST, PUT, DELETE routes for tickets
router.post('/tickets', async (req, res) => {
  try {
    const newTicket: Ticket = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tickets.push(newTicket);
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.put('/tickets/:id', async (req, res) => {
  try {
    const index = tickets.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    tickets[index] = {
      ...tickets[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(tickets[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

router.delete('/tickets/:id', async (req, res) => {
  try {
    const index = tickets.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    tickets.splice(index, 1);
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// POST, PUT, DELETE routes for release flows
router.post('/release-flows', async (req, res) => {
  try {
    const newFlow: ReleaseFlow = {
      id: Date.now().toString(),
      ...req.body,
      steps: req.body.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    releaseFlows.push(newFlow);
    res.status(201).json(newFlow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create release flow' });
  }
});

router.put('/release-flows/:id', async (req, res) => {
  try {
    const index = releaseFlows.findIndex(f => f.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Release flow not found' });
    }
    
    releaseFlows[index] = {
      ...releaseFlows[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(releaseFlows[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update release flow' });
  }
});

router.delete('/release-flows/:id', async (req, res) => {
  try {
    const index = releaseFlows.findIndex(f => f.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Release flow not found' });
    }
    
    releaseFlows.splice(index, 1);
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
    const newNote: Note = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    notes.push(newNote);
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    notes[index] = {
      ...notes[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json(notes[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    notes.splice(index, 1);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;

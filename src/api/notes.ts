import { api as client } from './client';
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
} from '../types/notes';

export const notesApi = {
  // Notes
  getNotes: async (filter?: NoteFilter, sort?: NoteSort) => {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.search) params.append('search', filter.search);
      if (filter.type?.length) params.append('type', filter.type.join(','));
      if (filter.status?.length) params.append('status', filter.status.join(','));
      if (filter.priority?.length) params.append('priority', filter.priority.join(','));
      if (filter.tags?.length) params.append('tags', filter.tags.join(','));
      if (filter.dateRange) {
        params.append('startDate', filter.dateRange.start);
        params.append('endDate', filter.dateRange.end);
      }
      if (filter.assignedTo?.length) params.append('assignedTo', filter.assignedTo.join(','));
      if (filter.createdBy) params.append('createdBy', filter.createdBy);
    }
    if (sort) {
      params.append('sortField', sort.field);
      params.append('sortDirection', sort.direction);
    }
    
    const response = await client.get(`/notes?${params.toString()}`);
    return response;
  },

  getNote: async (id: string) => {
    const response = await client.get(`/notes/${id}`);
    return response;
  },

  createNote: async (note: Partial<Note>) => {
    const response = await client.post('/notes', note);
    return response;
  },

  updateNote: async (id: string, note: Partial<Note>) => {
    const response = await client.put(`/notes/${id}`, note);
    return response;
  },

  deleteNote: async (id: string) => {
    const response = await client.delete(`/notes/${id}`);
    return response;
  },

  getNoteStats: async () => {
    const response = await client.get('/notes/stats/overview');
    return response as NoteStats;
  },

  // Dev Commands
  getDevCommands: async () => {
    const response = await client.get('/notes/dev-commands');
    return response as DevCommand[];
  },

  createDevCommand: async (command: Partial<DevCommand>) => {
    const response = await client.post('/notes/dev-commands', command);
    return response;
  },

  updateDevCommand: async (id: string, command: Partial<DevCommand>) => {
    const response = await client.put(`/notes/dev-commands/${id}`, command);
    return response;
  },

  deleteDevCommand: async (id: string) => {
    const response = await client.delete(`/notes/dev-commands/${id}`);
    return response;
  },

  // Developers
  getDevelopers: async () => {
    const response = await client.get('/notes/developers');
    return response as Developer[];
  },

  createDeveloper: async (developer: Partial<Developer>) => {
    const response = await client.post('/notes/developers', developer);
    return response;
  },

  updateDeveloper: async (id: string, developer: Partial<Developer>) => {
    const response = await client.put(`/notes/developers/${id}`, developer);
    return response;
  },

  deleteDeveloper: async (id: string) => {
    const response = await client.delete(`/notes/developers/${id}`);
    return response;
  },

  // Developer Tasks
  getDeveloperTasks: async (developerId?: string) => {
    const url = developerId ? `/notes/developer-tasks?developerId=${developerId}` : '/notes/developer-tasks';
    const response = await client.get(url);
    return response as DeveloperTask[];
  },

  createDeveloperTask: async (task: Partial<DeveloperTask>) => {
    const response = await client.post('/notes/developer-tasks', task);
    return response;
  },

  updateDeveloperTask: async (id: string, task: Partial<DeveloperTask>) => {
    const response = await client.put(`/notes/developer-tasks/${id}`, task);
    return response;
  },

  deleteDeveloperTask: async (id: string) => {
    const response = await client.delete(`/notes/developer-tasks/${id}`);
    return response;
  },

  // Tickets
  getTickets: async () => {
    const response = await client.get('/notes/tickets');
    return response as Ticket[];
  },

  createTicket: async (ticket: Partial<Ticket>) => {
    const response = await client.post('/notes/tickets', ticket);
    return response;
  },

  updateTicket: async (id: string, ticket: Partial<Ticket>) => {
    const response = await client.put(`/notes/tickets/${id}`, ticket);
    return response;
  },

  deleteTicket: async (id: string) => {
    const response = await client.delete(`/notes/tickets/${id}`);
    return response;
  },

  // Release Flows
  getReleaseFlows: async () => {
    const response = await client.get('/notes/release-flows');
    return response as ReleaseFlow[];
  },

  createReleaseFlow: async (flow: Partial<ReleaseFlow>) => {
    const response = await client.post('/notes/release-flows', flow);
    return response;
  },

  updateReleaseFlow: async (id: string, flow: Partial<ReleaseFlow>) => {
    const response = await client.put(`/notes/release-flows/${id}`, flow);
    return response;
  },

  deleteReleaseFlow: async (id: string) => {
    const response = await client.delete(`/notes/release-flows/${id}`);
    return response;
  },

  // Import/Export
  exportNotes: async (format: 'json' | 'markdown' | 'csv') => {
    const response = await client.get(`/notes/export?format=${format}`, {
      responseType: 'blob',
    });
    return response;
  },

  importNotes: async (file: File, format: 'json' | 'markdown') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    
    const response = await client.post('/notes/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  // Search
  searchNotes: async (query: string, types?: string[]) => {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.append('types', types.join(','));
    
    const response = await client.get(`/notes/search?${params.toString()}`);
    return response;
  },
};

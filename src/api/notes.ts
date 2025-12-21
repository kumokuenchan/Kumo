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
  Credential,
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

    return await client.get(`/notes?${params.toString()}`);
  },

  getNote: async (id: string) => {
    return await client.get(`/notes/${id}`);
  },

  createNote: async (note: Partial<Note>) => {
    return await client.post('/notes', note);
  },

  updateNote: async (id: string, note: Partial<Note>) => {
    return await client.put(`/notes/${id}`, note);
  },

  deleteNote: async (id: string) => {
    return await client.delete(`/notes/${id}`);
  },

  getNoteStats: async () => {
    return await client.get('/notes/stats/overview') as NoteStats;
  },

  // Dev Commands
  getDevCommands: async () => {
    return await client.get('/notes/dev-commands') as DevCommand[];
  },

  createDevCommand: async (command: Partial<DevCommand>) => {
    return await client.post('/notes/dev-commands', command);
  },

  updateDevCommand: async (id: string, command: Partial<DevCommand>) => {
    return await client.put(`/notes/dev-commands/${id}`, command);
  },

  deleteDevCommand: async (id: string) => {
    return await client.delete(`/notes/dev-commands/${id}`);
  },

  // Developers
  getDevelopers: async () => {
    return await client.get('/notes/developers') as Developer[];
  },

  createDeveloper: async (developer: Partial<Developer>) => {
    return await client.post('/notes/developers', developer);
  },

  updateDeveloper: async (id: string, developer: Partial<Developer>) => {
    return await client.put(`/notes/developers/${id}`, developer);
  },

  deleteDeveloper: async (id: string) => {
    return await client.delete(`/notes/developers/${id}`);
  },

  // Developer Tasks
  getDeveloperTasks: async (developerId?: string) => {
    const url = developerId ? `/notes/developer-tasks?developerId=${developerId}` : '/notes/developer-tasks';
    return await client.get(url) as DeveloperTask[];
  },

  createDeveloperTask: async (task: Partial<DeveloperTask>) => {
    return await client.post('/notes/developer-tasks', task);
  },

  updateDeveloperTask: async (id: string, task: Partial<DeveloperTask>) => {
    return await client.put(`/notes/developer-tasks/${id}`, task);
  },

  deleteDeveloperTask: async (id: string) => {
    return await client.delete(`/notes/developer-tasks/${id}`);
  },

  // Tickets
  getTickets: async () => {
    return await client.get('/notes/tickets') as Ticket[];
  },

  createTicket: async (ticket: Partial<Ticket>) => {
    return await client.post('/notes/tickets', ticket);
  },

  updateTicket: async (id: string, ticket: Partial<Ticket>) => {
    return await client.put(`/notes/tickets/${id}`, ticket);
  },

  deleteTicket: async (id: string) => {
    return await client.delete(`/notes/tickets/${id}`);
  },

  // Release Flows
  getReleaseFlows: async () => {
    return await client.get('/notes/release-flows') as ReleaseFlow[];
  },

  createReleaseFlow: async (flow: Partial<ReleaseFlow>) => {
    return await client.post('/notes/release-flows', flow);
  },

  updateReleaseFlow: async (id: string, flow: Partial<ReleaseFlow>) => {
    return await client.put(`/notes/release-flows/${id}`, flow);
  },

  deleteReleaseFlow: async (id: string) => {
    return await client.delete(`/notes/release-flows/${id}`);
  },

  // Import/Export
  exportNotes: async (format: 'json' | 'markdown' | 'pdf'): Promise<Blob> => {
    const baseUrl = (window as any).API_BASE_URL || '/api';
    const response = await fetch(`${baseUrl}/notes/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                 format === 'markdown' ? 'text/markdown' : 
                 'application/pdf'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Export failed: ${response.statusText}`);
    }

    return await response.blob();
  },

  // Helper function to trigger file download
  downloadExportedFile: async (format: 'json' | 'markdown' | 'pdf', filename?: string) => {
    try {
      const blob = await notesApi.exportNotes(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `notes.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  // Backup/Restore functionality
  backupAllData: async (): Promise<Blob> => {
    const baseUrl = (window as any).API_BASE_URL || '/api';
    const response = await fetch(`${baseUrl}/notes/export?format=json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backup failed: ${response.statusText}`);
    }

    return await response.blob();
  },

  // Helper function to trigger backup download
  downloadBackup: async (filename?: string) => {
    try {
      const blob = await notesApi.backupAllData();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `kumo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup download failed:', error);
      throw error;
    }
  },

  importNotes: async (file: File, format: 'json' | 'markdown') => {
    // Note: For file upload with FormData, use fetch directly as our API client
    // doesn't support multipart/form-data out of the box
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    const response = await fetch(`${(window as any).API_BASE_URL || '/api'}/notes/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import notes');
    }

    return await response.json();
  },

  // Dev Command backup/restore functionality
  backupDevCommands: async (): Promise<Blob> => {
    const baseUrl = (window as any).API_BASE_URL || '/api';
    const response = await fetch(`${baseUrl}/notes/dev-commands/backup`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Dev command backup failed: ${response.statusText}`);
    }

    return await response.blob();
  },

  // Helper function to trigger dev command backup download
  downloadDevCommandBackup: async (filename?: string) => {
    try {
      const blob = await notesApi.backupDevCommands();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `dev-commands-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Dev command backup download failed:', error);
      throw error;
    }
  },

  importDevCommands: async (file: File) => {
    // For file upload with FormData, use fetch directly as our API client
    // doesn't support multipart/form-data out of the box
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${(window as any).API_BASE_URL || '/api'}/notes/dev-commands/restore`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to import dev commands');
    }

    return await response.json();
  },

  // Search
  searchNotes: async (query: string, types?: string[]) => {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.append('types', types.join(','));

    return await client.get(`/notes/search?${params.toString()}`);
  },

  // Credentials
  getCredentials: async () => {
    return await client.get('/notes/credentials') as Credential[];
  },

  createCredential: async (credential: Partial<Credential>) => {
    return await client.post('/notes/credentials', credential);
  },

  updateCredential: async (id: string, credential: Partial<Credential>) => {
    return await client.put(`/notes/credentials/${id}`, credential);
  },

  deleteCredential: async (id: string) => {
    return await client.delete(`/notes/credentials/${id}`);
  },

  // Credential Import/Export
  exportCredentials: async (format: 'json'): Promise<Blob> => {
    // For blob responses, we need to use direct fetch instead of the client
    const isElectron = window.location.protocol === 'file:' || typeof window !== 'undefined' && (window as any).electron;
    const API_BASE_URL = (window as any).API_BASE_URL || (isElectron ? 'http://localhost:3001/api' : '/api');
    const response = await fetch(`${API_BASE_URL}/notes/credentials/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Export failed: ${response.statusText}`);
    }

    return await response.blob();
  },

  // Helper function to trigger credential file download
  downloadExportedCredentials: async (filename?: string) => {
    try {
      const blob = await notesApi.exportCredentials('json');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `credentials.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  importCredentials: async (file: File) => {
    // For file upload with FormData, use fetch directly as our API client
    // doesn't support multipart/form-data out of the box
    const isElectron = window.location.protocol === 'file:' || typeof window !== 'undefined' && (window as any).electron;
    const API_BASE_URL = (window as any).API_BASE_URL || (isElectron ? 'http://localhost:3001/api' : '/api');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/notes/credentials/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to import credentials');
    }

    return await response.json();
  },
};

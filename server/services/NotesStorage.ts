import fs from 'fs/promises';
import path from 'path';
import {
  Note,
  DevCommand,
  Developer,
  DeveloperTask,
  Ticket,
  ReleaseFlow,
} from '../../src/types/notes.js';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

interface NotesData {
  notes: Note[];
  devCommands: DevCommand[];
  developers: Developer[];
  developerTasks: DeveloperTask[];
  tickets: Ticket[];
  releaseFlows: ReleaseFlow[];
}

class NotesStorage {
  private storageFile: string;
  private data: NotesData = {
    notes: [],
    devCommands: [],
    developers: [],
    developerTasks: [],
    tickets: [],
    releaseFlows: [],
  };
  private initialized = false;

  constructor() {
    this.storageFile = path.join(process.cwd(), 'data', 'notes.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure data directory exists
    await fs.mkdir(path.dirname(this.storageFile), { recursive: true });

    try {
      const fileData = await fs.readFile(this.storageFile, 'utf-8');
      this.data = JSON.parse(fileData);
    } catch (err: any) {
      // If file doesn't exist, start with empty data
      if (err?.code !== 'ENOENT') throw err;
    }

    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await fs.writeFile(this.storageFile, JSON.stringify(this.data, null, 2));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // Notes methods
  async getNotes(): Promise<Note[]> {
    await this.initialize();
    return [...this.data.notes];
  }

  async getNote(id: string): Promise<Note | undefined> {
    await this.initialize();
    return this.data.notes.find(n => n.id === id);
  }

  async createNote(noteData: Partial<Note>): Promise<Note> {
    await this.initialize();

    const now = new Date().toISOString();
    const note: Note = {
      id: this.generateId('note'),
      title: noteData.title || 'Untitled',
      content: noteData.content || '',
      type: noteData.type || 'general',
      status: noteData.status || 'active',
      priority: noteData.priority || 'medium',
      tags: noteData.tags || [],
      icon: noteData.icon,
      coverImage: noteData.coverImage,
      isPinned: noteData.isPinned || false,
      createdAt: now,
      updatedAt: now,
      ...noteData,
    };

    this.data.notes.unshift(note);
    await this.persist();
    return note;
  }

  async updateNote(id: string, noteData: Partial<Note>): Promise<Note | null> {
    await this.initialize();

    const index = this.data.notes.findIndex(n => n.id === id);
    if (index === -1) return null;

    // Metadata fields that shouldn't trigger updatedAt change
    const metadataFields = ['lastViewedAt', 'viewCount', 'isPinned', 'isFavorite'];
    const updateKeys = Object.keys(noteData);
    const isMetadataOnly = updateKeys.every(key => metadataFields.includes(key));

    const updatedNote: Note = {
      ...this.data.notes[index],
      ...noteData,
      id, // Ensure ID doesn't change
      // Only update updatedAt if actual content/fields changed (not just metadata)
      updatedAt: isMetadataOnly ? this.data.notes[index].updatedAt : new Date().toISOString(),
    };

    this.data.notes[index] = updatedNote;
    await this.persist();
    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.notes.length;
    this.data.notes = this.data.notes.filter(n => n.id !== id);

    if (this.data.notes.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  // Dev Commands methods
  async getDevCommands(): Promise<DevCommand[]> {
    await this.initialize();
    return [...this.data.devCommands];
  }

  async createDevCommand(commandData: Partial<DevCommand>): Promise<DevCommand> {
    await this.initialize();

    const now = new Date().toISOString();
    const command: DevCommand = {
      id: this.generateId('cmd'),
      name: commandData.name || 'Untitled Command',
      command: commandData.command || '',
      description: commandData.description || '',
      category: commandData.category || 'general',
      tags: commandData.tags || [],
      isFavorite: commandData.isFavorite || false,
      createdAt: now,
      updatedAt: now,
      ...commandData,
    };

    this.data.devCommands.push(command);
    await this.persist();
    return command;
  }

  async updateDevCommand(id: string, commandData: Partial<DevCommand>): Promise<DevCommand | null> {
    await this.initialize();

    const index = this.data.devCommands.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updatedCommand: DevCommand = {
      ...this.data.devCommands[index],
      ...commandData,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.data.devCommands[index] = updatedCommand;
    await this.persist();
    return updatedCommand;
  }

  async deleteDevCommand(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.devCommands.length;
    this.data.devCommands = this.data.devCommands.filter(c => c.id !== id);

    if (this.data.devCommands.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  // Developers methods
  async getDevelopers(): Promise<Developer[]> {
    await this.initialize();
    return [...this.data.developers];
  }

  async createDeveloper(developerData: Partial<Developer>): Promise<Developer> {
    await this.initialize();

    const now = new Date().toISOString();
    const developer: Developer = {
      id: this.generateId('dev'),
      name: developerData.name || 'Unknown',
      email: developerData.email || '',
      role: developerData.role || 'developer',
      level: developerData.level || 'mid',
      skills: developerData.skills || [],
      currentTasks: developerData.currentTasks || [],
      availability: developerData.availability || 'available',
      createdAt: now,
      updatedAt: now,
      ...developerData,
    };

    this.data.developers.push(developer);
    await this.persist();
    return developer;
  }

  async updateDeveloper(id: string, developerData: Partial<Developer>): Promise<Developer | null> {
    await this.initialize();

    const index = this.data.developers.findIndex(d => d.id === id);
    if (index === -1) return null;

    const updatedDeveloper: Developer = {
      ...this.data.developers[index],
      ...developerData,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.data.developers[index] = updatedDeveloper;
    await this.persist();
    return updatedDeveloper;
  }

  async deleteDeveloper(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.developers.length;
    this.data.developers = this.data.developers.filter(d => d.id !== id);

    if (this.data.developers.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  // Developer Tasks methods
  async getDeveloperTasks(developerId?: string): Promise<DeveloperTask[]> {
    await this.initialize();

    if (developerId) {
      return this.data.developerTasks.filter(t => t.assignedTo === developerId);
    }
    return [...this.data.developerTasks];
  }

  async createDeveloperTask(taskData: Partial<DeveloperTask>): Promise<DeveloperTask> {
    await this.initialize();

    const now = new Date().toISOString();
    const task: DeveloperTask = {
      id: this.generateId('task'),
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      assignedTo: taskData.assignedTo || '',
      createdBy: taskData.createdBy || '',
      tickets: taskData.tickets || [],
      createdAt: now,
      updatedAt: now,
      ...taskData,
    };

    this.data.developerTasks.push(task);
    await this.persist();
    return task;
  }

  async updateDeveloperTask(id: string, taskData: Partial<DeveloperTask>): Promise<DeveloperTask | null> {
    await this.initialize();

    const index = this.data.developerTasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updatedTask: DeveloperTask = {
      ...this.data.developerTasks[index],
      ...taskData,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.data.developerTasks[index] = updatedTask;
    await this.persist();
    return updatedTask;
  }

  async deleteDeveloperTask(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.developerTasks.length;
    this.data.developerTasks = this.data.developerTasks.filter(t => t.id !== id);

    if (this.data.developerTasks.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  // Tickets methods
  async getTickets(): Promise<Ticket[]> {
    await this.initialize();
    return [...this.data.tickets];
  }

  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    await this.initialize();

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: this.generateId('ticket'),
      title: ticketData.title || 'Untitled Ticket',
      description: ticketData.description || '',
      status: ticketData.status || 'open',
      priority: ticketData.priority || 'medium',
      type: ticketData.type || 'bug',
      assignee: ticketData.assignee,
      reporter: ticketData.reporter || '',
      createdAt: now,
      updatedAt: now,
      ...ticketData,
    };

    this.data.tickets.push(ticket);
    await this.persist();
    return ticket;
  }

  async updateTicket(id: string, ticketData: Partial<Ticket>): Promise<Ticket | null> {
    await this.initialize();

    const index = this.data.tickets.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updatedTicket: Ticket = {
      ...this.data.tickets[index],
      ...ticketData,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.data.tickets[index] = updatedTicket;
    await this.persist();
    return updatedTicket;
  }

  async deleteTicket(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.tickets.length;
    this.data.tickets = this.data.tickets.filter(t => t.id !== id);

    if (this.data.tickets.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  // Release Flows methods
  async getReleaseFlows(): Promise<ReleaseFlow[]> {
    await this.initialize();
    return [...this.data.releaseFlows];
  }

  async createReleaseFlow(flowData: Partial<ReleaseFlow>): Promise<ReleaseFlow> {
    await this.initialize();

    const now = new Date().toISOString();
    const flow: ReleaseFlow = {
      id: this.generateId('flow'),
      name: flowData.name || 'Untitled Flow',
      description: flowData.description || '',
      status: flowData.status || 'draft',
      steps: flowData.steps || [],
      environment: flowData.environment || 'development',
      createdBy: flowData.createdBy || '',
      createdAt: now,
      updatedAt: now,
      ...flowData,
    };

    this.data.releaseFlows.push(flow);
    await this.persist();
    return flow;
  }

  async updateReleaseFlow(id: string, flowData: Partial<ReleaseFlow>): Promise<ReleaseFlow | null> {
    await this.initialize();

    const index = this.data.releaseFlows.findIndex(f => f.id === id);
    if (index === -1) return null;

    const updatedFlow: ReleaseFlow = {
      ...this.data.releaseFlows[index],
      ...flowData,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.data.releaseFlows[index] = updatedFlow;
    await this.persist();
    return updatedFlow;
  }

  async deleteReleaseFlow(id: string): Promise<boolean> {
    await this.initialize();

    const initialLength = this.data.releaseFlows.length;
    this.data.releaseFlows = this.data.releaseFlows.filter(f => f.id !== id);

    if (this.data.releaseFlows.length < initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }
}

export const notesStorage = new NotesStorage();

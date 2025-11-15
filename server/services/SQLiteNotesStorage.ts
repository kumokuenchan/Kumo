import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
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
} from '../../src/types/notes.js';
import { EncryptionService } from './EncryptionService.js';

sqlite3.verbose();

interface NotesDatabase {
  notes: Note[];
  devCommands: DevCommand[];
  developers: Developer[];
  developerTasks: DeveloperTask[];
  tickets: Ticket[];
  releaseFlows: ReleaseFlow[];
  credentials: Credential[];
}

class SQLiteNotesStorage {
  private db: sqlite3.Database | null = null;
  private dbPath: string;
  private initialized = false;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'notes.db');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure data directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

    // Initialize SQLite database with promise wrapper
    this.db = await new Promise<sqlite3.Database>((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          resolve(db);
        }
      });
    });

    // Enable WAL mode for better concurrency
    await this.runSQL('PRAGMA journal_mode = WAL');
    await this.runSQL('PRAGMA synchronous = NORMAL');
    
    await this.createTables();
    this.initialized = true;
  }

  private async runSQL(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (sql.trim().toLowerCase().startsWith('select')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }

  private async createTables(): Promise<void> {
    // Create main tables
    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        type TEXT DEFAULT 'general',
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        tags TEXT DEFAULT '[]', -- JSON array as text
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        createdBy TEXT,
        assignedTo TEXT, -- JSON array as text
        dueDate TEXT,
        completedAt TEXT,
        parentId TEXT,
        metadata TEXT DEFAULT '{}', -- JSON object as text
        isPinned INTEGER DEFAULT 0,
        isFavorite INTEGER DEFAULT 0,
        coverImage TEXT,
        icon TEXT,
        template TEXT,
        mentions TEXT DEFAULT '[]',
        backlinks TEXT DEFAULT '[]',
        linkedNotes TEXT DEFAULT '[]',
        version INTEGER DEFAULT 1,
        isPublic INTEGER DEFAULT 0,
        shareToken TEXT,
        viewCount INTEGER DEFAULT 0,
        lastViewedAt TEXT,
        noteOrder INTEGER DEFAULT 0
      )
    `);

    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS dev_commands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'general',
        tags TEXT DEFAULT '[]', -- JSON array as text
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        usage TEXT,
        examples TEXT DEFAULT '[]', -- JSON array as text
        notes TEXT,
        isFavorite INTEGER DEFAULT 0
      )
    `);

    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS developers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        role TEXT DEFAULT 'developer',
        level TEXT DEFAULT 'mid',
        skills TEXT DEFAULT '[]', -- JSON array as text
        currentTasks TEXT DEFAULT '[]', -- JSON array as text
        availability TEXT DEFAULT 'available',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS developer_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assignedTo TEXT NOT NULL,
        createdBy TEXT DEFAULT '',
        dueDate TEXT,
        completedAt TEXT,
        tickets TEXT DEFAULT '[]', -- JSON array as text
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT DEFAULT 'bug',
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        assignee TEXT,
        reporter TEXT DEFAULT '',
        dueDate TEXT,
        completedAt TEXT,
        estimatedHours REAL,
        actualHours REAL,
        releaseVersion TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS release_flows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        steps TEXT DEFAULT '[]', -- JSON array as text
        environment TEXT DEFAULT 'development',
        status TEXT DEFAULT 'draft',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        createdBy TEXT DEFAULT '',
        notes TEXT
      )
    `);

    // Create FTS5 virtual tables for full-text search
    await this.runSQL(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, content, tags, type, 
        content='notes', content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 1'
      )
    `);

    // Create credentials table
    await this.runSQL(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        url TEXT,
        description TEXT,
        category TEXT DEFAULT 'general',
        tags TEXT DEFAULT '[]', -- JSON array as text
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastAccessedAt TEXT,
        accessCount INTEGER DEFAULT 0,
        isFavorite INTEGER DEFAULT 0,
        isShared INTEGER DEFAULT 0
      )
    `);

    // Create indexes for better performance
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_createdAt ON notes(createdAt)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_isPinned ON notes(isPinned)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_notes_isFavorite ON notes(isFavorite)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_credentials_category ON credentials(category)');
    await this.runSQL('CREATE INDEX IF NOT EXISTS idx_credentials_isFavorite ON credentials(isFavorite)');

    // Triggers to sync FTS5 table with notes table
    await this.runSQL(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content, tags, type) 
        VALUES (new.rowid, new.title, new.content, new.tags, new.type);
      END
    `);

    await this.runSQL(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts) VALUES('delete-all');
        INSERT INTO notes_fts(rowid, title, content, tags, type) 
        SELECT rowid, title, content, tags, type FROM notes WHERE rowid > 0;
      END
    `);

    await this.runSQL(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts) VALUES('delete-all');
        INSERT INTO notes_fts(rowid, title, content, tags, type) 
        SELECT rowid, title, content, tags, type FROM notes WHERE rowid > 0;
      END
    `);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private parseJSON(text: string, defaultValue: any = []): any {
    try {
      return text ? JSON.parse(text) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private stringifyJSON(obj: any): string {
    return JSON.stringify(obj || []);
  }

  // Notes methods
  async getNotes(filter?: NoteFilter, sort?: NoteSort): Promise<Note[]> {
    await this.initialize();
    
    let sql = 'SELECT * FROM notes';
    const params: any[] = [];
    const whereConditions: string[] = [];

    // Apply filters
    if (filter) {
      if (filter.search) {
        // Use FTS5 for search
        const ftsResults = await this.runSQL(
          'SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?',
          [filter.search]
        ) as Array<{ rowid: number }>;
        
        if (ftsResults.length === 0) {
          return [];
        }
        
        const ids = ftsResults.map(r => r.rowid);
        whereConditions.push(`rowid IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }

      if (filter.type?.length) {
        whereConditions.push(`type IN (${filter.type.map(() => '?').join(',')})`);
        params.push(...filter.type);
      }

      if (filter.status?.length) {
        whereConditions.push(`status IN (${filter.status.map(() => '?').join(',')})`);
        params.push(...filter.status);
      }

      if (filter.priority?.length) {
        whereConditions.push(`priority IN (${filter.priority.map(() => '?').join(',')})`);
        params.push(...filter.priority);
      }

      if (filter.dateRange) {
        whereConditions.push('createdAt BETWEEN ? AND ?');
        params.push(filter.dateRange.start, filter.dateRange.end);
      }

      if (filter.createdBy) {
        whereConditions.push('createdBy = ?');
        params.push(filter.createdBy);
      }
    }

    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Apply sorting
    if (sort) {
      sql += ` ORDER BY ${sort.field} ${sort.direction.toUpperCase()}`;
    } else {
      sql += ' ORDER BY updatedAt DESC';
    }

    const rows = await this.runSQL(sql, params) as any[];

    return rows.map(row => ({
      ...row,
      tags: this.parseJSON(row.tags),
      assignedTo: this.parseJSON(row.assignedTo),
      mentions: this.parseJSON(row.mentions),
      backlinks: this.parseJSON(row.backlinks),
      linkedNotes: this.parseJSON(row.linkedNotes),
      metadata: this.parseJSON(row.metadata, {}),
      isPinned: Boolean(row.isPinned),
      isFavorite: Boolean(row.isFavorite),
      isPublic: Boolean(row.isPublic),
      viewCount: row.viewCount || 0,
    }));
  }

  async getNote(id: string): Promise<Note | undefined> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM notes WHERE id = ?', [id]) as any[];
    
    if (rows.length === 0) return undefined;
    
    const row = rows[0];
    return {
      ...row,
      tags: this.parseJSON(row.tags),
      assignedTo: this.parseJSON(row.assignedTo),
      mentions: this.parseJSON(row.mentions),
      backlinks: this.parseJSON(row.backlinks),
      linkedNotes: this.parseJSON(row.linkedNotes),
      metadata: this.parseJSON(row.metadata, {}),
      isPinned: Boolean(row.isPinned),
      isFavorite: Boolean(row.isFavorite),
      isPublic: Boolean(row.isPublic),
      viewCount: row.viewCount || 0,
    };
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
      createdAt: now,
      updatedAt: now,
      ...noteData,
    };

    await this.runSQL(`
      INSERT INTO notes (
        id, title, content, type, status, priority, tags, createdAt, updatedAt,
        createdBy, assignedTo, dueDate, completedAt, parentId, metadata,
        isPinned, isFavorite, coverImage, icon, template, mentions, backlinks,
        linkedNotes, version, isPublic, shareToken, viewCount, lastViewedAt, noteOrder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      note.id,
      note.title,
      note.content,
      note.type,
      note.status,
      note.priority,
      this.stringifyJSON(note.tags),
      note.createdAt,
      note.updatedAt,
      note.createdBy,
      this.stringifyJSON(note.assignedTo),
      note.dueDate,
      note.completedAt,
      note.parentId,
      this.stringifyJSON(note.metadata || {}),
      note.isPinned ? 1 : 0,
      note.isFavorite ? 1 : 0,
      note.coverImage,
      note.icon,
      note.template,
      this.stringifyJSON(note.mentions),
      this.stringifyJSON(note.backlinks),
      this.stringifyJSON(note.linkedNotes),
      note.version || 1,
      note.isPublic ? 1 : 0,
      note.shareToken,
      note.viewCount || 0,
      note.lastViewedAt,
      note.order || 0,
    ]);

    return note;
  }

  async updateNote(id: string, noteData: Partial<Note>): Promise<Note | null> {
    await this.initialize();

    const existingNote = await this.getNote(id);
    if (!existingNote) return null;

    const updatedNote = {
      ...existingNote,
      ...noteData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE notes SET 
        title = ?, content = ?, type = ?, status = ?, priority = ?,
        tags = ?, updatedAt = ?, createdBy = ?, assignedTo = ?,
        dueDate = ?, completedAt = ?, parentId = ?, metadata = ?,
        isPinned = ?, isFavorite = ?, coverImage = ?, icon = ?,
        template = ?, mentions = ?, backlinks = ?, linkedNotes = ?,
        version = ?, isPublic = ?, shareToken = ?, viewCount = ?,
        lastViewedAt = ?, noteOrder = ?
      WHERE id = ?
    `, [
      updatedNote.title,
      updatedNote.content,
      updatedNote.type,
      updatedNote.status,
      updatedNote.priority,
      this.stringifyJSON(updatedNote.tags),
      updatedNote.updatedAt,
      updatedNote.createdBy,
      this.stringifyJSON(updatedNote.assignedTo),
      updatedNote.dueDate,
      updatedNote.completedAt,
      updatedNote.parentId,
      this.stringifyJSON(updatedNote.metadata || {}),
      updatedNote.isPinned ? 1 : 0,
      updatedNote.isFavorite ? 1 : 0,
      updatedNote.coverImage,
      updatedNote.icon,
      updatedNote.template,
      this.stringifyJSON(updatedNote.mentions),
      this.stringifyJSON(updatedNote.backlinks),
      this.stringifyJSON(updatedNote.linkedNotes),
      updatedNote.version || 1,
      updatedNote.isPublic ? 1 : 0,
      updatedNote.shareToken,
      updatedNote.viewCount || 0,
      updatedNote.lastViewedAt,
      updatedNote.order || 0,
      id,
    ]);

    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM notes WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  async getNoteStats(): Promise<NoteStats> {
    await this.initialize();

    const notes = await this.getNotes();
    
    return {
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
  }

  // Dev Commands methods
  async getDevCommands(): Promise<DevCommand[]> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM dev_commands ORDER BY updatedAt DESC') as any[];
    
    return rows.map(row => ({
      ...row,
      tags: this.parseJSON(row.tags),
      examples: this.parseJSON(row.examples),
      isFavorite: Boolean(row.isFavorite),
    }));
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
      createdAt: now,
      updatedAt: now,
      ...commandData,
    };

    await this.runSQL(`
      INSERT INTO dev_commands (
        id, name, command, description, category, tags, createdAt, updatedAt,
        usage, examples, notes, isFavorite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      command.id,
      command.name,
      command.command,
      command.description,
      command.category,
      this.stringifyJSON(command.tags),
      command.createdAt,
      command.updatedAt,
      command.usage,
      this.stringifyJSON(command.examples),
      command.notes,
      command.isFavorite ? 1 : 0,
    ]);

    return command;
  }

  async updateDevCommand(id: string, commandData: Partial<DevCommand>): Promise<DevCommand | null> {
    await this.initialize();

    const existingCommand = await this.runSQL('SELECT * FROM dev_commands WHERE id = ?', [id]) as any[];
    if (existingCommand.length === 0) return null;

    const updatedCommand = {
      ...existingCommand[0],
      ...commandData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE dev_commands SET 
        name = ?, command = ?, description = ?, category = ?, tags = ?,
        updatedAt = ?, usage = ?, examples = ?, notes = ?, isFavorite = ?
      WHERE id = ?
    `, [
      updatedCommand.name,
      updatedCommand.command,
      updatedCommand.description,
      updatedCommand.category,
      this.stringifyJSON(updatedCommand.tags),
      updatedCommand.updatedAt,
      updatedCommand.usage,
      this.stringifyJSON(updatedCommand.examples),
      updatedCommand.notes,
      updatedCommand.isFavorite ? 1 : 0,
      id,
    ]);

    return {
      ...updatedCommand,
      tags: this.parseJSON(updatedCommand.tags),
      examples: this.parseJSON(updatedCommand.examples),
      isFavorite: Boolean(updatedCommand.isFavorite),
    };
  }

  async deleteDevCommand(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM dev_commands WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Developers methods
  async getDevelopers(): Promise<Developer[]> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM developers ORDER BY updatedAt DESC') as any[];
    
    return rows.map(row => ({
      ...row,
      skills: this.parseJSON(row.skills),
      currentTasks: this.parseJSON(row.currentTasks),
    }));
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

    await this.runSQL(`
      INSERT INTO developers (
        id, name, email, role, level, skills, currentTasks, availability,
        notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      developer.id,
      developer.name,
      developer.email,
      developer.role,
      developer.level,
      this.stringifyJSON(developer.skills),
      this.stringifyJSON(developer.currentTasks),
      developer.availability,
      developer.notes,
      developer.createdAt,
      developer.updatedAt,
    ]);

    return developer;
  }

  async updateDeveloper(id: string, developerData: Partial<Developer>): Promise<Developer | null> {
    await this.initialize();

    const existingDeveloper = await this.runSQL('SELECT * FROM developers WHERE id = ?', [id]) as any[];
    if (existingDeveloper.length === 0) return null;

    const updatedDeveloper = {
      ...existingDeveloper[0],
      ...developerData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE developers SET 
        name = ?, email = ?, role = ?, level = ?, skills = ?,
        currentTasks = ?, availability = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `, [
      updatedDeveloper.name,
      updatedDeveloper.email,
      updatedDeveloper.role,
      updatedDeveloper.level,
      this.stringifyJSON(updatedDeveloper.skills),
      this.stringifyJSON(updatedDeveloper.currentTasks),
      updatedDeveloper.availability,
      updatedDeveloper.notes,
      updatedDeveloper.updatedAt,
      id,
    ]);

    return {
      ...updatedDeveloper,
      skills: this.parseJSON(updatedDeveloper.skills),
      currentTasks: this.parseJSON(updatedDeveloper.currentTasks),
    };
  }

  async deleteDeveloper(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM developers WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Developer Tasks methods
  async getDeveloperTasks(developerId?: string): Promise<DeveloperTask[]> {
    await this.initialize();
    
    let sql = 'SELECT * FROM developer_tasks';
    const params: any[] = [];
    
    if (developerId) {
      sql += ' WHERE assignedTo = ?';
      params.push(developerId);
    }
    
    sql += ' ORDER BY updatedAt DESC';
    
    const rows = await this.runSQL(sql, params) as any[];
    
    return rows.map(row => ({
      ...row,
      tickets: this.parseJSON(row.tickets),
    }));
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

    await this.runSQL(`
      INSERT INTO developer_tasks (
        id, title, description, status, priority, assignedTo, createdBy,
        dueDate, completedAt, tickets, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assignedTo,
      task.createdBy,
      task.dueDate,
      task.completedAt,
      this.stringifyJSON(task.tickets),
      task.notes,
      task.createdAt,
      task.updatedAt,
    ]);

    return task;
  }

  async updateDeveloperTask(id: string, taskData: Partial<DeveloperTask>): Promise<DeveloperTask | null> {
    await this.initialize();

    const existingTask = await this.runSQL('SELECT * FROM developer_tasks WHERE id = ?', [id]) as any[];
    if (existingTask.length === 0) return null;

    const updatedTask = {
      ...existingTask[0],
      ...taskData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE developer_tasks SET 
        title = ?, description = ?, status = ?, priority = ?,
        assignedTo = ?, createdBy = ?, dueDate = ?, completedAt = ?,
        tickets = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `, [
      updatedTask.title,
      updatedTask.description,
      updatedTask.status,
      updatedTask.priority,
      updatedTask.assignedTo,
      updatedTask.createdBy,
      updatedTask.dueDate,
      updatedTask.completedAt,
      this.stringifyJSON(updatedTask.tickets),
      updatedTask.notes,
      updatedTask.updatedAt,
      id,
    ]);

    return {
      ...updatedTask,
      tickets: this.parseJSON(updatedTask.tickets),
    };
  }

  async deleteDeveloperTask(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM developer_tasks WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Tickets methods
  async getTickets(): Promise<Ticket[]> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM tickets ORDER BY updatedAt DESC') as any[];
    
    return rows;
  }

  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    await this.initialize();

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: this.generateId('ticket'),
      title: ticketData.title || 'Untitled Ticket',
      description: ticketData.description || '',
      type: ticketData.type || 'bug',
      status: ticketData.status || 'open',
      priority: ticketData.priority || 'medium',
      assignee: ticketData.assignee,
      reporter: ticketData.reporter || '',
      createdAt: now,
      updatedAt: now,
      ...ticketData,
    };

    await this.runSQL(`
      INSERT INTO tickets (
        id, title, description, type, status, priority, assignee, reporter,
        dueDate, completedAt, estimatedHours, actualHours, releaseVersion,
        notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticket.id,
      ticket.title,
      ticket.description,
      ticket.type,
      ticket.status,
      ticket.priority,
      ticket.assignee,
      ticket.reporter,
      ticket.dueDate,
      ticket.completedAt,
      ticket.estimatedHours,
      ticket.actualHours,
      ticket.releaseVersion,
      ticket.notes,
      ticket.createdAt,
      ticket.updatedAt,
    ]);

    return ticket;
  }

  async updateTicket(id: string, ticketData: Partial<Ticket>): Promise<Ticket | null> {
    await this.initialize();

    const existingTicket = await this.runSQL('SELECT * FROM tickets WHERE id = ?', [id]) as any[];
    if (existingTicket.length === 0) return null;

    const updatedTicket = {
      ...existingTicket[0],
      ...ticketData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE tickets SET 
        title = ?, description = ?, type = ?, status = ?, priority = ?,
        assignee = ?, reporter = ?, dueDate = ?, completedAt = ?,
        estimatedHours = ?, actualHours = ?, releaseVersion = ?,
        notes = ?, updatedAt = ?
      WHERE id = ?
    `, [
      updatedTicket.title,
      updatedTicket.description,
      updatedTicket.type,
      updatedTicket.status,
      updatedTicket.priority,
      updatedTicket.assignee,
      updatedTicket.reporter,
      updatedTicket.dueDate,
      updatedTicket.completedAt,
      updatedTicket.estimatedHours,
      updatedTicket.actualHours,
      updatedTicket.releaseVersion,
      updatedTicket.notes,
      updatedTicket.updatedAt,
      id,
    ]);

    return updatedTicket;
  }

  async deleteTicket(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM tickets WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Release Flows methods
  async getReleaseFlows(): Promise<ReleaseFlow[]> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM release_flows ORDER BY updatedAt DESC') as any[];
    
    return rows.map(row => ({
      ...row,
      steps: this.parseJSON(row.steps),
    }));
  }

  async createReleaseFlow(flowData: Partial<ReleaseFlow>): Promise<ReleaseFlow> {
    await this.initialize();

    const now = new Date().toISOString();
    const flow: ReleaseFlow = {
      id: this.generateId('flow'),
      name: flowData.name || 'Untitled Flow',
      description: flowData.description || '',
      steps: flowData.steps || [],
      environment: flowData.environment || 'development',
      status: flowData.status || 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: flowData.createdBy || '',
      ...flowData,
    };

    await this.runSQL(`
      INSERT INTO release_flows (
        id, name, description, steps, environment, status,
        createdAt, updatedAt, createdBy, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      flow.id,
      flow.name,
      flow.description,
      this.stringifyJSON(flow.steps),
      flow.environment,
      flow.status,
      flow.createdAt,
      flow.updatedAt,
      flow.createdBy,
      flow.notes,
    ]);

    return flow;
  }

  async updateReleaseFlow(id: string, flowData: Partial<ReleaseFlow>): Promise<ReleaseFlow | null> {
    await this.initialize();

    const existingFlow = await this.runSQL('SELECT * FROM release_flows WHERE id = ?', [id]) as any[];
    if (existingFlow.length === 0) return null;

    const updatedFlow = {
      ...existingFlow[0],
      ...flowData,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE release_flows SET 
        name = ?, description = ?, steps = ?, environment = ?,
        status = ?, updatedAt = ?, createdBy = ?, notes = ?
      WHERE id = ?
    `, [
      updatedFlow.name,
      updatedFlow.description,
      this.stringifyJSON(updatedFlow.steps),
      updatedFlow.environment,
      updatedFlow.status,
      updatedFlow.updatedAt,
      updatedFlow.createdBy,
      updatedFlow.notes,
      id,
    ]);

    return {
      ...updatedFlow,
      steps: this.parseJSON(updatedFlow.steps),
    };
  }

  async deleteReleaseFlow(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM release_flows WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Search functionality using FTS5
  async searchNotes(query: string, limit: number = 50): Promise<Note[]> {
    await this.initialize();

    try {
      const ftsResults = await this.runSQL(`
        SELECT rowid FROM notes_fts 
        WHERE notes_fts MATCH ? 
        LIMIT ?
      `, [query, limit]) as Array<{ rowid: number }>;

      if (ftsResults.length === 0) {
        return [];
      }

      const ids = ftsResults.map(r => r.rowid);
      const notes = await this.runSQL(
        `SELECT * FROM notes WHERE rowid IN (${ids.map(() => '?').join(',')}) ORDER BY updatedAt DESC`,
        ids
      ) as any[];

      return notes.map(row => ({
        ...row,
        tags: this.parseJSON(row.tags),
        assignedTo: this.parseJSON(row.assignedTo),
        mentions: this.parseJSON(row.mentions),
        backlinks: this.parseJSON(row.backlinks),
        linkedNotes: this.parseJSON(row.linkedNotes),
        metadata: this.parseJSON(row.metadata, {}),
        isPinned: Boolean(row.isPinned),
        isFavorite: Boolean(row.isFavorite),
        isPublic: Boolean(row.isPublic),
        viewCount: row.viewCount || 0,
      }));
    } catch (error) {
      // Fallback to simple LIKE search if FTS5 fails
      const fallbackResults = await this.getNotes({ 
        search: `%${query}%` 
      } as NoteFilter);
      return fallbackResults.slice(0, limit);
    }
  }

  // Credentials methods
  async getCredentials(): Promise<Credential[]> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM credentials ORDER BY updatedAt DESC') as any[];
    
    return rows.map(row => ({
      ...row,
      // Decrypt password when retrieving
      password: EncryptionService.isEncrypted(row.password) 
        ? EncryptionService.decrypt(row.password) 
        : row.password,
      tags: this.parseJSON(row.tags),
      isFavorite: Boolean(row.isFavorite),
      isShared: Boolean(row.isShared),
      accessCount: row.accessCount || 0,
    }));
  }

  async getCredential(id: string): Promise<Credential | undefined> {
    await this.initialize();
    
    const rows = await this.runSQL('SELECT * FROM credentials WHERE id = ?', [id]) as any[];
    
    if (rows.length === 0) return undefined;
    
    const row = rows[0];
    return {
      ...row,
      // Decrypt password when retrieving
      password: EncryptionService.isEncrypted(row.password) 
        ? EncryptionService.decrypt(row.password) 
        : row.password,
      tags: this.parseJSON(row.tags),
      isFavorite: Boolean(row.isFavorite),
      isShared: Boolean(row.isShared),
      accessCount: row.accessCount || 0,
    };
  }

  async createCredential(credentialData: Partial<Credential>): Promise<Credential> {
    await this.initialize();

    const now = new Date().toISOString();
    // Encrypt password before storing
    const encryptedPassword = credentialData.password 
      ? EncryptionService.encryptFallback(credentialData.password)
      : '';

    const credential: Credential = {
      id: this.generateId('cred'),
      title: credentialData.title || '',
      username: credentialData.username || '',
      password: credentialData.password || '', // Return unencrypted password to the client
      category: credentialData.category || 'general',
      tags: credentialData.tags || [],
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      ...credentialData,
    };

    await this.runSQL(`
      INSERT INTO credentials (
        id, title, username, password, url, description, category, tags,
        createdAt, updatedAt, lastAccessedAt, accessCount, isFavorite, isShared
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      credential.id,
      credential.title,
      credential.username,
      encryptedPassword, // Store encrypted password
      credential.url,
      credential.description,
      credential.category,
      this.stringifyJSON(credential.tags),
      credential.createdAt,
      credential.updatedAt,
      credential.lastAccessedAt,
      credential.accessCount,
      credential.isFavorite ? 1 : 0,
      credential.isShared ? 1 : 0,
    ]);

    return credential;
  }

  async updateCredential(id: string, credentialData: Partial<Credential>): Promise<Credential | null> {
    await this.initialize();

    const existingCredential = await this.runSQL('SELECT * FROM credentials WHERE id = ?', [id]) as any[];
    if (existingCredential.length === 0) return null;

    // Encrypt password if provided
    const encryptedPassword = credentialData.password 
      ? EncryptionService.encryptFallback(credentialData.password)
      : existingCredential[0].password;

    const updatedCredential = {
      ...existingCredential[0],
      ...credentialData,
      password: credentialData.password || existingCredential[0].password, // Keep unencrypted in memory
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.runSQL(`
      UPDATE credentials SET 
        title = ?, username = ?, password = ?, url = ?, description = ?,
        category = ?, tags = ?, updatedAt = ?, lastAccessedAt = ?,
        accessCount = ?, isFavorite = ?, isShared = ?
      WHERE id = ?
    `, [
      updatedCredential.title,
      updatedCredential.username,
      encryptedPassword, // Store encrypted password
      updatedCredential.url,
      updatedCredential.description,
      updatedCredential.category,
      this.stringifyJSON(updatedCredential.tags),
      updatedCredential.updatedAt,
      updatedCredential.lastAccessedAt,
      updatedCredential.accessCount,
      updatedCredential.isFavorite ? 1 : 0,
      updatedCredential.isShared ? 1 : 0,
      id,
    ]);

    return {
      ...updatedCredential,
      tags: this.parseJSON(updatedCredential.tags),
      isFavorite: Boolean(updatedCredential.isFavorite),
      isShared: Boolean(updatedCredential.isShared),
      accessCount: updatedCredential.accessCount || 0,
    };
  }

  async deleteCredential(id: string): Promise<boolean> {
    await this.initialize();

    const result = await this.runSQL('DELETE FROM credentials WHERE id = ?', [id]);
    return (result as any).changes > 0;
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
}

export const sqliteNotesStorage = new SQLiteNotesStorage();
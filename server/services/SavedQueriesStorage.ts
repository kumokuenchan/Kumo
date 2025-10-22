import fs from 'fs/promises';
import path from 'path';

export interface SavedQueryEntry {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
  database?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

class SavedQueriesStorage {
  private storageFile: string;
  private entries: Map<string, SavedQueryEntry[]> = new Map();
  private initialized = false;

  constructor() {
    this.storageFile = path.join(process.cwd(), 'data', 'saved-queries.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const list = JSON.parse(data) as SavedQueryEntry[];
      for (const e of list) {
        if (!this.entries.has(e.connectionId)) this.entries.set(e.connectionId, []);
        this.entries.get(e.connectionId)!.push(e);
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    const all: SavedQueryEntry[] = [];
    for (const arr of this.entries.values()) all.push(...arr);
    await fs.writeFile(this.storageFile, JSON.stringify(all, null, 2));
  }

  private id(): string {
    return `sq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async list(connectionId: string, search?: string, limit = 200): Promise<SavedQueryEntry[]> {
    if (!this.initialized) await this.initialize();
    let arr = this.entries.get(connectionId) || [];
    if (search && search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e) => e.name.toLowerCase().includes(q) || e.sql.toLowerCase().includes(q));
    }
    // Newest first
    arr = [...arr].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return arr.slice(0, limit);
  }

  async getById(id: string): Promise<SavedQueryEntry | null> {
    if (!this.initialized) await this.initialize();
    for (const arr of this.entries.values()) {
      const found = arr.find((e) => e.id === id);
      if (found) return found;
    }
    return null;
  }

  async add(connectionId: string, name: string, sql: string, database?: string, tags?: string[]): Promise<SavedQueryEntry> {
    if (!this.initialized) await this.initialize();
    const now = new Date().toISOString();
    const entry: SavedQueryEntry = { id: this.id(), connectionId, name, sql, database, tags, createdAt: now, updatedAt: now };
    if (!this.entries.has(connectionId)) this.entries.set(connectionId, []);
    this.entries.get(connectionId)!.unshift(entry);
    await this.persist();
    return entry;
  }

  async update(id: string, patch: Partial<Pick<SavedQueryEntry, 'name' | 'sql' | 'database' | 'tags'>>): Promise<SavedQueryEntry | null> {
    if (!this.initialized) await this.initialize();
    for (const [connId, arr] of this.entries.entries()) {
      const idx = arr.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const next = { ...arr[idx], ...patch, updatedAt: new Date().toISOString() } as SavedQueryEntry;
        arr[idx] = next;
        // Move to front on update
        arr.splice(idx, 1);
        arr.unshift(next);
        await this.persist();
        return next;
      }
    }
    return null;
  }

  async remove(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    for (const [connId, arr] of this.entries.entries()) {
      const idx = arr.findIndex((e) => e.id === id);
      if (idx !== -1) {
        arr.splice(idx, 1);
        await this.persist();
        return true;
      }
    }
    return false;
  }
}

export const savedQueriesStorage = new SavedQueriesStorage();


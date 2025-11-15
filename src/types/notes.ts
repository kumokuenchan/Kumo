export type NoteType = 'general' | 'command' | 'developer' | 'ticket' | 'release' | 'flow';

export type NoteStatus = 'draft' | 'active' | 'archived';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  status: NoteStatus;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  assignedTo?: string[];
  dueDate?: string;
  completedAt?: string;
  parentId?: string;
  children?: Note[];
  metadata?: Record<string, any>;

  // New Notion-inspired features
  isPinned?: boolean;
  isFavorite?: boolean;
  coverImage?: string;
  icon?: string; // emoji or icon name
  template?: string; // template id if created from template
  mentions?: string[]; // user ids or note ids mentioned
  backlinks?: string[]; // note ids that link to this note
  linkedNotes?: string[]; // note ids this note links to
  version?: number;
  isPublic?: boolean;
  shareToken?: string;
  order?: number; // for manual ordering
  viewCount?: number;
  lastViewedAt?: string;
}

export interface DevCommand {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usage?: string;
  examples?: string[];
  notes?: string;
  isFavorite?: boolean;
}

export interface Developer {
  id: string;
  name: string;
  email: string;
  role: string;
  level: 'junior' | 'mid' | 'senior' | 'lead';
  skills: string[];
  currentTasks: DeveloperTask[];
  availability: 'available' | 'busy' | 'away' | 'offline';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: Priority;
  assignedTo: string;
  createdBy: string;
  dueDate?: string;
  completedAt?: string;
  tickets: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'task';
  status: 'open' | 'in-progress' | 'review' | 'testing' | 'done' | 'closed';
  priority: Priority;
  assignee?: string;
  reporter: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  releaseVersion?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseFlow {
  id: string;
  name: string;
  description: string;
  steps: ReleaseStep[];
  environment: 'development' | 'staging' | 'production';
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}

export interface ReleaseStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'manual' | 'automatic' | 'approval' | 'deployment';
  commands: string[];
  expectedOutcome: string;
  rollbackProcedure?: string;
  estimatedTime?: number;
  assignedTo?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface NoteFilter {
  search?: string;
  type?: NoteType[];
  status?: NoteStatus[];
  priority?: Priority[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  assignedTo?: string[];
  createdBy?: string;
}

export interface NoteSort {
  field: 'title' | 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';
  direction: 'asc' | 'desc';
}

export interface NotesListView {
  view: 'grid' | 'list' | 'kanban';
  filter: NoteFilter;
  sort: NoteSort;
  groupBy?: 'type' | 'status' | 'priority' | 'assignee' | 'none';
}

export interface NoteStats {
  total: number;
  byType: Record<NoteType, number>;
  byStatus: Record<NoteStatus, number>;
  byPriority: Record<Priority, number>;
  overdue: number;
  dueThisWeek: number;
  completed: number;
}

// New Notion-inspired types

export interface NoteComment {
  id: string;
  noteId: string;
  content: string;
  author: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  isResolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  parentCommentId?: string; // for threaded comments
  mentions?: string[];
}

export interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  title: string;
  content: string;
  changedBy: string;
  changedByName?: string;
  createdAt: string;
  changes?: string; // description of changes
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: NoteType;
  content: string;
  tags?: string[];
  priority?: Priority;
  isDefault?: boolean;
  category: 'work' | 'personal' | 'meeting' | 'project' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export type EmbedType = 'link' | 'youtube' | 'github' | 'twitter' | 'figma' | 'code' | 'image';

export interface NoteEmbed {
  id: string;
  type: EmbedType;
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'tip' | 'note';

export interface NoteCallout {
  id: string;
  type: CalloutType;
  title?: string;
  content: string;
  icon?: string;
}

export interface NoteBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'code' | 'callout' | 'embed' | 'image' | 'table' | 'divider' | 'list' | 'quote';
  content: any;
  order: number;
  metadata?: Record<string, any>;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filter: NoteFilter;
  sort?: NoteSort;
  viewMode?: 'grid' | 'list' | 'kanban';
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRelation {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  relationType: 'link' | 'parent-child' | 'related' | 'duplicate' | 'blocks' | 'blocked-by';
  createdAt: string;
  createdBy: string;
}

export interface NoteMention {
  id: string;
  type: 'user' | 'note';
  targetId: string; // user id or note id
  targetName: string;
  position: number; // character position in content
}

export interface Credential {
  id: string;
  title: string;
  username: string;
  password: string; // This will be stored encrypted in the backend
  url?: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  isFavorite?: boolean;
  isShared?: boolean;
}

export interface QuickCaptureSettings {
  enabled: boolean;
  shortcut: string;
  defaultType: NoteType;
  defaultPriority: Priority;
  autoTag?: string[];
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  action: string;
  category: 'navigation' | 'editing' | 'formatting' | 'general';
}

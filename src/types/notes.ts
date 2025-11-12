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

export enum NoteTopic {
  MIT = 'MIT',
  Promptings = 'Promptings',
  Gratitude = 'Gratitude',
}

export interface Note {
  id: string; // UUID string
  topic: NoteTopic; // Enum restricted to 'MIT' | 'Promptings' | 'Gratitude'
  content: string;
  createdAt?: string; // Optional ISO timestamp string
}

export interface Day {
  id: string; // UUID string
  hymnNumber: number; // Hymn number assigned to this day
  date: string; // Unique date string ('YYYY-MM-DD' or ISO timestamp)
  notes: Note[]; // Array of notes created for this day
}

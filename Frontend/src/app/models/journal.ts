export interface JournalEntry {
  id?: string;
  hymnId: number;
  hymnTitle: string;
  date: string;
  inspiration: string;
  application: string;
  tasks: JournalTask[];
}

export interface JournalTask {
  id: string;
  text: string;
  completed: boolean;
}

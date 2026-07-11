import { Injectable, signal, effect } from '@angular/core';
import { JournalEntry } from '../../models/journal';

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private readonly STORAGE_KEY = 'hymn_journal_entries';
  private readonly entries = signal<JournalEntry[]>([]);

  readonly allEntries = this.entries.asReadonly();

  constructor() {
    this.loadEntries();

    // Automatically sync changes to local storage
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entries()));
    });
  }

  private loadEntries(): void {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        this.entries.set(JSON.parse(data));
      } catch (e) {
        console.error('Failed to parse journal entries', e);
        this.entries.set([]);
      }
    }
  }

  addEntry(entry: Omit<JournalEntry, 'id'>): void {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString()
    };
    this.entries.update(current => [newEntry, ...current]);
  }

  updateEntry(updatedEntry: JournalEntry): void {
    this.entries.update(current => 
      current.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
    );
  }

  deleteEntry(id: string): void {
    this.entries.update(current => current.filter(entry => entry.id !== id));
  }

  getEntriesByHymn(hymnId: number): JournalEntry[] {
    return this.entries().filter(entry => entry.hymnId === hymnId);
  }
}

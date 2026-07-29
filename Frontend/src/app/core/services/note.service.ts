import { Injectable, signal, computed } from '@angular/core';
import { Day, Note, NoteTopic } from '../models/note';
import { formatDateKey } from '../utils/random.util';

export interface NoteTableItem {
  id: string;
  dayId: string;
  date: string;
  hymnNumber: number | string;
  topic: NoteTopic;
  content: string;
  createdAt?: string;
}

const NOTES_STORAGE_KEY = 'hymn_worship_days_notes';

@Injectable({ providedIn: 'root' })
export class NoteService {
  /** Reactive signal containing all Day records with their notes */
  readonly daysSignal = signal<Day[]>([]);

  constructor() {
    this.daysSignal.set(this.loadFromStorage());
  }

  /** Derived signal: all notes aggregated across all days for table views */
  readonly allNotesItems = computed<NoteTableItem[]>(() => {
    const days = this.daysSignal();
    const items: NoteTableItem[] = [];
    if (!Array.isArray(days)) return items;

    for (const day of days) {
      if (day && Array.isArray(day.notes)) {
        for (const note of day.notes) {
          if (note && note.id) {
            items.push({
              id: note.id,
              dayId: day.id || 'day-unknown',
              date: day.date || '',
              hymnNumber: day.hymnNumber ?? 0,
              topic: note.topic || NoteTopic.MIT,
              content: note.content || '',
              createdAt: note.createdAt,
            });
          }
        }
      }
    }

    // Sort newest notes first
    return items.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  });

  /** Load days & notes safely from localStorage */
  private loadFromStorage(): Day[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Failed to load notes from localStorage:', err);
      return [];
    }
  }

  /** Save days & notes to localStorage */
  private saveToStorage(days: Day[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(days));
      }
    } catch (err) {
      console.warn('Failed to save notes to localStorage:', err);
    }
  }

  /** Get notes for a specific hymn number and date */
  getNotesForHymn(hymnNumber: number | string, dateStr?: string): Note[] {
    const targetDate = dateStr ?? formatDateKey(new Date());
    const days = this.daysSignal();
    if (!Array.isArray(days)) return [];

    const foundDay = days.find(
      (d) => d && String(d.hymnNumber) === String(hymnNumber) && d.date === targetDate
    );
    return foundDay && Array.isArray(foundDay.notes) ? foundDay.notes : [];
  }

  /** Add a new note for a specific hymn and date */
  addNote(hymnNumber: number | string, topic: NoteTopic, content: string, dateStr?: string): Note {
    const targetDate = dateStr ?? formatDateKey(new Date());
    const days = [...(this.daysSignal() || [])];
    const dayIndex = days.findIndex(
      (d) => d && String(d.hymnNumber) === String(hymnNumber) && d.date === targetDate
    );

    const newNote: Note = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'note-' + Date.now(),
      topic: topic || NoteTopic.MIT,
      content: (content || '').trim(),
      createdAt: new Date().toISOString(),
    };

    if (dayIndex >= 0) {
      const existingNotes = Array.isArray(days[dayIndex].notes) ? days[dayIndex].notes : [];
      days[dayIndex] = {
        ...days[dayIndex],
        notes: [newNote, ...existingNotes],
      };
    } else {
      const newDay: Day = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'day-' + Date.now(),
        hymnNumber: Number(hymnNumber) || 0,
        date: targetDate,
        notes: [newNote],
      };
      days.push(newDay);
    }

    this.daysSignal.set(days);
    this.saveToStorage(days);
    return newNote;
  }

  /** Delete a note by ID */
  deleteNote(noteId: string): void {
    if (!noteId) return;
    const currentDays = this.daysSignal() || [];
    const updatedDays = currentDays.map((d) => ({
      ...d,
      notes: Array.isArray(d.notes) ? d.notes.filter((n) => n && n.id !== noteId) : [],
    }));
    this.daysSignal.set(updatedDays);
    this.saveToStorage(updatedDays);
  }
}

import { Injectable, signal } from '@angular/core';
import { Day, Note, NoteTopic } from '../models/note';
import { formatDateKey } from '../utils/random.util';

const NOTES_STORAGE_KEY = 'hymn_worship_days_notes';

@Injectable({ providedIn: 'root' })
export class NoteService {
  /** Reactive signal containing all Day records with their notes */
  readonly daysSignal = signal<Day[]>(this.loadFromStorage());

  /** Load days & notes from localStorage */
  private loadFromStorage(): Day[] {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.warn('Failed to load notes from localStorage:', err);
      return [];
    }
  }

  /** Save days & notes to localStorage */
  private saveToStorage(days: Day[]): void {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(days));
    } catch (err) {
      console.warn('Failed to save notes to localStorage:', err);
    }
  }

  /** Get notes for a specific hymn number and date */
  getNotesForHymn(hymnNumber: number | string, dateStr?: string): Note[] {
    const targetDate = dateStr ?? formatDateKey(new Date());
    const days = this.daysSignal();
    const foundDay = days.find(
      (d) => String(d.hymnNumber) === String(hymnNumber) && d.date === targetDate
    );
    return foundDay ? foundDay.notes : [];
  }

  /** Add a new note for a specific hymn and date */
  addNote(hymnNumber: number | string, topic: NoteTopic, content: string, dateStr?: string): Note {
    const targetDate = dateStr ?? formatDateKey(new Date());
    const days = [...this.daysSignal()];
    const dayIndex = days.findIndex(
      (d) => String(d.hymnNumber) === String(hymnNumber) && d.date === targetDate
    );

    const newNote: Note = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'note-' + Date.now(),
      topic,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    if (dayIndex >= 0) {
      days[dayIndex] = {
        ...days[dayIndex],
        notes: [newNote, ...days[dayIndex].notes],
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
    const updatedDays = this.daysSignal().map((d) => ({
      ...d,
      notes: d.notes.filter((n) => n.id !== noteId),
    }));
    this.daysSignal.set(updatedDays);
    this.saveToStorage(updatedDays);
  }
}

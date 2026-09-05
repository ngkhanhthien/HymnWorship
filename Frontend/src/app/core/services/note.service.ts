import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Day, Note, NoteTopic } from '../models/note';
import { formatDateKey } from '../utils/random.util';
import { FirebaseAuthService } from './firebase-auth.service';
import {
  getFirestore,
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

export interface NoteTableItem {
  id: string;
  dayId: string;
  date: string;
  hymnNumber: number | string;
  topic: NoteTopic;
  content: string;
  createdAt?: string;
  userId?: string;
}

const NOTES_STORAGE_KEY = 'hymn_worship_days_notes';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly authService = inject(FirebaseAuthService);
  private db: any = null;
  private unsubscribeSnapshot: Unsubscribe | null = null;

  /** Reactive signal containing all Day records with their notes for active user */
  readonly daysSignal = signal<Day[]>([]);

  constructor() {
    try {
      this.db = getFirestore();
    } catch (err) {
      console.warn('Firestore initialization fallback:', err);
    }

    // Monitor active user state and load user-specific notes from Firestore or localStorage fallback
    effect(() => {
      const user = this.authService.currentUser();
      const initialized = this.authService.isAuthInitialized();

      if (this.unsubscribeSnapshot) {
        this.unsubscribeSnapshot();
        this.unsubscribeSnapshot = null;
      }

      if (initialized && user) {
        const userIdentifier = user.uid || user.displayName || user.email;
        this.subscribeToUserNotes(userIdentifier);
      } else {
        // Unauthenticated or guest state: clear active notes
        this.daysSignal.set([]);
      }
    });
  }

  /** Subscribe in real-time to Firestore user-isolated notes */
  private subscribeToUserNotes(userIdentifier: string): void {
    if (!this.db || !userIdentifier) {
      this.daysSignal.set(this.loadFromStorage(userIdentifier));
      return;
    }

    try {
      const notesRef = collection(this.db, 'notes');
      const q = query(notesRef, where('userId', '==', userIdentifier));

      this.unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const daysMap = new Map<string, Day>();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const noteId = docSnap.id;
            const hymnNum = data['hymnNumber'] ?? 0;
            const dateStr = data['date'] || '';
            const key = `${hymnNum}_${dateStr}`;

            if (!daysMap.has(key)) {
              daysMap.set(key, {
                id: key,
                userId: userIdentifier,
                hymnNumber: Number(hymnNum) || 0,
                date: dateStr,
                notes: [],
              });
            }

            daysMap.get(key)!.notes.push({
              id: noteId,
              userId: userIdentifier,
              topic: data['topic'] || NoteTopic.MIT,
              content: data['content'] || '',
              createdAt: data['createdAt'] || new Date().toISOString(),
            });
          });

          const daysArray = Array.from(daysMap.values());
          this.daysSignal.set(daysArray);
          this.saveToStorage(userIdentifier, daysArray);
        },
        (error) => {
          console.warn('Firestore subscription error, using local fallback:', error);
          this.daysSignal.set(this.loadFromStorage(userIdentifier));
        }
      );
    } catch (e) {
      console.warn('Failed to listen to Firestore notes:', e);
      this.daysSignal.set(this.loadFromStorage(userIdentifier));
    }
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
              userId: note.userId || day.userId,
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

  /** Load days & notes safely from localStorage per user */
  private loadFromStorage(userIdentifier: string): Day[] {
    try {
      if (typeof localStorage === 'undefined' || !userIdentifier) return [];
      const saved = localStorage.getItem(`${NOTES_STORAGE_KEY}_${userIdentifier}`);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  /** Save days & notes to localStorage per user */
  private saveToStorage(userIdentifier: string, days: Day[]): void {
    try {
      if (typeof localStorage !== 'undefined' && userIdentifier) {
        localStorage.setItem(`${NOTES_STORAGE_KEY}_${userIdentifier}`, JSON.stringify(days));
      }
    } catch (err) {
      // Ignore
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

  /** Add a new note for a specific hymn and date, saving to Firestore & updating UI */
  async addNote(
    hymnNumber: number | string,
    topic: NoteTopic,
    content: string,
    dateStr?: string
  ): Promise<Note> {
    const user = this.authService.currentUser();
    const userIdentifier = user?.uid || user?.displayName || user?.email || 'guest';
    const targetDate = dateStr ?? formatDateKey(new Date());
    const trimmedContent = (content || '').trim();
    const createdAtIso = new Date().toISOString();

    const notePayload = {
      userId: userIdentifier,
      hymnNumber: Number(hymnNumber) || 0,
      date: targetDate,
      topic: topic || NoteTopic.MIT,
      content: trimmedContent,
      createdAt: createdAtIso,
    };

    let generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'note-' + Date.now();

    if (this.db && user) {
      try {
        const docRef = await addDoc(collection(this.db, 'notes'), notePayload);
        generatedId = docRef.id;
      } catch (err) {
        console.warn('Failed to save note to Firestore, saving locally:', err);
      }
    }

    const newNote: Note = {
      id: generatedId,
      userId: userIdentifier,
      topic: topic || NoteTopic.MIT,
      content: trimmedContent,
      createdAt: createdAtIso,
    };

    // Optimistically update local daysSignal state
    const days = [...(this.daysSignal() || [])];
    const dayIndex = days.findIndex(
      (d) => d && String(d.hymnNumber) === String(hymnNumber) && d.date === targetDate
    );

    if (dayIndex >= 0) {
      const existingNotes = Array.isArray(days[dayIndex].notes) ? days[dayIndex].notes : [];
      days[dayIndex] = {
        ...days[dayIndex],
        notes: [newNote, ...existingNotes],
      };
    } else {
      const newDay: Day = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'day-' + Date.now(),
        userId: userIdentifier,
        hymnNumber: Number(hymnNumber) || 0,
        date: targetDate,
        notes: [newNote],
      };
      days.push(newDay);
    }

    this.daysSignal.set(days);
    this.saveToStorage(userIdentifier, days);
    return newNote;
  }

  /** Delete a note by ID from Firestore & local state */
  async deleteNote(noteId: string): Promise<void> {
    if (!noteId) return;

    const user = this.authService.currentUser();
    const userIdentifier = user?.uid || user?.displayName || user?.email || 'guest';

    if (this.db && user) {
      try {
        await deleteDoc(doc(this.db, 'notes', noteId));
      } catch (err) {
        console.warn('Failed to delete note from Firestore:', err);
      }
    }

    const currentDays = this.daysSignal() || [];
    const updatedDays = currentDays.map((d) => ({
      ...d,
      notes: Array.isArray(d.notes) ? d.notes.filter((n) => n && n.id !== noteId) : [],
    }));
    this.daysSignal.set(updatedDays);
    this.saveToStorage(userIdentifier, updatedDays);
  }
}

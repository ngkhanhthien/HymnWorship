import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NoteService, NoteTableItem } from '../../core/services/note.service';
import { NoteTopic } from '../../core/models/note';
import { NotesTableComponent } from './components/notes-table/notes-table.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [FormsModule, NotesTableComponent, ConfirmModalComponent],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.css',
})
export class NotesPageComponent {
  private readonly noteService = inject(NoteService);
  private readonly route = inject(ActivatedRoute);

  /** All table notes signal from NoteService */
  readonly notes = this.noteService.allNotesItems;

  /** Search query string typed in input */
  readonly searchQueryInput = signal<string>('');

  /** Active query applied when user presses Enter or clicks Search */
  readonly activeSearchQuery = signal<string>('');

  /** Filtered notes signal based on activeSearchQuery */
  readonly filteredNotes = computed<NoteTableItem[]>(() => {
    const all = this.notes();
    const query = this.activeSearchQuery().trim().toLowerCase();

    if (!query) return all;

    return all.filter((note) => {
      const contentMatch = (note.content || '').toLowerCase().includes(query);
      const hymnMatch = String(note.hymnNumber || '').toLowerCase().includes(query);
      const topicMatch = (note.topic || '').toLowerCase().includes(query);
      const dateMatch = (note.date || '').toLowerCase().includes(query);
      return contentMatch || hymnMatch || topicMatch || dateMatch;
    });
  });

  /** Highlighted note ID passed from URL query params */
  readonly highlightId = signal<string | null>(null);

  onSearch(): void {
    this.activeSearchQuery.set(this.searchQueryInput().trim());
  }

  clearSearch(): void {
    this.searchQueryInput.set('');
    this.activeSearchQuery.set('');
  }

  constructor() {
    this.route.queryParams.subscribe((params: Params) => {
      const id = params['highlight'] || params['id'] || params['noteId'];
      if (id) {
        this.highlightId.set(String(id));
      }
    });
  }

  /** Track note ID pending deletion confirmation */
  readonly noteIdToDelete = signal<string | null>(null);

  /** Currently editing note item, or null if edit modal is closed */
  readonly editingNote = signal<NoteTableItem | null>(null);

  /** Edit form input signals */
  readonly editTopic = signal<NoteTopic>(NoteTopic.MIT);
  readonly editContent = signal<string>('');

  /** Track note save loading state */
  readonly isSavingNote = signal<boolean>(false);

  /** Allowed topic enum values array */
  readonly topics = [NoteTopic.MIT, NoteTopic.Promptings, NoteTopic.Gratitude];

  onEditNote(item: NoteTableItem): void {
    this.editingNote.set(item);
    this.editTopic.set(item.topic || NoteTopic.MIT);
    this.editContent.set(item.content || '');
  }

  closeEditModal(): void {
    if (this.isSavingNote()) return;
    this.editingNote.set(null);
  }

  async saveEditedNote(): Promise<void> {
    const target = this.editingNote();
    const content = this.editContent().trim();

    if (!target || !content || this.isSavingNote()) return;

    this.isSavingNote.set(true);
    try {
      await this.noteService.updateNote(target.id, this.editTopic(), content);
      this.editingNote.set(null);
    } finally {
      this.isSavingNote.set(false);
    }
  }

  onDeleteNote(id: string): void {
    this.noteIdToDelete.set(id);
  }

  confirmDeleteNote(): void {
    const id = this.noteIdToDelete();
    if (id) {
      this.noteService.deleteNote(id);
    }
    this.noteIdToDelete.set(null);
  }

  cancelDeleteNote(): void {
    this.noteIdToDelete.set(null);
  }
}

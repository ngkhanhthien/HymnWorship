import { Component, inject, signal } from '@angular/core';
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

  /** Highlighted note ID passed from URL query params */
  readonly highlightId = signal<string | null>(null);

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

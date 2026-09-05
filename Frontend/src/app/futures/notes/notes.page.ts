import { Component, inject, signal } from '@angular/core';
import { NoteService, NoteTableItem } from '../../core/services/note.service';
import { NotesTableComponent } from './components/notes-table/notes-table.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [NotesTableComponent, ConfirmModalComponent],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.css',
})
export class NotesPageComponent {
  private readonly noteService = inject(NoteService);

  /** All table notes signal from NoteService */
  readonly notes = this.noteService.allNotesItems;

  /** Track note ID pending deletion confirmation */
  readonly noteIdToDelete = signal<string | null>(null);

  onEditNote(item: NoteTableItem): void {
    console.log('Edit note UI action clicked:', item);
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

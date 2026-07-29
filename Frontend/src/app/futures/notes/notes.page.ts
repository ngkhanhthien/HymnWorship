import { Component, inject } from '@angular/core';
import { NoteService, NoteTableItem } from '../../core/services/note.service';
import { NotesTableComponent } from './components/notes-table/notes-table.component';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [NotesTableComponent],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.css',
})
export class NotesPageComponent {
  private readonly noteService = inject(NoteService);

  /** All table notes signal from NoteService */
  readonly notes = this.noteService.allNotesItems;

  onEditNote(item: NoteTableItem): void {
    console.log('Edit note UI action clicked:', item);
  }

  onDeleteNote(id: string): void {
    this.noteService.deleteNote(id);
  }
}

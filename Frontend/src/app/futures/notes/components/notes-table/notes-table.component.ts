import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteTableItem } from '../../../../core/services/note.service';

@Component({
  selector: 'app-notes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes-table.component.html',
  styleUrl: './notes-table.component.css',
})
export class NotesTableComponent {
  @Input() notes: NoteTableItem[] = [];

  @Output() editNote = new EventEmitter<NoteTableItem>();
  @Output() deleteNote = new EventEmitter<string>();

  onEdit(item: NoteTableItem): void {
    this.editNote.emit(item);
  }

  onDelete(id: string): void {
    this.deleteNote.emit(id);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  formatTime(isoStr?: string): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }
}

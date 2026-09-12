import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteTableItem } from '../../../../core/services/note.service';
import { HymnDataService } from '../../../../core/services/hymn-data.service';

@Component({
  selector: 'app-notes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes-table.component.html',
  styleUrl: './notes-table.component.css',
})
export class NotesTableComponent {
  private readonly hymnDataService = inject(HymnDataService);

  @Input() notes: NoteTableItem[] = [];

  @Output() editNote = new EventEmitter<NoteTableItem>();
  @Output() deleteNote = new EventEmitter<string>();

  expandedNoteIds = new Set<string>();

  getHymnTitle(hymnNumber: number | string): string {
    if (!hymnNumber) return '';
    const hymn = this.hymnDataService.getHymnFast(hymnNumber);
    return hymn?.title ? ` - ${hymn.title}` : '';
  }

  toggleExpand(id: string): void {
    if (this.expandedNoteIds.has(id)) {
      this.expandedNoteIds.delete(id);
    } else {
      this.expandedNoteIds.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedNoteIds.has(id);
  }

  getPreviewText(content?: string): string {
    if (!content) return '';
    const singleLine = content.replace(/\s+/g, ' ').trim();
    if (singleLine.length > 70) {
      return singleLine.substring(0, 70) + '...';
    }
    return singleLine;
  }

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

  formatLastEdited(isoStr?: string): string {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }
}

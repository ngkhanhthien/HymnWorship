import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { CalendarComponent } from '../../shared/components/calendar/calendar';
import { ScheduleService } from '../../core/services/schedule.service';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { NoteService, NoteTableItem } from '../../core/services/note.service';
import { Hymn } from '../../core/models/hymn';

export interface HomeNoteDisplayItem extends NoteTableItem {
  isDefaultHymnNote: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HymnItemComponent, CalendarComponent],
  templateUrl: './home.page.html',
})
export class HomePageComponent {
  private readonly scheduleService = inject(ScheduleService);
  private readonly noteService = inject(NoteService);
  protected readonly playerService = inject(HymnPlayerService);

  /** Reactive signal returning sequential main hymn + 3 suggestions for the selected date on calendar */
  readonly scheduledHymns = this.scheduleService.selectedDayHymns;

  /**
   * Active hymn displayed in the top Music Player Box:
   * Priority:
   * 1. Currently playing hymn
   * 2. First hymn in the scheduled hymns list (Sequential Daily Hymn)
   */
  readonly activePlayerHymn = computed<Hymn | null>(() => {
    return this.playerService.currentPlaying() ?? (this.scheduledHymns()[0] ?? null);
  });

  /**
   * Notes for the selected calendar date:
   * 1. Notes for the Default Daily Hymn (scheduledHymns[0]) come first and are highlighted.
   * 2. Followed by notes for other hymns recorded on the same date.
   */
  readonly homeBriefNotes = computed<HomeNoteDisplayItem[]>(() => {
    const selectedDate = this.scheduleService.selectedDate();
    const scheduled = this.scheduledHymns();
    const defaultHymnNum = scheduled.length > 0 ? String(scheduled[0].number) : null;
    const allNotes = this.noteService.allNotesItems();

    // Filter all notes created for the selected date
    const dayNotes = allNotes.filter((n) => n.date === selectedDate);

    // 1. Notes for default daily hymn (prioritized & marked)
    const defaultHymnNotes: HomeNoteDisplayItem[] = dayNotes
      .filter((n) => defaultHymnNum && String(n.hymnNumber) === defaultHymnNum)
      .map((n) => ({ ...n, isDefaultHymnNote: true }));

    // 2. Notes for other hymns on the same date
    const otherHymnNotes: HomeNoteDisplayItem[] = dayNotes
      .filter((n) => !defaultHymnNum || String(n.hymnNumber) !== defaultHymnNum)
      .map((n) => ({ ...n, isDefaultHymnNote: false }));

    return [...defaultHymnNotes, ...otherHymnNotes];
  });
}

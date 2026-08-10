import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { CalendarComponent } from '../../shared/components/calendar/calendar';
import { ScheduleService } from '../../core/services/schedule.service';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { NoteService, NoteTableItem } from '../../core/services/note.service';
import { Hymn } from '../../core/models/hymn';

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
   * Brief notes for Home page display:
   * Priorities notes matching the currently playing hymn, fallback to latest notes overall
   */
  readonly homeBriefNotes = computed<NoteTableItem[]>(() => {
    const currentPlaying = this.playerService.currentPlaying();
    const allNotes = this.noteService.allNotesItems();

    if (currentPlaying) {
      const playingHymnNotes = allNotes.filter(
        (n) => String(n.hymnNumber) === String(currentPlaying.number)
      );
      if (playingHymnNotes.length > 0) {
        return playingHymnNotes.slice(0, 4);
      }
    }

    // Fallback: take latest 4 notes overall
    return allNotes.slice(0, 4);
  });
}

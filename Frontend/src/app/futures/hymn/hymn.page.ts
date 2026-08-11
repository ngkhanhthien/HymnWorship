import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { HymnDataService } from '../../core/services/hymn-data.service';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { Hymn, ScriptureRef } from '../../core/models/hymn';
import { NoteTopic, Note } from '../../core/models/note';
import { NoteService } from '../../core/services/note.service';
import { formatDateKey } from '../../core/utils/random.util';

@Component({
  selector: 'app-hymn',
  standalone: true,
  imports: [RouterModule, FormsModule, HymnItemComponent],
  templateUrl: './hymn.page.html',
  styleUrl: './hymn.page.css',
})
export class HymnPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly playerService = inject(HymnPlayerService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly noteService = inject(NoteService);
  private readonly hymnDataService = inject(HymnDataService);

  /** All hymns signal for looking up rich metadata (scriptures, audio, sheet music) */
  readonly allHymns = toSignal(this.hymnDataService.getHymns());

  /** Active Tab signal ('pdf' or 'lyrics'), default is 'pdf' */
  readonly activeTab = signal<'pdf' | 'lyrics'>('pdf');

  /** Track image load error state */
  readonly imageError = signal<boolean>(false);

  /** Topic selection signal for note creation */
  readonly selectedTopic = signal<NoteTopic>(NoteTopic.MIT);

  /** Content input signal for new note */
  readonly noteContent = signal<string>('');

  /** Allowed topic enum values array */
  readonly topics = [NoteTopic.MIT, NoteTopic.Promptings, NoteTopic.Gratitude];

  private readonly queryHymn = toSignal<Hymn | null>(
    this.route.queryParamMap.pipe(
      map((p: ParamMap): Hymn | null => {
        const number = p.get('number');
        const title = p.get('title');
        return number && title ? { number, title } : null;
      })
    ),
    { initialValue: null }
  );

  /** Computed fallback: first hymn in today's schedule suggestion list */
  private readonly defaultTodayHymn = computed<Hymn>(() => {
    const plan = this.scheduleService.currentPlan();
    const todayStr = formatDateKey(new Date());
    if (plan && plan.days) {
      const todayDay = plan.days.find((d) => d.date === todayStr);
      if (todayDay && todayDay.hymns && todayDay.hymns.length > 0) {
        return todayDay.hymns[0];
      }
    }
    // Ultimate fallback if schedule plan is not yet loaded
    return { number: '1', title: 'The Morning Breaks' };
  });

  /**
   * Priority:
   * 1. Hymn clicked from query params
   * 2. Currently playing hymn
   * 3. First hymn in today's suggestion list (default)
   */
  readonly displayHymn = computed<Hymn>((): Hymn => {
    const rawHymn =
      this.queryHymn() ??
      this.playerService.currentPlaying() ??
      this.defaultTodayHymn();

    const hymnsList = (this.allHymns() ?? []) as Hymn[];
    const fullHymn = hymnsList.find(
      (h: Hymn) => String(h.number) === String(rawHymn.number)
    );

    return fullHymn ? { ...rawHymn, ...fullHymn } : rawHymn;
  });

  /** Computed list of scriptures related to the current hymn */
  readonly currentScriptures = computed<ScriptureRef[]>(() => {
    return this.displayHymn().scriptures ?? [];
  });

  /** Computed URL for sheet music PNG image */
  readonly sheetMusicUrl = computed<string>(
    () => `/assets/hymns/sheet_music/${this.displayHymn().number}.png`
  );

  /** Computed list of notes attached to currently displayed hymn */
  readonly currentNotes = computed<Note[]>(() => {
    const hymnNum = this.displayHymn().number;
    const days = this.noteService.daysSignal();
    const todayStr = formatDateKey(new Date());
    const day = days.find(
      (d) => String(d.hymnNumber) === String(hymnNum) && d.date === todayStr
    );
    return day && Array.isArray(day.notes) ? day.notes : [];
  });

  selectTab(tab: 'pdf' | 'lyrics'): void {
    this.activeTab.set(tab);
    this.imageError.set(false);
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  onAddNote(): void {
    const content = this.noteContent().trim();
    if (!content) return;

    this.noteService.addNote(
      this.displayHymn().number,
      this.selectedTopic(),
      content
    );

    this.noteContent.set('');
  }

  onDeleteNote(noteId: string): void {
    this.noteService.deleteNote(noteId);
  }
}

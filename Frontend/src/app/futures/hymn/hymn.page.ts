import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, ParamMap, RouterModule, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HymnDataService } from '../../core/services/hymn-data.service';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { Hymn, ScriptureRef } from '../../core/models/hymn';
import { NoteTopic, Note } from '../../core/models/note';
import { NoteService } from '../../core/services/note.service';
import { formatDateKey } from '../../core/utils/random.util';

@Component({
  selector: 'app-hymn',
  standalone: true,
  imports: [RouterModule, FormsModule, HymnItemComponent, ConfirmModalComponent],
  templateUrl: './hymn.page.html',
  styleUrl: './hymn.page.css',
})
export class HymnPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  protected readonly playerService = inject(HymnPlayerService);
  private readonly noteService = inject(NoteService);
  private readonly hymnDataService = inject(HymnDataService);

  goToNoteDetail(noteId: string): void {
    if (!noteId) return;
    this.router.navigate(['/notes'], { queryParams: { highlight: noteId } });
  }

  /** Track note ID pending deletion confirmation */
  readonly noteIdToDelete = signal<string | null>(null);

  /** Sequential main hymn + 3 suggestions for selected date */
  readonly selectedDayHymns = this.scheduleService.selectedDayHymns;

  /** All hymns signal for looking up rich metadata (scriptures, audio, sheet music) */
  readonly allHymns = toSignal(this.hymnDataService.getHymns());

  /** Active Tab signal ('pdf' or 'lyrics'), default is 'pdf' */
  readonly activeTab = signal<'pdf' | 'lyrics'>('pdf');

  /** Currently selected scripture for right-side drawer view */
  readonly selectedScripture = signal<ScriptureRef | null>(null);

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
        return number ? { number, title: title || '' } : null;
      })
    ),
    { initialValue: null }
  );

  /** Computed fallback: first hymn in today's schedule suggestion list */
  private readonly defaultTodayHymn = computed<Hymn>(() => {
    const plan = this.scheduleService.currentPlan();
    const today = new Date();
    const todayStr = formatDateKey(today);
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (plan && plan.days) {
      const todayDay = plan.days.find((d) => d.date === todayStr || d.monthDay === todayMonthDay);
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

    const fastHymn = this.hymnDataService.getHymnFast(rawHymn.number);
    const hymnsList = (this.allHymns() ?? []) as Hymn[];
    const fullHymn =
      fastHymn ??
      hymnsList.find(
        (h: Hymn) =>
          String(h.number) === String(rawHymn.number) ||
          String(h.id) === String(rawHymn.number)
      );

    if (!fullHymn) return rawHymn;

    const scriptures =
      fullHymn.scriptures && fullHymn.scriptures.length > 0
        ? fullHymn.scriptures
        : rawHymn.scriptures ?? [];

    return { ...rawHymn, ...fullHymn, scriptures };
  });

  /** Computed list of scriptures related to the current hymn */
  readonly currentScriptures = computed<ScriptureRef[]>(() => {
    return this.displayHymn().scriptures ?? [];
  });

  /** In-memory HTMLImageElement cache for zero-latency sheet music re-opening */
  private readonly sheetMusicImageCache = new Map<string, HTMLImageElement>();

  /** Computed URL for sheet music PNG image with automatic browser/memory pre-caching */
  readonly sheetMusicUrl = computed<string>(() => {
    const hymn = this.displayHymn();
    const hymnId = hymn.number || hymn.id || '1';

    let targetUrl = `https://storage.googleapis.com/qthymns1.firebasestorage.app/sheet_music/${hymnId}.png`;

    if (hymn.sheet_music_urls && hymn.sheet_music_urls.length > 0 && hymn.sheet_music_urls[0].startsWith('http')) {
      targetUrl = hymn.sheet_music_urls[0];
    } else if (hymn.sheet_music && hymn.sheet_music.length > 0 && hymn.sheet_music[0].startsWith('http')) {
      targetUrl = hymn.sheet_music[0];
    }

    // Preload image & audio in memory cache for instant rendering & 0 network calls when playing
    this.preloadSheetMusicImage(targetUrl);
    this.playerService.preloadAudio(hymn);
    return targetUrl;
  });

  private preloadSheetMusicImage(url: string): void {
    if (typeof Image === 'undefined' || !url || this.sheetMusicImageCache.has(url)) return;
    const img = new Image();
    img.src = url;
    this.sheetMusicImageCache.set(url, img);
  }

  /** Computed list of notes attached to currently displayed hymn (newest first) */
  readonly currentNotes = computed<Note[]>(() => {
    const hymn = this.displayHymn();
    const hymnNum = hymn?.number ?? hymn?.id;
    if (hymnNum === undefined || hymnNum === null) return [];

    const days = this.noteService.daysSignal();
    if (!Array.isArray(days)) return [];

    const targetHymnStr = String(hymnNum);

    // Aggregate notes from all day records matching this hymn number
    const matchingDays = days.filter(
      (d) => d && d.hymnNumber !== undefined && String(d.hymnNumber) === targetHymnStr
    );

    const allNotes: Note[] = [];
    for (const day of matchingDays) {
      if (Array.isArray(day.notes)) {
        allNotes.push(...day.notes);
      }
    }

    // Sort newest notes first
    return allNotes.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  });

  selectTab(tab: 'pdf' | 'lyrics'): void {
    this.activeTab.set(tab);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      const hymnId = this.displayHymn().number || this.displayHymn().id || '1';
      const remoteUrl = `https://storage.googleapis.com/qthymns1.firebasestorage.app/sheet_music/${hymnId}.png`;
      if (!img.src.includes(remoteUrl)) {
        img.src = remoteUrl;
      }
    }
  }

  /** Track note creation loading state */
  readonly isSubmittingNote = signal<boolean>(false);

  /** Track note deletion loading state */
  readonly isDeletingNote = signal<boolean>(false);

  onNoteKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onAddNote();
    }
  }

  async onAddNote(): Promise<void> {
    const content = this.noteContent().trim();
    if (!content || this.isSubmittingNote()) return;

    const hymn = this.displayHymn();
    const hymnNum = hymn?.number ?? hymn?.id ?? 0;

    this.isSubmittingNote.set(true);
    try {
      await this.noteService.addNote(
        hymnNum,
        this.selectedTopic(),
        content
      );
      this.noteContent.set('');
    } finally {
      this.isSubmittingNote.set(false);
    }
  }

  onDeleteNote(noteId: string): void {
    if (this.isDeletingNote()) return;
    this.noteIdToDelete.set(noteId);
  }

  async confirmDeleteNote(): Promise<void> {
    const id = this.noteIdToDelete();
    if (id && !this.isDeletingNote()) {
      this.isDeletingNote.set(true);
      try {
        await this.noteService.deleteNote(id);
      } finally {
        this.isDeletingNote.set(false);
        this.noteIdToDelete.set(null);
      }
    }
  }

  cancelDeleteNote(): void {
    this.noteIdToDelete.set(null);
  }

  selectScripture(scripture: ScriptureRef): void {
    this.selectedScripture.set(scripture);
  }

  closeScriptureModal(): void {
    this.selectedScripture.set(null);
  }

  openScriptureUrl(url?: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}

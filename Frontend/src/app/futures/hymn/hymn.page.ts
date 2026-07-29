import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { Hymn } from '../../core/models/hymn';

@Component({
  selector: 'app-hymn',
  standalone: true,
  imports: [RouterModule, HymnItemComponent],
  templateUrl: './hymn.page.html',
  styleUrl: './hymn.page.css',
})
export class HymnPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly playerService = inject(HymnPlayerService);

  /** Active Tab signal ('pdf' or 'lyrics'), default is 'pdf' */
  readonly activeTab = signal<'pdf' | 'lyrics'>('pdf');

  /** Track image load error state */
  readonly imageError = signal<boolean>(false);

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

  /**
   * Priority:
   * 1. Hymn clicked from query params
   * 2. Currently playing hymn
   * 3. Fallback default hymn (#1 The Morning Breaks)
   */
  readonly displayHymn = computed<Hymn>(
    (): Hymn =>
      this.queryHymn() ??
      this.playerService.currentPlaying() ?? {
        number: '1',
        title: 'The Morning Breaks',
      }
  );

  /** Computed URL for sheet music PNG image */
  readonly sheetMusicUrl = computed<string>(
    () => `/assets/hymns/sheet_music/${this.displayHymn().number}.png`
  );

  selectTab(tab: 'pdf' | 'lyrics'): void {
    this.activeTab.set(tab);
    this.imageError.set(false);
  }

  onImageError(): void {
    this.imageError.set(true);
  }
}

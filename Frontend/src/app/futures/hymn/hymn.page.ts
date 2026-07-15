import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { HymnPlayerService } from '../../shared/services/hymn-player.service';
import { TODAY_HYMNS } from '../../core/services/hymn.service';
import { Hymn } from '../../core/models/hymn';

@Component({
  selector: 'app-hymn',
  standalone: true,
  imports: [],
  templateUrl: './hymn.page.html',
  styleUrl: './hymn.page.css',
})
export class HymnPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly playerService = inject(HymnPlayerService);

  private readonly queryHymn = toSignal(
    this.route.queryParamMap.pipe(
      map((p): Hymn | null => {
        const number = p.get('number');
        const title = p.get('title');
        return number && title ? { number, title } : null;
      })
    ),
    { initialValue: null }
  );

  /**
   * Priority:
   * 1. Hymn clicked (query params)
   * 2. Currently playing hymn
   * 3. First hymn in today's list
   */
  readonly displayHymn = computed<Hymn>(
    () =>
      this.queryHymn() ??
      this.playerService.currentPlaying() ??
      TODAY_HYMNS[0]
  );
}

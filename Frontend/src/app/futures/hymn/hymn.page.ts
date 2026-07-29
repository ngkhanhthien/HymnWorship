import { Component, computed, inject } from '@angular/core';
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
}

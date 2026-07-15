import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-hymn',
  standalone: true,
  imports: [],
  templateUrl: './hymn.page.html',
  styleUrl: './hymn.page.css',
})
export class HymnPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly hymnTitle = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('title') ?? '')),
    { initialValue: '' }
  );

  readonly hymnNumber = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('number') ?? '')),
    { initialValue: '' }
  );
}

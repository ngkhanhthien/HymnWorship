import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HymnPlayerService {
  /** The number/id of the currently playing hymn, or null if none is playing */
  readonly currentPlayingId = signal<string | null>(null);

  play(id: string): void {
    this.currentPlayingId.set(id);
  }

  stop(): void {
    this.currentPlayingId.set(null);
  }
}

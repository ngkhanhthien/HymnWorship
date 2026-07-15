import { Injectable, signal, computed } from '@angular/core';
import { Hymn } from '../../core/models/hymn';

@Injectable({ providedIn: 'root' })
export class HymnPlayerService {
  /** The currently playing hymn, or null if none */
  readonly currentPlaying = signal<Hymn | null>(null);

  /** Derived: the id of the currently playing hymn (for backward compat) */
  readonly currentPlayingId = computed(() => this.currentPlaying()?.number ?? null);

  play(hymn: Hymn): void {
    this.currentPlaying.set(hymn);
  }

  stop(): void {
    this.currentPlaying.set(null);
  }
}

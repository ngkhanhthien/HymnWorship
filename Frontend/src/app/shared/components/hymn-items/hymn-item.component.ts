import { Component, computed, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { HymnPlayerService } from '../../services/hymn-player.service';
import { Hymn } from '../../../core/models/hymn';

@Component({
  selector: 'app-hymn-item',
  standalone: true,
  imports: [],
  templateUrl: './hymn-item.component.html',
  styleUrl: './hymn-item.component.css',
})
export class HymnItemComponent {
  @Input() number = '';
  @Input() title = '';
  @Input() isFeatured = false; // When true, highlights this hymn as the primary daily sequential hymn
  @Input() playlist: Hymn[] = [];

  protected readonly playerService = inject(HymnPlayerService);
  private readonly router = inject(Router);

  /** True when this specific hymn is loaded as active playing hymn */
  readonly isCurrentHymn = computed(
    () => this.playerService.currentPlayingId() === this.number
  );

  /** True when audio is actively playing for this hymn */
  readonly isPlaying = computed(
    () => this.isCurrentHymn() && this.playerService.isAudioPlaying()
  );

  togglePlay(): void {
    this.playerService.toggle(
      { number: this.number, title: this.title },
      this.playlist
    );
  }

  onSeek(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.playerService.seekTo(Number(input.value));
    }
  }

  navigateToHymn(): void {
    this.router.navigate(['/hymn'], {
      queryParams: { number: this.number, title: this.title },
    });
  }
}

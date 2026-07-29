import { Component, computed, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { HymnPlayerService } from '../../services/hymn-player.service';

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

  private readonly playerService = inject(HymnPlayerService);
  private readonly router = inject(Router);

  /** True when this item is currently playing audio */
  readonly isPlaying = computed(
    () =>
      this.playerService.currentPlayingId() === this.number &&
      this.playerService.isAudioPlaying()
  );

  togglePlay(): void {
    this.playerService.toggle({ number: this.number, title: this.title });
  }

  navigateToHymn(): void {
    this.router.navigate(['/hymn'], {
      queryParams: { number: this.number, title: this.title },
    });
  }
}

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

  /** True when this item is the one currently playing */
  readonly isPlaying = computed(
    () => this.playerService.currentPlayingId() === this.number
  );

  togglePlay(): void {
    if (this.isPlaying()) {
      this.playerService.stop();
    } else {
      this.playerService.play({ number: this.number, title: this.title });
    }
  }

  navigateToHymn(): void {
    this.router.navigate(['/hymn'], {
      queryParams: { number: this.number, title: this.title },
    });
  }
}


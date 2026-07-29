import { Injectable, signal, computed } from '@angular/core';
import { Hymn } from '../../core/models/hymn';

@Injectable({ providedIn: 'root' })
export class HymnPlayerService {
  private audio: HTMLAudioElement | null = null;

  /** The currently playing hymn object, or null if none */
  readonly currentPlaying = signal<Hymn | null>(null);

  /** Playback status: true when audio is actively playing */
  readonly isAudioPlaying = signal<boolean>(false);

  /** Derived: the number/id of the currently playing hymn */
  readonly currentPlayingId = computed(() => this.currentPlaying()?.number ?? null);

  play(hymn: Hymn): void {
    const current = this.currentPlaying();

    // If clicking the same hymn while paused, resume playback
    if (current && current.number === hymn.number && this.audio) {
      if (this.audio.paused) {
        this.audio.play().catch((err) => console.warn('Audio play error:', err));
      }
      return;
    }

    // Stop and cleanup existing audio
    this.stopAudio();

    // Determine audio URL
    let audioUrl = `/assets/hymns/audio/accompaniment/${hymn.number}.mp3`;
    if (hymn.audio_accompaniment) {
      audioUrl = hymn.audio_accompaniment.replace(/^app\/output\//, '/assets/hymns/');
    }

    // Create and configure new Audio instance
    this.audio = new Audio(audioUrl);

    this.audio.onplay = () => this.isAudioPlaying.set(true);
    this.audio.onpause = () => this.isAudioPlaying.set(false);
    this.audio.onended = () => {
      this.isAudioPlaying.set(false);
    };
    this.audio.onerror = (err) => {
      console.warn(`Could not load audio from ${audioUrl}:`, err);
      this.isAudioPlaying.set(false);
    };

    this.currentPlaying.set(hymn);
    this.audio.play().catch((err) => {
      console.warn('Audio play failed:', err);
      this.isAudioPlaying.set(false);
    });
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  toggle(hymn: Hymn): void {
    const current = this.currentPlaying();
    if (current && current.number === hymn.number) {
      if (this.isAudioPlaying()) {
        this.pause();
      } else {
        this.play(hymn);
      }
    } else {
      this.play(hymn);
    }
  }

  stop(): void {
    this.stopAudio();
    this.currentPlaying.set(null);
    this.isAudioPlaying.set(false);
  }

  private stopAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onplay = null;
      this.audio.onpause = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
  }
}

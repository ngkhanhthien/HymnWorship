import { Injectable, signal, computed } from '@angular/core';
import { Hymn } from '../../core/models/hymn';

@Injectable({ providedIn: 'root' })
export class HymnPlayerService {
  private audio: HTMLAudioElement | null = null;

  /** The currently playing hymn object, or null if none */
  readonly currentPlaying = signal<Hymn | null>(null);

  /** Playback status: true when audio is actively playing */
  readonly isAudioPlaying = signal<boolean>(false);

  /** Current playback time in seconds */
  readonly currentTime = signal<number>(0);

  /** Total audio duration in seconds */
  readonly duration = signal<number>(0);

  /** Currently active playlist queue */
  readonly currentPlaylist = signal<Hymn[]>([]);

  /** Selected audio mode: 'accompaniment' or 'vocal' */
  readonly selectedAudioMode = signal<'accompaniment' | 'vocal'>('accompaniment');

  setAudioMode(mode: 'accompaniment' | 'vocal'): void {
    if (this.selectedAudioMode() === mode) return;
    this.selectedAudioMode.set(mode);

    // If audio is currently playing or loaded, restart audio with newly selected track mode
    const current = this.currentPlaying();
    if (current) {
      const wasPlaying = this.isAudioPlaying();
      this.stopAudio();
      this.play(current, this.currentPlaylist());
      if (!wasPlaying) {
        this.pause();
      }
    }
  }

  /** Derived: the number/id of the currently playing hymn */
  readonly currentPlayingId = computed(() => this.currentPlaying()?.number ?? null);

  /** Derived: percentage progress (0 to 100) */
  readonly progressPercent = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  });

  play(hymn: Hymn, playlist?: Hymn[]): void {
    if (playlist && playlist.length > 0) {
      this.currentPlaylist.set(playlist);
    } else if (
      !this.currentPlaylist().some(
        (h) => String(h.number) === String(hymn.number)
      )
    ) {
      this.currentPlaylist.set([]);
    }

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

    // Determine audio URL based on selected audio mode
    let audioUrl = '';
    const mode = this.selectedAudioMode();

    if (mode === 'vocal') {
      if (hymn.audio_vocal_url) {
        audioUrl = hymn.audio_vocal_url;
      } else if (hymn.audio_vocal) {
        audioUrl = hymn.audio_vocal.startsWith('http')
          ? hymn.audio_vocal
          : hymn.audio_vocal.replace(/^app\/output\//, '/assets/hymns/');
      } else {
        audioUrl = `/assets/hymns/audio/vocal/${hymn.number}.mp3`;
      }
    } else {
      if (hymn.audio_accompaniment_url) {
        audioUrl = hymn.audio_accompaniment_url;
      } else if (hymn.audio_accompaniment) {
        audioUrl = hymn.audio_accompaniment.startsWith('http')
          ? hymn.audio_accompaniment
          : hymn.audio_accompaniment.replace(/^app\/output\//, '/assets/hymns/');
      } else {
        audioUrl = `/assets/hymns/audio/accompaniment/${hymn.number}.mp3`;
      }
    }

    // Create and configure new Audio instance
    this.audio = new Audio(audioUrl);

    this.audio.ontimeupdate = () => {
      if (this.audio) {
        this.currentTime.set(this.audio.currentTime);
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          this.duration.set(this.audio.duration);
        }
      }
    };

    this.audio.onloadedmetadata = () => {
      if (this.audio && this.audio.duration && !isNaN(this.audio.duration)) {
        this.duration.set(this.audio.duration);
      }
    };

    this.audio.onplay = () => this.isAudioPlaying.set(true);
    this.audio.onpause = () => this.isAudioPlaying.set(false);
    this.audio.onended = () => {
      this.isAudioPlaying.set(false);
      this.currentTime.set(0);

      // Auto-play next hymn in active playlist if available
      const list = this.currentPlaylist();
      const currentHymn = this.currentPlaying();
      if (list.length > 0 && currentHymn) {
        const idx = list.findIndex(
          (h) => String(h.number) === String(currentHymn.number)
        );
        if (idx >= 0 && idx < list.length - 1) {
          const nextHymn = list[idx + 1];
          this.play(nextHymn, list);
        }
      }
    };
    this.audio.onerror = (err) => {
      console.warn(`Could not load audio from ${audioUrl}:`, err);
      this.isAudioPlaying.set(false);
    };

    this.currentPlaying.set(hymn);
    this.currentTime.set(0);
    this.duration.set(0);

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

  seekTo(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = seconds;
      this.currentTime.set(seconds);
    }
  }

  toggle(hymn: Hymn, playlist?: Hymn[]): void {
    const current = this.currentPlaying();
    if (current && current.number === hymn.number) {
      if (this.isAudioPlaying()) {
        this.pause();
      } else {
        this.play(hymn, playlist);
      }
    } else {
      this.play(hymn, playlist);
    }
  }

  stop(): void {
    this.stopAudio();
    this.currentPlaying.set(null);
    this.isAudioPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private stopAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.ontimeupdate = null;
      this.audio.onloadedmetadata = null;
      this.audio.onplay = null;
      this.audio.onpause = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
  }
}

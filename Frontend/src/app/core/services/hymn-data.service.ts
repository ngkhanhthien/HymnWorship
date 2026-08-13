import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { Hymn } from '../models/hymn';
import { SettingsService } from './settings.service';

const FIREBASE_HYMNS_URL =
  'https://firebasestorage.googleapis.com/v0/b/qthymns1.firebasestorage.app/o/data%2Fhymns.json?alt=media';

@Injectable({
  providedIn: 'root',
})
export class HymnDataService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);
  private cachedLocalHymns$: Observable<Hymn[]> | null = null;
  private cachedFirebaseHymns$: Observable<Hymn[]> | null = null;

  /**
   * Unified data fetcher respecting SettingsService.dataSource() mode.
   * Default mode is 'firebase'.
   */
  getHymns(): Observable<Hymn[]> {
    const mode = this.settingsService.dataSource();

    if (mode === 'local') {
      if (!this.cachedLocalHymns$) {
        this.cachedLocalHymns$ = this.fetchLocalHymns().pipe(shareReplay(1));
      }
      return this.cachedLocalHymns$;
    }

    // Default mode: Firebase
    if (!this.cachedFirebaseHymns$) {
      this.cachedFirebaseHymns$ = this.fetchFirebaseHymns().pipe(shareReplay(1));
    }
    return this.cachedFirebaseHymns$;
  }

  private mapRawItemToHymn(item: any): Hymn {
    const sheets =
      item.sheet_music_urls && item.sheet_music_urls.length > 0
        ? item.sheet_music_urls
        : item.sheet_music || [];

    return {
      number: String(item.id || item.number || '0'),
      title: String(item.title || ''),
      id: item.id ? String(item.id) : undefined,
      url: item.url,
      collection: item.collection,
      collection_name: item.collection_name,
      scriptures: item.scriptures || [],
      sheet_music: sheets,
      sheet_music_urls: item.sheet_music_urls || [],
      audio_accompaniment: item.audio_accompaniment_url || item.audio_accompaniment || undefined,
      audio_accompaniment_url: item.audio_accompaniment_url || undefined,
      audio_vocal: item.audio_vocal_url || item.audio_vocal || undefined,
      audio_vocal_url: item.audio_vocal_url || undefined,
    };
  }

  private fetchFirebaseHymns(): Observable<Hymn[]> {
    return this.http.get<any[]>(FIREBASE_HYMNS_URL).pipe(
      map((items: any[]): Hymn[] => items.map((item) => this.mapRawItemToHymn(item))),
      catchError((error) => {
        console.warn('Could not fetch hymns from Firebase Cloud Storage, falling back to local assets:', error);
        return this.fetchLocalHymns();
      })
    );
  }

  private fetchLocalHymns(): Observable<Hymn[]> {
    return this.http.get<any[]>('/assets/hymns/hymns.json').pipe(
      map((items: any[]): Hymn[] => items.map((item) => this.mapRawItemToHymn(item))),
      catchError((error) => {
        console.error('Error fetching local hymns.json:', error);
        return of([]);
      })
    );
  }
}

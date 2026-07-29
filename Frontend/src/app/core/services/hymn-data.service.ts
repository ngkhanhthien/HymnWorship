import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { Hymn } from '../models/hymn';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class HymnDataService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);

  /**
   * Unified data fetcher respecting SettingsService.dataSource() mode.
   * Returns an Observable of Hymn array.
   */
  getHymns(): Observable<Hymn[]> {
    const mode = this.settingsService.dataSource();

    if (mode === 'local') {
      return this.fetchLocalHymns();
    }

    // Firebase mode placeholder (returns empty array until Firebase SDK is connected)
    return of([]);
  }

  private fetchLocalHymns(): Observable<Hymn[]> {
    return this.http.get<any[]>('/assets/hymns/hymns.json').pipe(
      map((items: any[]): Hymn[] =>
        items.map((item: any): Hymn => ({
          number: String(item.id || item.number || '0'),
          title: String(item.title || ''),
          id: item.id ? String(item.id) : undefined,
          url: item.url,
          scriptures: item.scriptures || [],
          sheet_music: item.sheet_music || [],
          audio_accompaniment: item.audio_accompaniment || undefined,
        }))
      ),
      catchError((error) => {
        console.error('Error fetching local hymns.json:', error);
        return of([]);
      })
    );
  }
}

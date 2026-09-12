import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay, tap } from 'rxjs';
import { Hymn } from '../models/hymn';

const FIREBASE_HYMNS_URL =
  'https://storage.googleapis.com/qthymns1.firebasestorage.app/data/hymns.json';

const CACHE_KEY = 'hymn_worship_cached_hymns_v1';

@Injectable({
  providedIn: 'root',
})
export class HymnDataService {
  private readonly http = inject(HttpClient);

  /** In-memory Map cache for O(1) hymn lookup by number or ID */
  private readonly hymnCacheMap = new Map<string, Hymn>();

  /** In-memory Map cache for search queries */
  private readonly searchCacheMap = new Map<string, Hymn[]>();

  /** Shared Replay Observable stream for hymns list */
  private cachedFirebaseHymns$: Observable<Hymn[]> | null = null;

  constructor() {
    this.initFromLocalStorage();
  }

  /** Initialize in-memory cache from localStorage if available (0ms instant startup) */
  private initFromLocalStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.populateInMemoryCache(parsed);
      }
    } catch (e) {
      // Ignore cache parse errors
    }
  }

  /** Populate in-memory map index for instant lookup */
  private populateInMemoryCache(hymns: Hymn[]): void {
    for (const hymn of hymns) {
      if (hymn.number) {
        this.hymnCacheMap.set(String(hymn.number), hymn);
      }
      if (hymn.id) {
        this.hymnCacheMap.set(String(hymn.id), hymn);
      }
    }
  }

  /** Save fetched hymns to localStorage for offline & instant reload */
  private saveToLocalStorage(hymns: Hymn[]): void {
    try {
      if (typeof localStorage !== 'undefined' && Array.isArray(hymns)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(hymns));
      }
    } catch (e) {
      // Storage quota or disabled
    }
  }

  /**
   * Unified data fetcher with Stale-While-Revalidate caching pattern.
   */
  getHymns(): Observable<Hymn[]> {
    if (!this.cachedFirebaseHymns$) {
      this.cachedFirebaseHymns$ = this.fetchFirebaseHymns().pipe(
        tap((hymns: Hymn[]) => {
          this.populateInMemoryCache(hymns);
          this.saveToLocalStorage(hymns);
        }),
        shareReplay(1)
      );
    }
    return this.cachedFirebaseHymns$;
  }

  /** Fast synchronous lookup of a hymn from in-memory cache */
  getHymnFast(numberOrId: string | number): Hymn | null {
    if (!numberOrId) return null;
    return this.hymnCacheMap.get(String(numberOrId)) ?? null;
  }

  /** Fast cached search query execution */
  searchHymns(query: string, allHymns: Hymn[]): Hymn[] {
    const trimmed = (query || '').trim().toLowerCase();
    if (!trimmed) return allHymns;

    if (this.searchCacheMap.has(trimmed)) {
      return this.searchCacheMap.get(trimmed)!;
    }

    const filtered = allHymns.filter((h) => {
      const numMatch = String(h.number).toLowerCase().includes(trimmed);
      const titleMatch = String(h.title).toLowerCase().includes(trimmed);
      return numMatch || titleMatch;
    });

    this.searchCacheMap.set(trimmed, filtered);
    return filtered;
  }

  /** Clear search cache when needed */
  clearSearchCache(): void {
    this.searchCacheMap.clear();
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
      map((items: any[]): Hymn[] => items.map((item: any) => this.mapRawItemToHymn(item))),
      catchError((error: any) => {
        console.warn('Could not fetch hymns from Firebase Cloud Storage, falling back to local assets:', error);
        return this.fetchLocalHymns();
      })
    );
  }

  private fetchLocalHymns(): Observable<Hymn[]> {
    return this.http.get<any[]>('/assets/data/hymns.json').pipe(
      catchError(() => this.http.get<any[]>('/assets/hymns/hymns.json')),
      map((items: any[]): Hymn[] => (Array.isArray(items) ? items.map((item: any) => this.mapRawItemToHymn(item)) : [])),
      catchError((error: any) => {
        console.error('Error fetching local hymns.json:', error);
        return of([]);
      })
    );
  }
}

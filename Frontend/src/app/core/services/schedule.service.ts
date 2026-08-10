import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, of } from 'rxjs';
import { Hymn } from '../models/hymn';
import { TenDayPlan, DaySchedule } from '../models/schedule';
import { HymnDataService } from './hymn-data.service';
import { getRandomItems, formatDateKey, getDayOfYear } from '../utils/random.util';

const STORAGE_KEY = 'hymnworship_10day_plan_v2';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly hymnDataService = inject(HymnDataService);

  /** Currently loaded 10-day schedule plan signal */
  readonly currentPlan = signal<TenDayPlan | null>(this.loadFromStorage());

  /** Selected date key ('YYYY-MM-DD'), default is Today */
  readonly selectedDate = signal<string>(formatDateKey(new Date()));

  /** Reactive computed signal returning hymns for the selected date (Sequential Main Hymn + 3 Suggestions) */
  readonly selectedDayHymns = computed<Hymn[]>(() => {
    const plan = this.currentPlan();
    if (!plan || !plan.days || plan.days.length === 0) {
      return [];
    }

    const dateKey = this.selectedDate();
    const targetDay = plan.days.find((d) => d.date === dateKey);

    return targetDay ? targetDay.hymns : [];
  });

  /** Update currently selected date */
  setSelectedDate(date: string): void {
    this.selectedDate.set(date);
  }

  /**
   * Generates a fresh 10-day schedule plan:
   * - Each day has 1 sequential main hymn (day 1 is hymn 1, day 2 is hymn 2, etc. wrapping after 423 hymns)
   * - Followed by 3 additional random suggestion hymns.
   */
  generate10DayPlan(): Observable<TenDayPlan> {
    return this.hymnDataService.getHymns().pipe(
      map((allHymns: Hymn[]): TenDayPlan => {
        // Sort hymns by numeric ID (1..341, 1001..1210)
        const sortedHymns = [...allHymns].sort((a, b) => {
          const numA = Number(a.id || a.number || 0);
          const numB = Number(b.id || b.number || 0);
          return numA - numB;
        });

        const today = new Date();
        const days: DaySchedule[] = [];

        for (let i = 0; i < 10; i++) {
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + i);

          const dateString = formatDateKey(nextDate);
          const dayOfYear = getDayOfYear(nextDate);

          // Sequential index based on day of year (0-indexed)
          const sequentialIndex = (dayOfYear - 1) % sortedHymns.length;
          const mainHymn = sortedHymns[sequentialIndex];

          // 3 additional suggestions excluding the main hymn
          const remainingHymns = sortedHymns.filter(
            (h) => (h.id || h.number) !== (mainHymn.id || mainHymn.number)
          );
          const suggestions = getRandomItems<Hymn>(remainingHymns, 3);

          days.push({
            date: dateString,
            hymns: [mainHymn, ...suggestions],
          });
        }

        return {
          generatedAt: new Date().toISOString(),
          days,
        };
      }),
      tap((newPlan: TenDayPlan) => {
        this.saveToStorage(newPlan);
        this.currentPlan.set(newPlan);
        this.selectedDate.set(formatDateKey(new Date()));
      })
    );
  }

  /**
   * Checks if valid plan exists in localStorage. If missing or expired,
   * automatically generates and saves a new sequential 10-day plan.
   */
  checkAndAutoSchedule(): Observable<TenDayPlan> {
    const existingPlan = this.loadFromStorage();
    const todayStr = formatDateKey(new Date());

    if (existingPlan && existingPlan.days && existingPlan.days.length >= 10) {
      const hasToday = existingPlan.days.some((d) => d.date === todayStr);
      if (hasToday) {
        this.currentPlan.set(existingPlan);
        return of(existingPlan);
      }
    }

    // Auto-generate sequential 10-day plan if missing or expired
    return this.generate10DayPlan();
  }

  private loadFromStorage(): TenDayPlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TenDayPlan) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(plan: TenDayPlan): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {
      console.error('Error saving schedule plan to localStorage:', e);
    }
  }
}

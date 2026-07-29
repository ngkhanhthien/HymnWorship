import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, of } from 'rxjs';
import { Hymn } from '../models/hymn';
import { TenDayPlan, DaySchedule } from '../models/schedule';
import { HymnDataService } from './hymn-data.service';
import { getRandomItems, formatDateKey } from '../utils/random.util';

const STORAGE_KEY = 'hymnworship_10day_plan';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly hymnDataService = inject(HymnDataService);

  /** Currently loaded 10-day schedule plan signal */
  readonly currentPlan = signal<TenDayPlan | null>(this.loadFromStorage());

  /** Selected date key ('YYYY-MM-DD'), default is Today */
  readonly selectedDate = signal<string>(formatDateKey(new Date()));

  /** Reactive computed signal returning 3 hymns for the selected date */
  readonly selectedDayHymns = computed<Hymn[]>(() => {
    const plan = this.currentPlan();
    if (!plan || !plan.days || plan.days.length === 0) {
      return [];
    }

    const dateKey = this.selectedDate();
    const targetDay = plan.days.find((d) => d.date === dateKey);

    return targetDay ? targetDay.hymns : plan.days[0].hymns;
  });

  /** Update currently selected date */
  setSelectedDate(date: string): void {
    this.selectedDate.set(date);
  }

  /**
   * Generates a fresh 10-day schedule plan (3 hymns/day for 10 days starting from Today).
   * Persists the plan to localStorage and updates Signals.
   */
  generate10DayPlan(): Observable<TenDayPlan> {
    return this.hymnDataService.getHymns().pipe(
      map((allHymns: Hymn[]): TenDayPlan => {
        const today = new Date();
        const days: DaySchedule[] = [];

        for (let i = 0; i < 10; i++) {
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + i);

          const dateString = formatDateKey(nextDate);
          const dailyHymns = getRandomItems<Hymn>(allHymns, 3);

          days.push({
            date: dateString,
            hymns: dailyHymns,
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
   * Checks if valid plan exists in localStorage. If missing or expired (> 10 days),
   * automatically generates and saves a new 10-day plan.
   */
  checkAndAutoSchedule(): Observable<TenDayPlan> {
    const existingPlan = this.loadFromStorage();
    const todayStr = formatDateKey(new Date());

    if (existingPlan && existingPlan.days && existingPlan.days.length >= 10) {
      // Check if plan includes today's date
      const hasToday = existingPlan.days.some((d) => d.date === todayStr);
      if (hasToday) {
        this.currentPlan.set(existingPlan);
        return of(existingPlan);
      }
    }

    // Auto-generate new 10-day plan if missing or expired
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

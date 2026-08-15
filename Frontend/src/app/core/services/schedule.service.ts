import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { Hymn } from '../models/hymn';
import { YearlySchedulePlan, DaySchedule } from '../models/schedule';
import { formatDateKey, getDayOfYear } from '../utils/random.util';

const STORAGE_KEY = 'hymnworship_yearly_schedule_v1';
const ASSETS_PATH = 'assets/data/yearly-schedule.json';
const FALLBACK_ASSETS_PATH = 'assets/hymns/yearly-schedule.json';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly http = inject(HttpClient);

  /** Currently loaded full 366-day schedule plan */
  readonly currentPlan = signal<YearlySchedulePlan | null>(this.loadFromStorage());

  /** Selected date key ('YYYY-MM-DD'), default is Today */
  readonly selectedDate = signal<string>(formatDateKey(new Date()));

  /** Reactive computed signal returning hymns for the selected date (1 Default Hymn + 3 Suggestions) */
  readonly selectedDayHymns = computed<Hymn[]>(() => {
    const plan = this.currentPlan();
    const dateKey = this.selectedDate();
    const targetDate = new Date(dateKey + 'T00:00:00');
    const dayOfYear = getDayOfYear(isNaN(targetDate.getTime()) ? new Date() : targetDate);
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const monthDayKey = `${month}-${day}`;

    if (plan && plan.days && plan.days.length > 0) {
      const match = plan.days.find(
        (d) =>
          d.dayOfYear === dayOfYear ||
          d.monthDay === monthDayKey ||
          d.date === dateKey
      );
      if (match && match.hymns && match.hymns.length > 0) {
        return match.hymns;
      }
    }

    // Fallback if schedule is still loading
    const defaultHymnNum = String(((dayOfYear - 1) % 423) + 1);
    return [{ id: defaultHymnNum, number: defaultHymnNum, title: `Hymn #${defaultHymnNum}` }];
  });

  /** Update currently selected date */
  setSelectedDate(date: string): void {
    this.selectedDate.set(date);
  }

  /**
   * Load the 366-day persistent yearly schedule:
   * 1. Checks localStorage for instant offline access
   * 2. Fetches static JSON from assets/data/yearly-schedule.json
   * 3. Saves to localStorage and updates reactive signal
   */
  loadYearlySchedule(): Observable<YearlySchedulePlan> {
    const cached = this.loadFromStorage();
    if (cached && cached.days && cached.days.length >= 365) {
      this.currentPlan.set(cached);
      return of(cached);
    }

    return this.http.get<YearlySchedulePlan>(ASSETS_PATH).pipe(
      catchError(() => this.http.get<YearlySchedulePlan>(FALLBACK_ASSETS_PATH)),
      tap((plan: YearlySchedulePlan) => {
        if (plan && plan.days) {
          this.saveToStorage(plan);
          this.currentPlan.set(plan);
        }
      })
    );
  }

  /**
   * Startup hook: Ensures the 366-day schedule is loaded into memory on application launch.
   */
  checkAndAutoSchedule(): Observable<YearlySchedulePlan> {
    return this.loadYearlySchedule();
  }

  /** Backward-compatibility method */
  generate10DayPlan(): Observable<YearlySchedulePlan> {
    return this.loadYearlySchedule();
  }

  private loadFromStorage(): YearlySchedulePlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as YearlySchedulePlan) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(plan: YearlySchedulePlan): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {
      console.error('Error saving yearly schedule to localStorage:', e);
    }
  }
}

import { Hymn } from './hymn';

export interface DaySchedule {
  dayOfYear?: number; // 1-366
  month?: number; // 1-12
  day?: number; // 1-31
  monthDay?: string; // 'MM-DD'
  date?: string; // Optional 'YYYY-MM-DD'
  defaultHymn?: Hymn;
  suggestions?: Hymn[];
  hymns: Hymn[]; // [defaultHymn, ...suggestions] (4 hymns total)
}

export interface YearlySchedulePlan {
  totalDays: number;
  generatedAt: string;
  days: DaySchedule[];
}

/** Backward-compatibility alias for 10-day references */
export type TenDayPlan = YearlySchedulePlan;


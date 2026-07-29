import { Hymn } from './hymn';

export interface DaySchedule {
  date: string; // ISO date string 'YYYY-MM-DD'
  hymns: Hymn[]; // List of 3 hymns assigned to this day
}

export interface TenDayPlan {
  generatedAt: string; // ISO timestamp string
  days: DaySchedule[]; // List of 10 daily schedules
}

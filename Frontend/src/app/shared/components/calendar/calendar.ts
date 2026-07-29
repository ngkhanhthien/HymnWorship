import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiCalendar, tuiCalendarOptionsProvider, TuiMarkerHandler } from '@taiga-ui/core';
import { TuiDay } from '@taiga-ui/cdk';
import { ScheduleService } from '../../../core/services/schedule.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, TuiCalendar],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    tuiCalendarOptionsProvider({
      weekStart: signal(1), // Week starts on Monday
    }),
  ],
})
export class CalendarComponent {
  private readonly scheduleService = inject(ScheduleService);
  readonly selectedDay = signal<TuiDay | null>(TuiDay.currentLocal());

  readonly markerHandler: TuiMarkerHandler = (day: TuiDay) => {
    const year = day.year;
    const month = String(day.month + 1).padStart(2, '0');
    const dayNum = String(day.day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayNum}`;

    const plan = this.scheduleService.currentPlan();
    if (plan && plan.days && plan.days.some((d) => d.date === dateStr)) {
      return ['#ec4899'];
    }
    return [];
  };

  onDayClick(day: TuiDay): void {
    this.selectedDay.set(day);
    const year = day.year;
    const month = String(day.month + 1).padStart(2, '0');
    const dayNum = String(day.day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayNum}`;
    this.scheduleService.setSelectedDate(dateStr);
  }
}

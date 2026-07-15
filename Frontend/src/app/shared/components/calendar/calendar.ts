import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiCalendar, tuiCalendarOptionsProvider } from '@taiga-ui/core';
import { TuiDay } from '@taiga-ui/cdk';

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
  readonly selectedDay = signal<TuiDay | null>(TuiDay.currentLocal());

  onDayClick(day: TuiDay): void {
    this.selectedDay.set(day);
  }
}

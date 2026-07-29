import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HymnItemComponent } from '../../shared/components/hymn-items/hymn-item.component';
import { CalendarComponent } from '../../shared/components/calendar/calendar';
import { ScheduleService } from '../../core/services/schedule.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HymnItemComponent, CalendarComponent],
  templateUrl: './home.page.html',
})
export class HomePageComponent {
  private readonly scheduleService = inject(ScheduleService);

  /** Reactive signal returning 3 hymns for the selected date on calendar */
  readonly scheduledHymns = this.scheduleService.selectedDayHymns;
}

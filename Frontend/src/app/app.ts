import { TuiRoot } from "@taiga-ui/core";
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './shared/components/app-header/app-header.component';
import { ScheduleService } from './core/services/schedule.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private readonly scheduleService = inject(ScheduleService);

  ngOnInit(): void {
    this.scheduleService.checkAndAutoSchedule().subscribe();
  }
}

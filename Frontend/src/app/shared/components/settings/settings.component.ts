import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, DataSourceMode } from '../../../core/services/settings.service';

export const SETTINGS_TITLE = 'Settings';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  readonly title = SETTINGS_TITLE;
  protected readonly settingsService = inject(SettingsService);

  onDataSourceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement) {
      this.settingsService.setDataSource(selectElement.value as DataSourceMode);
    }
  }
}

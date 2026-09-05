import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, DataSourceMode, ThemeMode } from '../../../core/services/settings.service';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';

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
  private readonly authService = inject(FirebaseAuthService);

  /** Inline notification for unsupported local data source selection */
  readonly localAttemptMessage = signal<string | null>(null);

  onDataSourceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (!selectElement) return;

    const selectedValue = selectElement.value as DataSourceMode;

    if (selectedValue === 'local') {
      const msg = 'Local data source mode is currently not supported by the application.';
      this.authService.showToast(msg, 'error');
      this.localAttemptMessage.set(msg);
      selectElement.value = 'firebase';
      this.settingsService.setDataSource('firebase');
    } else {
      this.localAttemptMessage.set(null);
      this.settingsService.setDataSource(selectedValue);
    }
  }

  onThemeModeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement) {
      this.settingsService.setThemeMode(selectElement.value as ThemeMode);
    }
  }

  onCustomColorChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      this.settingsService.setCustomColor(inputElement.value);
    }
  }
}

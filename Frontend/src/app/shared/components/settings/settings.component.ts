import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ThemeMode } from '../../../core/services/settings.service';
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

  /** Inline notification for unsupported color theme selection */
  readonly themeAttemptMessage = signal<string | null>(null);

  onThemeModeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (!selectElement) return;

    const selectedValue = selectElement.value as ThemeMode;

    if (selectedValue !== 'current') {
      const msg = 'Color Theme customization feature is currently not supported by the application.';
      this.authService.showToast(msg, 'error');
      this.themeAttemptMessage.set(msg);
      selectElement.value = 'current';
      this.settingsService.setThemeMode('current');
    } else {
      this.themeAttemptMessage.set(null);
      this.settingsService.setThemeMode(selectedValue);
    }
  }

  onCustomColorChange(event: Event): void {
    const msg = 'Color Theme customization feature is currently not supported by the application.';
    this.authService.showToast(msg, 'error');
    this.themeAttemptMessage.set(msg);
  }
}

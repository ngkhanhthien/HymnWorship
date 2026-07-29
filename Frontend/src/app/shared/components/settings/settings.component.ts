import { Component } from '@angular/core';

export const SETTINGS_TITLE = 'Settings';
export const SETTINGS_CONTENT = 'Setting is coming soon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  readonly title = SETTINGS_TITLE;
  readonly content = SETTINGS_CONTENT;
}

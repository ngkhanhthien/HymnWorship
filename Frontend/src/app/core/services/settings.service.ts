import { Injectable, signal } from '@angular/core';

export type DataSourceMode = 'local' | 'firebase';
export type ThemeMode = 'current' | 'dark' | 'light' | 'custom';

export interface DataSourceOption {
  value: DataSourceMode;
  label: string;
  description: string;
}

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  readonly dataSourceOptions: readonly DataSourceOption[] = [
    {
      value: 'firebase',
      label: 'Firebase (Firestore & Cloud Storage) [Default]',
      description: 'Fetch hymn metadata from Firestore and stream media from Firebase Storage.',
    },
    {
      value: 'local',
      label: 'Local (Unsupported)',
      description: 'Local project data source is currently not supported.',
    },
  ];

  readonly themeOptions: readonly ThemeOption[] = [
    {
      value: 'current',
      label: 'Current Theme (Default)',
      description: 'Keep the active standard website color palette.',
    },
    {
      value: 'dark',
      label: 'Dark Theme',
      description: 'Sleek dark mode palette optimized for night worship.',
    },
    {
      value: 'light',
      label: 'Light Theme',
      description: 'Clean bright light mode palette for daytime reading.',
    },
    {
      value: 'custom',
      label: 'Custom Color',
      description: 'Pick a personalized primary accent color.',
    },
  ];

  /** Selected data source mode, default is 'firebase' */
  readonly dataSource = signal<DataSourceMode>('firebase');

  /** Selected color theme mode, default is 'current' */
  readonly themeMode = signal<ThemeMode>('current');

  /** Custom primary color hex string, default is '#2563eb' */
  readonly customColor = signal<string>('#2563eb');

  setDataSource(mode: DataSourceMode): boolean {
    if (mode === 'local') {
      this.dataSource.set('firebase');
      return false;
    }
    this.dataSource.set(mode);
    return true;
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
  }

  setCustomColor(hex: string): void {
    this.customColor.set(hex);
  }
}

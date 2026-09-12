import { Injectable, signal } from '@angular/core';

export type DataSourceMode = 'local' | 'firebase';
export type ThemeMode = 'current' | 'dark';

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
      label: 'Default Theme',
      description: 'Keep the active standard website color palette.',
    },
    {
      value: 'dark',
      label: 'Dark Theme (Unsupported)',
      description: 'Color theme customization is currently not supported.',
    },
  ];

  /** Selected data source mode, default is 'firebase' */
  readonly dataSource = signal<DataSourceMode>('firebase');

  /** Selected color theme mode, default is 'current' */
  readonly themeMode = signal<ThemeMode>('current');

  constructor() {
    this.applyTheme();
  }

  setDataSource(mode: DataSourceMode): boolean {
    if (mode === 'local') {
      this.dataSource.set('firebase');
      return false;
    }
    this.dataSource.set(mode);
    return true;
  }

  setThemeMode(mode: ThemeMode): boolean {
    if (mode !== 'current') {
      this.themeMode.set('current');
      this.applyTheme();
      return false;
    }
    this.themeMode.set(mode);
    this.applyTheme();
    return true;
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const mode = this.themeMode();
    const root = document.documentElement;

    root.setAttribute('data-theme', mode);
  }
}

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
      label: 'Dark Theme (Unsupported)',
      description: 'Color theme customization is currently not supported.',
    },
    {
      value: 'light',
      label: 'Light Theme (Unsupported)',
      description: 'Color theme customization is currently not supported.',
    },
    {
      value: 'custom',
      label: 'Custom Color (Unsupported)',
      description: 'Color theme customization is currently not supported.',
    },
  ];

  /** Selected data source mode, default is 'firebase' */
  readonly dataSource = signal<DataSourceMode>('firebase');

  /** Selected color theme mode, default is 'current' */
  readonly themeMode = signal<ThemeMode>('current');

  /** Custom primary color hex string, default is '#2563eb' */
  readonly customColor = signal<string>('#2563eb');

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

  setCustomColor(hex: string): void {
    this.customColor.set(hex);
    this.applyTheme();
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const mode = this.themeMode();
    const hex = this.customColor();
    const root = document.documentElement;

    root.setAttribute('data-theme', mode);

    if (mode === 'custom') {
      root.style.setProperty('--custom-primary', hex);
      root.style.setProperty('--custom-hover', this.adjustColorBrightness(hex, -20));
      root.style.setProperty('--custom-light', `${hex}20`);
    } else {
      root.style.removeProperty('--custom-primary');
      root.style.removeProperty('--custom-hover');
      root.style.removeProperty('--custom-light');
    }
  }

  private adjustColorBrightness(hex: string, percent: number): string {
    let num = parseInt(hex.replace('#', ''), 16);
    if (isNaN(num)) return hex;
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}

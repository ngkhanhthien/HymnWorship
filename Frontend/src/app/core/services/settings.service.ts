import { Injectable, signal } from '@angular/core';

export type DataSourceMode = 'local' | 'firebase';

export interface DataSourceOption {
  value: DataSourceMode;
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

  /** Selected data source mode, default is 'firebase' */
  readonly dataSource = signal<DataSourceMode>('firebase');

  setDataSource(mode: DataSourceMode): boolean {
    if (mode === 'local') {
      this.dataSource.set('firebase');
      return false;
    }
    this.dataSource.set(mode);
    return true;
  }
}

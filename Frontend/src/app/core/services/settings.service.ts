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
      value: 'local',
      label: 'Local (Use local JSON & media files)',
      description: 'Fetch hymn data, sheet music, and audio directly from local project assets.',
    },
    {
      value: 'firebase',
      label: 'Firebase (Use Firestore & Cloud Storage)',
      description: 'Fetch hymn metadata from Firestore and stream media from Firebase Storage.',
    },
  ];

  /** Selected data source mode, default is 'local' */
  readonly dataSource = signal<DataSourceMode>('local');

  setDataSource(mode: DataSourceMode): void {
    this.dataSource.set(mode);
  }
}

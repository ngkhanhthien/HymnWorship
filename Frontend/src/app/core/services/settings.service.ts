import { Injectable, signal } from '@angular/core';

export type DataSourceMode = 'local' | 'firebase';

export interface DataSourceOption {
  value: DataSourceMode;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  readonly dataSourceOptions: readonly DataSourceOption[] = [
    { value: 'local', label: 'Local' },
    { value: 'firebase', label: 'Firebase' },
  ];

  /** Selected data source mode, default is 'local' */
  readonly dataSource = signal<DataSourceMode>('local');

  setDataSource(mode: DataSourceMode): void {
    this.dataSource.set(mode);
  }
}

export interface ScriptureRef {
  reference: string;
  url?: string;
}

export interface Hymn {
  number: string;
  title: string;
  id?: string;
  url?: string;
  scriptures?: ScriptureRef[];
  sheet_music?: string[];
  audio_accompaniment?: string;
}

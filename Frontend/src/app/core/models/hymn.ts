export interface ScriptureRef {
  reference: string;
  url?: string;
  text?: string;
}

export interface Hymn {
  number: string;
  title: string;
  id?: string;
  url?: string;
  collection?: string;
  collection_name?: string;
  scriptures?: ScriptureRef[];
  sheet_music?: string[];
  sheet_music_urls?: string[];
  audio_accompaniment?: string;
  audio_accompaniment_url?: string;
  audio_vocal?: string;
  audio_vocal_url?: string;
}

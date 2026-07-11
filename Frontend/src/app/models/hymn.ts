export interface Hymn {
  id: number;
  title: string;
  songNumber: number;
  tune: string;
  credits: string;
  description: string;
  scriptures: string[];
  audioUrl: string;
  sheetMusicUrl: string;
  lyrics: string;
  category: 'prayer' | 'christmas' | 'all' | 'new';
}

import { Injectable, signal, computed } from '@angular/core';
import { Hymn } from '../../models/hymn';

@Injectable({
  providedIn: 'root'
})
export class HymnService {
  private readonly hymns = signal<Hymn[]>([
    {
      id: 1,
      title: 'The Morning Breaks',
      songNumber: 1,
      tune: 'HUDSON',
      credits: 'Parley P. Pratt (1807–1857), Music: George Careless (1839–1932)',
      description: 'A beautiful hymn celebrating the restoration of the gospel and the dawning of a new day.',
      scriptures: ['Isaiah 60:1-3', '3 Nephi 16:7-20'],
      audioUrl: 'https://assets.churchofjesuschrist.org/2e/3a/2e3a6cdd9754f46fa25dc5973289aaad2b6/the-morning-breaks-eng.mp3',
      sheetMusicUrl: 'https://assets.churchofjesuschrist.org/2e/3a/2e3a6cdd9754f46fa25dc5973289aaad2b6/the-morning-breaks-eng.pdf',
      lyrics: `The morning breaks, the shadows flee;
Lo, Zion’s standard is unfurled!
The dawning of a brighter day
Majestic rises on the world.

The clouds of error disappear
Before the rays of truth divine;
The glory, bursting from afar,
Wide o’er the nations soon will shine.`,
      category: 'all'
    },
    {
      id: 2,
      title: 'Abide with Me!',
      songNumber: 166,
      tune: 'EVENTIDE',
      credits: 'Henry F. Lyte (1793–1847), Music: William H. Monk (1823–1889)',
      description: 'A prayer for God to remain with the believer through trials and the end of life.',
      scriptures: ['Luke 24:29', 'Hebrews 13:5'],
      audioUrl: 'https://assets.churchofjesuschrist.org/abide-with-me.mp3',
      sheetMusicUrl: 'https://assets.churchofjesuschrist.org/abide-with-me.pdf',
      lyrics: `Abide with me; fast falls the eventide;
The darkness deepens; Lord, with me abide!
When other helpers fail and comforts flee,
Help of the helpless, oh, abide with me!`,
      category: 'prayer'
    },
    {
      id: 3,
      title: 'Come, Come, Ye Saints',
      songNumber: 30,
      tune: 'ALL IS WELL',
      credits: 'William Clayton (1814–1879), Music: English Folk Song',
      description: 'An encouraging pioneer hymn of trust and perseverance in journeying to Zion.',
      scriptures: ['D&C 136:1-11', 'Deuteronomy 31:6'],
      audioUrl: 'https://assets.churchofjesuschrist.org/come-come-ye-saints.mp3',
      sheetMusicUrl: 'https://assets.churchofjesuschrist.org/come-come-ye-saints.pdf',
      lyrics: `Come, come, ye Saints, no toil nor labor fear;
But with joy wend your way.
Though hard to you this journey may appear,
Grace shall be as your day.`,
      category: 'all'
    },
    {
      id: 4,
      title: 'Silent Night',
      songNumber: 204,
      tune: 'STILLE NACHT',
      credits: 'Joseph Mohr (1792–1848), Music: Franz Gruber (1787–1863)',
      description: 'A classic peaceful Christmas hymn honoring the birth of Jesus Christ.',
      scriptures: ['Luke 2:1-20', 'Alma 7:10-12'],
      audioUrl: 'https://assets.churchofjesuschrist.org/silent-night.mp3',
      sheetMusicUrl: 'https://assets.churchofjesuschrist.org/silent-night.pdf',
      lyrics: `Silent night, holy night,
All is calm, all is bright
Round yon virgin mother and Child.
Holy Infant, so tender and mild,
Sleep in heavenly peace.`,
      category: 'christmas'
    }
  ]);

  private readonly selectedHymnId = signal<number>(1);

  readonly allHymns = this.hymns.asReadonly();
  readonly selectedHymn = computed(() => 
    this.hymns().find(h => h.id === this.selectedHymnId()) || this.hymns()[0]
  );

  selectHymn(id: number): void {
    this.selectedHymnId.set(id);
  }

  getHymnsByCategory(category: string): Hymn[] {
    if (category === 'all') return this.hymns();
    return this.hymns().filter(h => h.category === category || category === 'new'); // mock 'new' category returns all
  }
}

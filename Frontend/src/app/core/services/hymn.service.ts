import { Hymn } from '../models/hymn';

/** The 3 featured hymns for today — single source of truth */
export const TODAY_HYMNS: readonly Hymn[] = [
  { number: '1001', title: 'Come, Thou Fount of Every Blessing' },
  { number: '1004', title: 'I Will Walk with Jesus' },
  { number: '1005', title: 'His Eye Is on the Sparrow' },
];

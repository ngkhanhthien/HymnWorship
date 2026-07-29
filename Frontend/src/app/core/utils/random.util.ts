/**
 * Pure DRY utility function to select `count` unique random items from an array.
 * If array length <= count, returns a shuffled shallow copy of the entire array.
 */
export function getRandomItems<T>(array: readonly T[] | T[], count: number): T[] {
  if (!array || array.length === 0) {
    return [];
  }

  const listCopy = [...array];
  // Fisher-Yates shuffle algorithm
  for (let i = listCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [listCopy[i], listCopy[j]] = [listCopy[j], listCopy[i]];
  }

  return listCopy.slice(0, Math.min(count, listCopy.length));
}

/**
 * Format a Date object as 'YYYY-MM-DD' string in local timezone.
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

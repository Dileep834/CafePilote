/** Generate unique CafePilots company codes: CP-CAF-4821 */

export function slugPrefix(name: string, fallback = 'CMP'): string {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  return letters.length >= 2 ? letters.padEnd(3, 'X') : fallback;
}

export function generateCompanyCode(companyName: string, random = Math.random): string {
  const prefix = slugPrefix(companyName);
  const num = Math.floor(1000 + random() * 9000);
  return `CP-${prefix}-${num}`;
}

export function generateOutletCode(companyName: string, random = Math.random): string {
  const prefix = slugPrefix(companyName, 'OUT');
  const num = Math.floor(1000 + random() * 9000);
  return `${prefix}${num}`;
}

export function progressPercent(flags: Record<string, boolean | undefined>): number {
  const keys = Object.keys(flags);
  if (!keys.length) return 0;
  const done = keys.filter((k) => flags[k]).length;
  return Math.round((done / keys.length) * 100);
}

export function statusColor(percent: number): 'red' | 'yellow' | 'green' {
  if (percent >= 85) return 'green';
  if (percent >= 40) return 'yellow';
  return 'red';
}

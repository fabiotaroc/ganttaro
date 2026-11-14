export type RecentChart = { key: string; title: string; opened: number; access: 'Edit' | 'View' };
const storageKey = 'ganttaro:recent';
export function readRecent(): RecentChart[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is RecentChart => typeof item?.key === 'string' && typeof item?.title === 'string' && typeof item?.opened === 'number' && ['Edit','View'].includes(item?.access)).sort((a,b) => b.opened - a.opened);
  } catch { return []; }
}
function save(items: RecentChart[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(items.slice(0,30))); window.dispatchEvent(new Event('ganttaro-recents')); } catch { /* Private browsing can deny localStorage writes. */ }
}
export function recordRecent(chart: RecentChart) { save([chart,...readRecent().filter(item => item.key !== chart.key)]); }
export function removeRecent(key: string) { save(readRecent().filter(item => item.key !== key)); }
export function recentSnapshot() { try { return localStorage.getItem(storageKey) ?? '[]'; } catch { return '[]'; } }
export function subscribeRecent(callback: () => void) { window.addEventListener('storage',callback);window.addEventListener('ganttaro-recents',callback);return () => {window.removeEventListener('storage',callback);window.removeEventListener('ganttaro-recents',callback);}; }

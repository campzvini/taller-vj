// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — search.ts
// § - YouTube Data API lookup and URL parsing · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import type { Item } from './types';

export const getKey = () => localStorage.getItem('vj.key') || '';
export const setKey = (k: string) => localStorage.setItem('vj.key', k.trim());

export function parseId(s: string): string | null {
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s.trim()) ? s.trim() : null;
}
export const parseList = (s: string) => (s.match(/[?&]list=([\w-]+)/) || [])[1];

export type SearchOut = { items: Item[]; error?: string; direct?: boolean };

export async function search(q: string): Promise<SearchOut> {
  const term = q.trim();
  if (!term) return { items: [] };

  const list = parseList(term), id = parseId(term);
  if (list) return {
    direct: true,
    items: [{
      id: id || list, plist: list, title: '▶ playlist ' + list.slice(0, 10),
      thumb: id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : ''
    }]
  };
  if (id) return {
    direct: true,
    items: [{ id, title: id, thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }]
  };

  const key = getKey();
  if (!key) return { items: [], error: 'sem API key — cole uma key ou use URL/ID direto' };
  try {
    const r = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video'
      + `&maxResults=24&videoEmbeddable=true&q=${encodeURIComponent(term)}&key=${key}`);
    const j = await r.json();
    if (j.error) return { items: [], error: 'API: ' + j.error.message };
    return {
      items: (j.items || []).map((i: any) => ({
        id: i.id.videoId, title: i.snippet.title, thumb: i.snippet.thumbnails.medium.url
      }))
    };
  } catch {
    return { items: [], error: 'falha na busca' };
  }
}

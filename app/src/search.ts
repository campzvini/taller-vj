// ────────────────────────────────────────────
// TALLER VJ APP 0.5 — search.ts
// § - YouTube lookup with embeddable/vertical filtering and paging · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import type { Item } from './types';
export type { Item };

export const getKey = () => localStorage.getItem('vj.key') || '';
export const setKey = (k: string) => localStorage.setItem('vj.key', k.trim());

export function parseId(s: string): string | null {
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s.trim()) ? s.trim() : null;
}
export const parseList = (s: string) => (s.match(/[?&]list=([\w-]+)/) || [])[1];

export type Order = 'relevance' | 'date' | 'viewCount' | 'rating';
export type Dur = 'any' | 'short' | 'medium' | 'long';
export type Opts = {
  order?: Order; duration?: Dur; channelId?: string;
  page?: string; hideVertical?: boolean; maxResults?: number;
};
export type SearchOut = {
  items: Item[]; error?: string; direct?: boolean;
  nextPage?: string; descartados?: number;
};

const API = 'https://www.googleapis.com/youtube/v3';

/**
 * Enriquecimento em duas etapas: search custa 100 unidades e não diz se o vídeo
 * pode ser embutido nem qual a proporção. videos.list custa 1 e diz os dois —
 * então filtrar o lixo sai praticamente de graça.
 */
/** PT1H2M3S -> segundos. */
export function isoSegundos(s?: string): number {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(s || '');
  if (!m) return 0;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
}

async function enrich(ids: string[], hideVertical: boolean) {
  const key = getKey();
  const r = await fetch(`${API}/videos?part=status,contentDetails,player,snippet,statistics`
    + `&maxWidth=480&id=${ids.join(',')}&key=${key}`);
  const j = await r.json();
  const ok = new Set<string>();
  const vertical = new Set<string>();
  const meta = new Map<string, Partial<Item>>();
  for (const v of j.items || []) {
    if (v.status?.embeddable === false) continue;
    // o HTML de embed carrega width/height na proporção real do vídeo:
    // é o jeito de reconhecer short/vertical, que a busca não informa
    const html = v.player?.embedHtml || '';
    const w = +(html.match(/width="(\d+)"/)?.[1] || 0);
    const h = +(html.match(/height="(\d+)"/)?.[1] || 0);
    if (w && h && h > w) { vertical.add(v.id); if (hideVertical) continue; }
    ok.add(v.id);
    // a mesma unidade de cota já pagou por isto: duração, canal, views, ano
    meta.set(v.id, {
      dur: isoSegundos(v.contentDetails?.duration),
      canal: v.snippet?.channelTitle,
      views: +(v.statistics?.viewCount || 0) || undefined,
      ano: (v.snippet?.publishedAt || '').slice(0, 4)
    });
  }
  return { ok, vertical, meta };
}

export async function search(q: string, opts: Opts = {}): Promise<SearchOut> {
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
  if (!key) return { items: [], error: 'no API key — paste one, or use a URL / ID' };

  try {
    const p = new URLSearchParams({
      part: 'snippet', type: 'video', maxResults: String(opts.maxResults || 24),
      videoEmbeddable: 'true',
      order: opts.order || 'relevance', q: term, key
    });
    if (opts.duration && opts.duration !== 'any') p.set('videoDuration', opts.duration);
    if (opts.channelId) p.set('channelId', opts.channelId);
    if (opts.page) p.set('pageToken', opts.page);

    const r = await fetch(`${API}/search?${p}`);
    const j = await r.json();
    if (j.error) return { items: [], error: 'API: ' + j.error.message };

    const raw: Item[] = (j.items || []).map((i: any) => ({
      id: i.id.videoId, title: i.snippet.title, thumb: i.snippet.thumbnails.medium.url
    }));

    let items = raw, descartados = 0;
    try {
      const { ok, meta } = await enrich(raw.map(i => i.id), opts.hideVertical !== false);
      items = raw.filter(i => ok.has(i.id)).map(i => ({ ...i, ...meta.get(i.id) }));
      descartados = raw.length - items.length;
    } catch { /* enriquecimento é melhoria, não requisito */ }

    return { items, nextPage: j.nextPageToken, descartados };
  } catch {
    return { items: [], error: 'search failed' };
  }
}

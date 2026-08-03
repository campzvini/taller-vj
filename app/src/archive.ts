// ────────────────────────────────────────────
// TALLER VJ APP 1.2 — archive.ts
// § - Internet Archive as a second library, resolved to direct video · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import type { Item } from './types';

/**
 * O Archive devolve a busca sem os arquivos; o endereço real só aparece no
 * metadata de cada item. Resolver na busca custaria 24 requisições por página,
 * então o item nasce com 'archive:<id>' e vira URL na hora de tocar.
 */
const BUSCA = 'https://archive.org/advancedsearch.php';
const META = 'https://archive.org/metadata/';

export const ehArchive = (src?: string) => !!src?.startsWith('archive:');

export type ArchiveOut = { items: Item[]; error?: string; temMais?: boolean };

export async function buscaArchive(q: string, pagina = 1, linhas = 24): Promise<ArchiveOut> {
  const termo = q.trim();
  if (!termo) return { items: [] };
  const p = new URLSearchParams({
    q: `${termo} AND mediatype:(movies)`,
    rows: String(linhas), page: String(pagina), output: 'json'
  });
  p.append('fl[]', 'identifier');
  p.append('fl[]', 'title');
  p.append('fl[]', 'year');
  try {
    const r = await fetch(`${BUSCA}?${p}`);
    const j = await r.json();
    const docs = j?.response?.docs || [];
    const items: Item[] = docs.map((d: { identifier: string; title?: string; year?: string }) => ({
      id: 'ia:' + d.identifier,
      title: (d.title || d.identifier) + (d.year ? ` (${d.year})` : ''),
      thumb: `https://archive.org/services/img/${d.identifier}`,
      kind: 'file' as const,
      src: 'archive:' + d.identifier
    }));
    return { items, temMais: docs.length >= linhas };
  } catch {
    return { items: [], error: 'archive.org unreachable' };
  }
}

const cache = new Map<string, string>();

// derivados leves primeiro: o original costuma ser grande demais para tocar ao vivo
const PESO = (nome: string, formato: string) => {
  const f = (formato || '').toLowerCase(), n = nome.toLowerCase();
  if (f.includes('512kb') || n.includes('512kb')) return 0;
  if (f.includes('mpeg4') || n.endsWith('.mp4')) return 1;
  if (n.endsWith('.ogv')) return 2;
  if (n.endsWith('.webm')) return 3;
  return 9;
};

/** Devolve a URL tocável de um item do Archive, ou null se não houver vídeo. */
export async function resolverArchive(src: string): Promise<string | null> {
  const id = src.replace(/^archive:/, '');
  const pronto = cache.get(id);
  if (pronto) return pronto;
  try {
    const r = await fetch(META + id);
    const j = await r.json();
    const arquivos: { name: string; format?: string }[] = j?.files || [];
    const bons = arquivos
      .filter(f => /\.(mp4|ogv|webm|m4v)$/i.test(f.name))
      .sort((a, b) => PESO(a.name, a.format || '') - PESO(b.name, b.format || ''));
    if (!bons.length) return null;
    const servidor = j.server || 'archive.org';
    const dir = j.dir || '/' + id;
    const url = `https://${servidor}${dir}/${encodeURIComponent(bons[0].name)}`;
    cache.set(id, url);
    return url;
  } catch { return null; }
}

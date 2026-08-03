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

/** Coleção no Archive equivale a curadoria: é o filtro que mais muda o resultado. */
export const COLECOES: [string, string][] = [
  ['', 'any collection'],
  ['prelinger', 'Prelinger (ephemeral film)'],
  ['feature_films', 'feature films'],
  ['animationandcartoons', 'animation & cartoons'],
  ['classic_tv', 'classic TV'],
  ['artsandmusicvideos', 'arts & music'],
  ['newsandpublicaffairs', 'news & public affairs'],
  ['home_movies', 'home movies'],
  ['avgeeks', 'AV Geeks'],
  ['sciencefiction', 'science fiction'],
  ['moviesandfilms', 'all movies']
];

export const ORDENS: [string, string][] = [
  ['downloads desc', 'most downloaded'],
  ['', 'relevance'],
  ['addeddate desc', 'recently added'],
  ['date desc', 'newest'],
  ['date asc', 'oldest'],
  ['week desc', 'popular this week']
];

export type ArchiveOpts = {
  colecao?: string; ordem?: string; anoDe?: string; anoAte?: string;
  criador?: string; assunto?: string;
  soMp4?: boolean; pagina?: number; linhas?: number;
};

export async function buscaArchive(q: string, o: ArchiveOpts = {}): Promise<ArchiveOut> {
  const termo = q.trim();
  const linhas = o.linhas || 30;
  // sem título também é busca: no Archive os campos de catalogação (coleção, ano,
  // criador) filtram sozinhos, e é assim que se garimpa um acervo desse tamanho
  const partes = ['mediatype:(movies)'];
  if (termo) partes.unshift(`(${termo})`);
  if (o.criador) partes.push(`creator:(${o.criador})`);
  if (o.assunto) partes.push(`subject:(${o.assunto})`);
  if (!termo && !o.colecao && !o.criador && !o.assunto && !o.anoDe && !o.anoAte) {
    return { items: [], error: 'set a term or at least one filter' };
  }
  if (o.colecao) partes.push(`collection:(${o.colecao})`);
  if (o.anoDe || o.anoAte) partes.push(`year:[${o.anoDe || '1800'} TO ${o.anoAte || '2100'}]`);
  // sem derivado MP4 o item só se revela intocável DEPOIS de ir para o deck
  if (o.soMp4 !== false) partes.push('format:(MPEG4)');

  const p = new URLSearchParams({
    q: partes.join(' AND '),
    rows: String(linhas), page: String(o.pagina || 1), output: 'json'
  });
  ['identifier', 'title', 'year', 'downloads', 'creator'].forEach(f => p.append('fl[]', f));
  if (o.ordem) p.append('sort[]', o.ordem);

  try {
    const r = await fetch(`${BUSCA}?${p}`);
    const j = await r.json();
    const docs = j?.response?.docs || [];
    type Doc = { identifier: string; title?: string; year?: string; downloads?: number; creator?: string };
    const items: Item[] = docs.map((d: Doc) => ({
      id: 'ia:' + d.identifier,
      title: d.title || d.identifier,
      thumb: `https://archive.org/services/img/${d.identifier}`,
      kind: 'file' as const,
      src: 'archive:' + d.identifier,
      canal: Array.isArray(d.creator) ? d.creator[0] : d.creator,
      views: d.downloads,
      ano: d.year
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

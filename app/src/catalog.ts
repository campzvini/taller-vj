// ────────────────────────────────────────────
// TALLER VJ APP 0.6 — catalog.ts
// § - Local files as a source: import, probe, thumbnails · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { cue, flashMsg, play, poolAssign } from './actions';
import { M } from './players';
import { localUrl, type Item, type Lane } from './types';
import { ehArchive, resolverArchive } from './archive';

const nomeDe = (p: string) => p.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '');

/** Um arquivo do disco vira Item com a mesma forma dos vídeos do YouTube:
 *  daí em diante biblioteca, slots, trecho e arraste funcionam igual. */
async function toItem(path: string): Promise<Item> {
  const info = await window.vj?.probe?.(path).catch(() => null);
  const dur = (info?.dur as number) || 0;
  const thumbPath = await window.vj?.thumb?.(path, Math.min(5, dur / 3 || 1)).catch(() => null);
  return {
    id: 'file:' + path,
    title: nomeDe(path),
    thumb: thumbPath ? localUrl(thumbPath) : '',
    kind: 'file',
    src: path,
    dur
  };
}

async function importar(paths: string[], lane: Lane) {
  if (!paths.length) return;
  flashMsg(`reading ${paths.length} file(s)…`);
  const s = useSession.getState();
  let n = 0;
  // em série: gerar miniatura dispara ffmpeg, e em paralelo isso engasga a máquina
  for (const p of paths) {
    const it = await toItem(p);
    if (s.addTo(lane, it)) n++;
  }
  flashMsg(`${n} video(s) added`);
}

/** Os diálogos abrem na pasta-fonte do acervo, não em "Documentos". */
const pastaFonte = () => useSession.getState().libDir || undefined;

export async function importFiles(lane: Lane = 'V') {
  const paths = (await window.vj?.pickFiles?.(pastaFonte())) || [];
  await importar(paths, lane);
}

export async function importFolder(lane: Lane = 'V') {
  const r = await window.vj?.pickFolder?.(pastaFonte());
  if (!r) return;
  await importar(r.files.slice(0, 200), lane);   // teto para não travar em pasta gigante
}

/** IN/OUT viram arquivo novo: o garimpo de uma noite fica como acervo.
 *  Só vale para arquivo local — do YouTube não temos os bytes. */
export async function salvarTrecho(it: Item | null, inn?: number | null, out?: number | null) {
  if (!it || it.kind !== 'file' || !it.src) { flashMsg('local files only'); return; }
  const start = inn ?? 0;
  const end = out ?? (it.dur || 0);
  if (!(end > start)) { flashMsg('set IN and OUT first'); return; }
  flashMsg('cutting…');
  const p = await window.vj?.clip?.({ file: it.src, start, end }).catch(() => null);
  flashMsg(p ? 'clip saved: ' + p.split(/[\\/]/).pop() : 'cancelled');
}

/** Traz o item remoto para o disco e troca a fonte em TODO lugar que a referencia:
 *  a partir daí é arquivo local, com seek instantâneo e sem rede no meio da festa. */
export async function baixar(
  it: Item | null,
  aoAndar?: (pct: number, mb: number) => void
): Promise<string | null> {
  if (!it?.src) { flashMsg('nothing to download'); return null; }
  const s = useSession.getState();
  const url = ehArchive(it.src) ? await resolverArchive(it.src) : it.src;
  if (!url || !/^https?:/i.test(url)) { flashMsg('only remote sources can be downloaded'); return null; }

  flashMsg('downloading…');
  // sem progresso o operador não sabe se travou ou se é só um arquivo grande
  const solta = window.vj?.onBaixando?.(d => {
    if (d.url !== url) return;
    const mb = d.lido / 1048576;
    const pct = d.total ? Math.round(d.lido / d.total * 100) : 0;
    aoAndar?.(pct, mb);
    if (d.fim) flashMsg(`downloaded ${mb.toFixed(1)} MB`);
    else flashMsg(d.total ? `downloading ${pct}% · ${mb.toFixed(1)} MB` : `downloading ${mb.toFixed(1)} MB`);
  });
  const r = await window.vj?.baixar?.(url, it.title, pastaFonte()).finally(() => solta?.());
  if (!r?.path) { flashMsg('download failed: ' + (r?.error || 'unknown')); return null; }

  const dur = ((await window.vj?.probe?.(r.path).catch(() => null))?.dur as number) || it.dur;
  const local: Item = { ...it, kind: 'file', src: r.path, dur };
  const troca = (l: Item[]) => l.map(x => x.id === it.id ? { ...local, in: x.in, out: x.out } : x);
  s.set('lib', { V: troca(s.lib.V), C: troca(s.lib.C) });
  s.set('slots', s.slots.map(x => x && x.id === it.id ? { ...local, in: x.in, out: x.out } : x));

  // O que já está no ar troca de fonte SOZINHO, no ponto em que estava: de fora
  // parece que a rede simplesmente deixou de importar. Sem isto, o download só
  // valeria para a próxima vez que o item fosse carregado.
  const onde = (['A', 'B', 'C', 'P'] as const).filter(k => s.now[k]?.id === it.id);
  for (const k of onde) {
    const t = M.time(k === 'P' ? 'P' : k);
    if (k === 'P') await cue({ ...local, in: it.in, out: it.out });
    else await play(k, local, t);
  }
  if (onde.length) {
    const poolN = s.slots.findIndex(x => x?.id === it.id);
    if (poolN >= 0) poolAssign(poolN);
  }
  s.save();
  flashMsg(r.jaTinha ? 'already in the library' : `local now — ${onde.length ? 'swapped live' : 'ready'}`);
  return r.path;
}

/** Arrastar arquivos do explorador direto para a janela. */
export async function dropFiles(files: FileList, lane: Lane = 'V') {
  const paths: string[] = [];
  for (const f of Array.from(files)) {
    const p = (f as File & { path?: string }).path;
    if (p) paths.push(p);
  }
  await importar(paths, lane);
}

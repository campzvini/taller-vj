// ────────────────────────────────────────────
// TALLER VJ APP 0.6 — catalog.ts
// § - Local files as a source: import, probe, thumbnails · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { flashMsg } from './actions';
import { localUrl, type Item } from './types';

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

async function importar(paths: string[], lane: 'A' | 'B' | 'C') {
  if (!paths.length) return;
  flashMsg(`lendo ${paths.length} arquivo(s)…`);
  const s = useSession.getState();
  let n = 0;
  // em série: gerar miniatura dispara ffmpeg, e em paralelo isso engasga a máquina
  for (const p of paths) {
    const it = await toItem(p);
    if (s.addTo(lane, it)) n++;
  }
  flashMsg(`${n} vídeo(s) → ${lane}`);
}

export async function importFiles(lane: 'A' | 'B' | 'C' = 'A') {
  const paths = (await window.vj?.pickFiles?.()) || [];
  await importar(paths, lane);
}

export async function importFolder(lane: 'A' | 'B' | 'C' = 'A') {
  const r = await window.vj?.pickFolder?.();
  if (!r) return;
  await importar(r.files.slice(0, 200), lane);   // teto para não travar em pasta gigante
}

/** IN/OUT viram arquivo novo: o garimpo de uma noite fica como acervo.
 *  Só vale para arquivo local — do YouTube não temos os bytes. */
export async function salvarTrecho(it: Item | null, inn?: number | null, out?: number | null) {
  if (!it || it.kind !== 'file' || !it.src) { flashMsg('só para arquivo local'); return; }
  const start = inn ?? 0;
  const end = out ?? (it.dur || 0);
  if (!(end > start)) { flashMsg('marque IN e OUT antes'); return; }
  flashMsg('cortando…');
  const p = await window.vj?.clip?.({ file: it.src, start, end }).catch(() => null);
  flashMsg(p ? 'trecho salvo: ' + p.split(/[\\/]/).pop() : 'cancelado');
}

/** Arrastar arquivos do explorador direto para a janela. */
export async function dropFiles(files: FileList, lane: 'A' | 'B' | 'C') {
  const paths: string[] = [];
  for (const f of Array.from(files)) {
    const p = (f as File & { path?: string }).path;
    if (p) paths.push(p);
  }
  await importar(paths, lane);
}

// ────────────────────────────────────────────
// TALLER VJ APP 0.9 — record.ts
// § - Screen recording of the output window, with system sound · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

/**
 * Gravar a JANELA, e não a composição, é o que torna isto possível: o iframe do
 * YouTube não entrega pixels para nós, mas entrega para o compositor do sistema.
 * O que o projetor mostra é exatamente o que a captura vê — inclusive os efeitos.
 * O som vem do loopback, pelo mesmo motivo pelo qual a análise vem de lá.
 */
export type Alvo = { id: string; name: string; tipo: string };

export const rec = {
  ativo: false,
  inicio: 0,
  ms: 0,
  bytes: 0,
  ultimo: null as string | null,   // caminho do último arquivo salvo
  erro: null as string | null
};

let mr: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let pedacos: Blob[] = [];
let relogio = 0;

export async function listarAlvos(): Promise<Alvo[]> {
  try { return (await window.vj?.sources?.()) || []; } catch { return []; }
}

/** A janela de saída se anuncia pelo título; achá-la evita gravar a tela inteira. */
export function acharSaida(alvos: Alvo[]): Alvo | undefined {
  return alvos.find(a => /taller.*(output|sa[ií]da)/i.test(a.name))
    || alvos.find(a => a.tipo === 'tela');
}

const MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

export async function startRec(alvoId: string, comSom = true, bitrateMbps = 12): Promise<boolean> {
  if (rec.ativo) return true;
  rec.erro = null;
  try {
    const video = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop', chromeMediaSourceId: alvoId,
          maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30
        }
      }
    } as unknown as MediaStreamConstraints);

    let faixas = [...video.getVideoTracks()];
    if (comSom) {
      try {
        const som = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop' } },
          video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 2, maxHeight: 2 } }
        } as unknown as MediaStreamConstraints);
        som.getVideoTracks().forEach(t => t.stop());
        faixas = [...faixas, ...som.getAudioTracks()];
      } catch { /* grava mudo em vez de não gravar */ }
    }
    stream = new MediaStream(faixas);

    const mime = MIMES.find(m => MediaRecorder.isTypeSupported(m));
    mr = new MediaRecorder(stream, {
      mimeType: mime, videoBitsPerSecond: Math.max(1, bitrateMbps) * 1_000_000
    });
    pedacos = [];
    mr.ondataavailable = e => {
      if (e.data && e.data.size) { pedacos.push(e.data); rec.bytes += e.data.size; }
    };
    // fatias de um segundo: se a máquina cair no meio, o que já saiu está no array
    mr.start(1000);

    rec.ativo = true; rec.inicio = performance.now(); rec.ms = 0; rec.bytes = 0;
    relogio = window.setInterval(() => { rec.ms = performance.now() - rec.inicio; }, 250);
    return true;
  } catch (e) {
    rec.erro = String((e as Error)?.message || e);
    await limpar();
    return false;
  }
}

async function limpar() {
  clearInterval(relogio);
  stream?.getTracks().forEach(t => t.stop());
  stream = null; mr = null;
  rec.ativo = false;
}

/** Encerra, grava em disco e devolve o caminho. Converter para MP4 é opcional. */
export async function stopRec(paraMp4 = false): Promise<string | null> {
  if (!mr || !rec.ativo) return null;
  const fim = new Promise<void>(res => { mr!.onstop = () => res(); });
  mr.stop();
  await fim;
  await limpar();

  if (!pedacos.length) { rec.erro = 'nada foi capturado'; return null; }
  const blob = new Blob(pedacos, { type: 'video/webm' });
  pedacos = [];
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const p = (await window.vj?.saveRec?.(bytes, 'webm')) || null;
  rec.ultimo = p;
  if (p && paraMp4) {
    const mp4 = await window.vj?.toMp4?.(p).catch(() => null);
    if (mp4) rec.ultimo = mp4;
  }
  return rec.ultimo;
}

export const durMMSS = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

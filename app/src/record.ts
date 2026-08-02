// ────────────────────────────────────────────
// TALLER VJ APP 1.0 — record.ts
// § - Screen recording of output and controller, with system sound · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

/**
 * Gravar a JANELA, e não a composição, é o que torna isto possível: o iframe do
 * YouTube não entrega pixels para nós, mas entrega para o compositor do sistema.
 * O que o projetor mostra é exatamente o que a captura vê — inclusive os efeitos.
 * O som vem do loopback, pelo mesmo motivo pelo qual a análise vem de lá.
 *
 * Gravar as duas janelas ao mesmo tempo gera DOIS arquivos, não um mosaico: a
 * projeção é a obra, o controlador é o registro do gesto — servem para coisas
 * diferentes e ninguém quer separá-las depois na edição.
 */
export type Alvo = { id: string; name: string; tipo: string };
export type Modo = 'out' | 'ctrl' | 'ambos';

export type Pedido = { id: string; rotulo: string };

export const rec = {
  ativo: false,
  inicio: 0,
  ms: 0,
  bytes: 0,
  quantos: 0,                        // quantas janelas estão sendo gravadas agora
  ultimos: [] as string[],           // caminhos salvos na última parada
  erro: null as string | null
};

type Sessao = { mr: MediaRecorder; stream: MediaStream; pedacos: Blob[]; rotulo: string };
const sessoes: Sessao[] = [];
let relogio = 0;

export async function listarAlvos(): Promise<Alvo[]> {
  try { return (await window.vj?.sources?.()) || []; } catch { return []; }
}

/** As janelas se anunciam pelo título; achá-las evita gravar a tela inteira. */
export const acharSaida = (alvos: Alvo[]) =>
  alvos.find(a => /taller.*(output|sa[ií]da)/i.test(a.name));
export const acharControlador = (alvos: Alvo[]) =>
  alvos.find(a => /^taller vj$/i.test(a.name.trim()))
  || alvos.find(a => /taller/i.test(a.name) && !/output|sa[ií]da/i.test(a.name));

const MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

async function somDoSistema(): Promise<MediaStreamTrack[]> {
  try {
    const som = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'desktop' } },
      video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 2, maxHeight: 2 } }
    } as unknown as MediaStreamConstraints);
    som.getVideoTracks().forEach(t => t.stop());
    return som.getAudioTracks();
  } catch { return []; }   // grava mudo em vez de não gravar
}

export async function startRec(pedidos: Pedido[], comSom = true, bitrateMbps = 12): Promise<boolean> {
  if (rec.ativo || !pedidos.length) return rec.ativo;
  rec.erro = null;
  const mime = MIMES.find(m => MediaRecorder.isTypeSupported(m));

  for (const pedido of pedidos) {
    try {
      const video = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop', chromeMediaSourceId: pedido.id,
            maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30
          }
        }
      } as unknown as MediaStreamConstraints);

      // cada arquivo carrega o próprio som: são gravações independentes
      const audio = comSom ? await somDoSistema() : [];
      const stream = new MediaStream([...video.getVideoTracks(), ...audio]);
      const mr = new MediaRecorder(stream, {
        mimeType: mime, videoBitsPerSecond: Math.max(1, bitrateMbps) * 1_000_000
      });
      const s: Sessao = { mr, stream, pedacos: [], rotulo: pedido.rotulo };
      mr.ondataavailable = e => {
        if (e.data && e.data.size) { s.pedacos.push(e.data); rec.bytes += e.data.size; }
      };
      // fatias de um segundo: se a máquina cair no meio, o que já saiu está no array
      mr.start(1000);
      sessoes.push(s);
    } catch (e) {
      rec.erro = String((e as Error)?.message || e);
    }
  }

  if (!sessoes.length) return false;
  rec.ativo = true; rec.inicio = performance.now(); rec.ms = 0; rec.bytes = 0;
  rec.quantos = sessoes.length;
  relogio = window.setInterval(() => { rec.ms = performance.now() - rec.inicio; }, 250);
  return true;
}

/** Encerra tudo, grava em disco e devolve os caminhos. MP4 é opcional e demora. */
export async function stopRec(paraMp4 = false, dir?: string): Promise<string[]> {
  if (!rec.ativo) return [];
  clearInterval(relogio);
  const feitas = sessoes.splice(0, sessoes.length);
  rec.ativo = false; rec.quantos = 0;

  const caminhos: string[] = [];
  for (const s of feitas) {
    await new Promise<void>(res => { s.mr.onstop = () => res(); s.mr.stop(); });
    s.stream.getTracks().forEach(t => t.stop());
    if (!s.pedacos.length) continue;
    const blob = new Blob(s.pedacos, { type: 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const p = await window.vj?.saveRec?.(bytes, 'webm', dir, s.rotulo);
    if (p) caminhos.push(p);
  }
  if (!caminhos.length) rec.erro = rec.erro || 'nada foi capturado';

  if (paraMp4) {
    for (let i = 0; i < caminhos.length; i++) {
      const mp4 = await window.vj?.toMp4?.(caminhos[i]).catch(() => null);
      if (mp4) caminhos[i] = mp4;
    }
  }
  rec.ultimos = caminhos;
  return caminhos;
}

export const durMMSS = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

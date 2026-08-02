// ────────────────────────────────────────────
// TALLER VJ APP 0.7 — audio.ts
// § - System audio analysis: bands, beat and tempo · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

/**
 * O áudio do iframe não é legível — mas o som que sai da PLACA é. Capturando o
 * loopback do sistema, a reatividade passa a valer para qualquer fonte, YouTube
 * incluído, sem depender dos pixels nem de arquivo local.
 */
export type Bands = { low: number; mid: number; high: number; rms: number };

export const audio = {
  ativo: false,
  bands: { low: 0, mid: 0, high: 0, rms: 0 } as Bands,
  bpm: 0,
  beat: false,          // true no quadro em que a batida foi detectada
  erro: null as string | null
};

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let stream: MediaStream | null = null;
let raf = 0;
let data: Uint8Array = new Uint8Array(0);

// histórico de energia grave para detectar batida por pico local
const hist: number[] = [];
const beats: number[] = [];
let lastBeat = 0;

export async function startAudio(mic = false): Promise<boolean> {
  await stopAudio();
  try {
    if (mic) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      // loopback do sistema: no Windows o Chromium entrega o áudio junto da tela
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'desktop' } },
        video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 2, maxHeight: 2 } }
      } as unknown as MediaStreamConstraints);
      stream.getVideoTracks().forEach(t => t.stop());   // só queríamos o áudio
    }
    if (!stream.getAudioTracks().length) throw new Error('sem faixa de áudio');

    ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);
    data = new Uint8Array(analyser.frequencyBinCount);
    audio.ativo = true; audio.erro = null;
    loop();
    return true;
  } catch (e) {
    audio.erro = String((e as Error)?.message || e);
    audio.ativo = false;
    return false;
  }
}

export async function stopAudio() {
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach(t => t.stop());
  await ctx?.close().catch(() => { });
  ctx = null; analyser = null; stream = null;
  audio.ativo = false; audio.beat = false;
  audio.bands = { low: 0, mid: 0, high: 0, rms: 0 };
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (!analyser) return;
  analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);

  const n = data.length;
  const media = (a: number, b: number) => {
    let s = 0;
    for (let i = a; i < b; i++) s += data[i];
    return (s / (b - a)) / 255;
  };
  // faixas aproximadas para 44.1kHz com fftSize 1024 (~43Hz por bin)
  const low = media(1, 6), mid = media(6, 60), high = media(60, Math.min(200, n));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / n) / 255;
  audio.bands = { low, mid, high, rms };

  // batida = pico de grave acima da média recente, com refratário de 250ms
  hist.push(low);
  if (hist.length > 60) hist.shift();
  const mediaHist = hist.reduce((a, b) => a + b, 0) / hist.length;
  const agora = performance.now();
  audio.beat = false;
  if (low > mediaHist * 1.35 && low > 0.12 && agora - lastBeat > 250) {
    audio.beat = true; lastBeat = agora;
    beats.push(agora);
    if (beats.length > 12) beats.shift();
    if (beats.length >= 4) {
      const gaps: number[] = [];
      for (let i = 1; i < beats.length; i++) gaps.push(beats[i] - beats[i - 1]);
      gaps.sort((a, b) => a - b);
      const mediana = gaps[Math.floor(gaps.length / 2)];
      const bpm = 60000 / mediana;
      if (bpm > 60 && bpm < 200) audio.bpm = Math.round(bpm);
    }
  }
}

/* ── § 1 — Tap tempo — o caminho manual, sempre disponível ── */
const taps: number[] = [];
export function tap(): number {
  const t = performance.now();
  if (taps.length && t - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(t);
  if (taps.length > 8) taps.shift();
  if (taps.length >= 2) {
    const total = taps[taps.length - 1] - taps[0];
    const bpm = 60000 / (total / (taps.length - 1));
    if (bpm > 40 && bpm < 240) audio.bpm = Math.round(bpm);
  }
  return audio.bpm;
}

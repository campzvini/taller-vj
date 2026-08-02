// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — ytapi.ts
// § - Single readiness promise for the YouTube IFrame API · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

// A API expõe UM callback global. Com vários players na página, cada um registrando
// o seu, o último sobrescreveria os anteriores — daí a promessa compartilhada.
let pending: Promise<void> | null = null;

export function ytReady(): Promise<void> {
  if (pending) return pending;
  pending = new Promise<void>(resolve => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
  });
  return pending;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    vj?: {
      displays(): Promise<unknown>;
      openOutput(): Promise<boolean>;
      setAspect?(ar: string): Promise<boolean>;
      checklist?(): Promise<Record<string, unknown>>;
      saveSession?(data: unknown): Promise<string | null>;
      openSession?(): Promise<{ path: string; data?: unknown; error?: string } | null>;
      ffmpeg?(args: string[]): Promise<{ ok: boolean; out?: string; err?: string }>;
      probe?(file: string): Promise<Record<string, unknown> | null>;
      pickFiles?(): Promise<string[]>;
      pickFolder?(): Promise<{ dir: string; files: string[] } | null>;
      thumb?(file: string, at?: number): Promise<string | null>;
      clip?(o: { file: string; start: number; end: number }): Promise<string | null>;
      toMp4?(src: string): Promise<string | null>;
      sources?(): Promise<{ id: string; name: string; tipo: string }[]>;
      saveRec?(bytes: Uint8Array, ext?: string): Promise<string | null>;
      reveal?(p: string): Promise<boolean>;
    };
  }
}

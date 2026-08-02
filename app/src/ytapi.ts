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
    vj?: { displays(): Promise<unknown>; openOutput(): Promise<boolean> };
  }
}

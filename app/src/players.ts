// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — players.ts
// § - Registry of the controller's local players · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

// Monitores, cue e bed vivem no controlador. Ficam num registro simples porque as
// ações precisam alcançá-los de fora da árvore React.
export const L: {
  monA: YT.Player | null; monB: YT.Player | null;
  cue: YT.Player | null; bed: YT.Player | null;
} = { monA: null, monB: null, cue: null, bed: null };

export const mon = (d: 'A' | 'B') => (d === 'A' ? L.monA : L.monB);

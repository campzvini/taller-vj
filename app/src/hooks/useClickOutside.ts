// ────────────────────────────────────────────
// TALLER VJ APP 0.4 — useClickOutside.ts
// § - Collapsible panels close on any click outside · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, type RefObject } from 'react';

/**
 * Regra geral da interface: todo painel colapsável fecha ao clicar fora dele.
 * Passa-se também o gatilho (o botão que abre) para que o clique nele continue
 * alternando em vez de fechar e reabrir na mesma ação.
 */
export function useClickOutside(
  open: boolean,
  close: () => void,
  refs: RefObject<HTMLElement | null>[]
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refs.some(r => r.current?.contains(t))) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    // captura no documento; mousedown fecha antes de qualquer clique agir
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, refs]);
}

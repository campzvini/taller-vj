// ────────────────────────────────────────────
// TALLER VJ APP 1.1 — Zona.tsx
// § - Collapsible area that still reports what is live inside it · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState, type ReactNode } from 'react';

/**
 * Esconder não é sumir: fechada, a zona continua anunciando o que está ativo lá
 * dentro. Sem isso o operador perde o rastro do que está mexendo sozinho na imagem.
 */
export default function Zona({ id, titulo, resumo, some, children }: {
  id: string;
  titulo: string;
  resumo?: string;             // o que está aceso aqui dentro, visível de fechado
  some?: boolean;              // some no modo palco
  children: ReactNode;
}) {
  const chave = 'vj.zona.' + id;
  const [aberta, setAberta] = useState(localStorage.getItem(chave) !== '0');
  const alternar = () => {
    const v = !aberta;
    setAberta(v); localStorage.setItem(chave, v ? '1' : '0');
  };

  return (
    <div className={'zona' + (resumo ? ' on' : '') + (some ? ' some' : '')}>
      <div className="zhd" onClick={alternar}>
        <span className="seta">{aberta ? '▼' : '▶'}</span>
        <span>{titulo}</span>
        {!!resumo && <span className="resumo">{resumo}</span>}
      </div>
      {aberta && <div className="zbody">{children}</div>}
    </div>
  );
}

// ────────────────────────────────────────────
// TALLER VJ APP 0.8 — Settings.tsx
// § - Configuration: engine, sources, playback, shaders · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useRef } from 'react';
import { useSession } from '../../../store';
import { out } from '../../../out';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { GLFX0 } from '../../../gl/renderer';
import type { Deck } from '../../../types';

const GLFX_LABEL: Record<keyof typeof GLFX0, string> = {
  invert: 'inverter', hue: 'matiz', pixel: 'pixelar', rgb: 'separação RGB',
  melt: 'derreter', glitch: 'glitch', feedback: 'feedback', kaleido: 'caleidoscópio'
};

export default function Settings({ onClose }: { onClose: () => void }) {
  const s = useSession();
  const box = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => onClose(), [onClose]);
  useClickOutside(true, fechar, [box]);

  const trocarEngine = (mode: 'dom' | 'gl') => {
    s.set('engine', mode); s.save(); out.engine(mode);
  };
  const setGlFx = (d: Deck, k: keyof typeof GLFX0, v: number) => {
    const next = { ...s.glfx[d], [k]: v };
    s.set('glfx', { ...s.glfx, [d]: next } as any);
    out.glfx(d, next);
  };

  return (
    <div className="modalbg">
      <div className="modal" ref={box}>
        <div className="row modalhd">
          <b>Configurações</b><div style={{ flex: 1 }} />
          <button onClick={onClose}>fechar</button>
        </div>

        <div className="secao">
          <div className="tag">motor de imagem</div>
          <div className="row">
            <button className={'tgl' + (s.engine === 'dom' ? ' on' : '')}
              onClick={() => trocarEngine('dom')}>DOM / CSS</button>
            <button className={'tgl' + (s.engine === 'gl' ? ' on' : '')}
              onClick={() => trocarEngine('gl')}>WebGL (híbrido)</button>
          </div>
          <p className="nota">
            O WebGL só alcança fontes que expõem quadros — arquivo local, câmera, captura.
            <b> Deck com YouTube continua em DOM</b>, porque o iframe não entrega pixels.
            A mistura entre camadas segue em CSS nos dois modos.
          </p>
        </div>

        {s.engine === 'gl' && (['A', 'B'] as Deck[]).map(d => (
          <div className="secao" key={d}>
            <div className="tag">shaders — deck {d} (só com fonte de arquivo)</div>
            {(Object.keys(GLFX0) as (keyof typeof GLFX0)[]).map(k => (
              <div className="row" key={k}>
                <span className="tag w80">{GLFX_LABEL[k]}</span>
                <input type="range" min={0} max={100} value={Math.round(s.glfx[d][k] * 100)}
                  onChange={e => setGlFx(d, k, +e.target.value / 100)} />
                <span className="val">{Math.round(s.glfx[d][k] * 100)}</span>
              </div>
            ))}
            <div className="row">
              <button className="mk" onClick={() => {
                s.set('glfx', { ...s.glfx, [d]: { ...GLFX0 } } as any);
                out.glfx(d, { ...GLFX0 });
              }}>zerar shaders {d}</button>
            </div>
          </div>
        ))}

        <div className="secao">
          <div className="tag">reprodução</div>
          <div className="row">
            <span className="tag w80">qualidade dos monitores</span>
            <select value={s.monQuality} onChange={e => { s.set('monQuality', e.target.value); s.save(); }}>
              <option value="small">baixa (alivia CPU)</option>
              <option value="medium">média</option>
              <option value="default">automática</option>
            </select>
          </div>
          <div className="row">
            <span className="tag w80">samples no pool</span>
            <input type="number" min={1} max={8} value={s.poolSize} style={{ width: 48 }}
              onChange={e => { s.set('poolSize', Math.max(1, Math.min(8, +e.target.value || 4))); s.save(); }} />
            <span className="nota">mais slots prontos custam banda e memória</span>
          </div>
        </div>

        <div className="secao">
          <div className="tag">sobre</div>
          <p className="nota">
            Ferramenta local, sem transmissão. YouTube é a fonte padrão; arquivo, câmera
            e catálogo próprio são opções que não substituem nada.
          </p>
        </div>
      </div>
    </div>
  );
}

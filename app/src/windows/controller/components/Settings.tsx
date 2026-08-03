// ────────────────────────────────────────────
// TALLER VJ APP 0.8 — Settings.tsx
// § - Configuration: engine, sources, playback, shaders · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useRef } from 'react';
import { useSession } from '../../../store';
import { out } from '../../../out';
import { checklist, pushAll, setPattern } from '../../../actions';
import { exportSession, importSession } from '../../../session';
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

        {/* saiu da barra superior: se muda uma vez antes de começar, mora aqui */}
        <div className="secao">
          <div className="tag">quadro e calibração</div>
          <div className="row">
            <span className="tag w80">formato</span>
            {['16/9', '4/3'].map(a => (
              <button key={a} className={'tgl' + (s.ar === a ? ' on' : '')}
                onClick={() => { s.set('ar', a); s.save(); out.frame(a); }}>{a.replace('/', ':')}</button>
            ))}
          </div>
          <div className="row">
            <span className="tag w80">padrão</span>
            {[['grid', 'grade'], ['bars', 'barras'], ['focus', 'foco']].map(([k, t]) => (
              <button key={k} className={'tgl' + (s.pattern === k ? ' on' : '')}
                onClick={() => setPattern(k)}>{t}</button>
            ))}
            <span className="nota">para acertar foco e enquadramento do projetor</span>
          </div>
        </div>

        <div className="secao">
          <div className="tag">reprodução</div>
          <div className="row">
            <span className="tag w80">ao terminar</span>
            <button className={'tgl' + (s.loop ? ' on' : '')}
              onClick={() => { const on = !s.loop; s.set('loop', on); s.save(); out.loop(on); }}>
              repetir (L)</button>
            <button className={'tgl' + (s.cc ? ' on' : '')}
              onClick={() => { const on = !s.cc; s.set('cc', on); s.save(); out.cc(on); }}>
              legendas (K)</button>
          </div>
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
          <div className="tag">sessão e véspera</div>
          <div className="row">
            <button onClick={exportSession} title="salvar sessão em arquivo">salvar sessão</button>
            <button onClick={() => importSession(pushAll)}>abrir sessão</button>
            <button onClick={checklist} title="o que costuma faltar cinco minutos antes">
              checar tudo</button>
          </div>
          <p className="nota">
            A sessão leva biblioteca, slots, mistura, cenas e rotas — nunca a chave de API.
          </p>
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

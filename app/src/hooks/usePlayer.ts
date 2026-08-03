// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — usePlayer.ts
// § - Imperative wrapper around a YouTube player that never re-renders · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { ytReady } from '../ytapi';

export type PlayerOpts = {
  controls?: boolean;
  muted?: boolean;
  quality?: YT.SuggestedVideoQuality;
  onState?: (state: number) => void;
  onError?: (code: number) => void;
};

// 101 e 150 são o dono do vídeo proibindo embed — acontece em qualquer navegador.
// 2 e 5 apontam para problema nosso (parâmetro ou ambiente).
export const errText = (c: number) =>
  ({ 2: 'parâmetro inválido', 5: 'erro do player HTML5', 100: 'vídeo não existe',
     101: 'embed bloqueado pelo dono', 150: 'embed bloqueado pelo dono' } as Record<number, string>)[c]
  || ('erro ' + c);

/**
 * O iframe do YouTube NÃO pode participar do ciclo de render: recriar o nó destrói
 * o player. Por isso o efeito não tem dependências, o player nasce uma única vez e
 * tudo depois é comandado por método através do ref devolvido aqui.
 */
export function usePlayer(domId: string, opts: PlayerOpts = {}) {
  const ref = useRef<YT.Player | null>(null);
  const cb = useRef(opts.onState);
  cb.current = opts.onState;
  const errCb = useRef(opts.onError);
  errCb.current = opts.onError;

  useEffect(() => {
    let dead = false;
    ytReady().then(() => {
      if (dead) return;
      ref.current = new YT.Player(domId, {
        height: '100%', width: '100%', videoId: '',
        host: 'https://www.youtube.com',
        playerVars: {
          // sem barra, sem teclado, sem tela cheia, sem anotações: o chrome do
          // player não pertence à interface — quem comanda é a nossa barra
          controls: opts.controls ? 1 : 0, disablekb: 1, modestbranding: 1, fs: 0,
          rel: 0, iv_load_policy: 3, playsinline: 1, cc_load_policy: 0,
          // sem origin explícito o player valida a página por conta própria e,
          // em alguns casos, degrada para o botão "assistir no YouTube"
          origin: location.origin,
          widget_referrer: location.origin
        } as YT.PlayerVars,
        events: {
          onReady: e => {
            if (opts.muted) e.target.mute();
            if (opts.quality) e.target.setPlaybackQuality(opts.quality);
            ccOff(e.target);
          },
          onStateChange: e => {
            if (e.data === 1) ccOff(e.target);   // legenda só existe depois do PLAYING
            cb.current?.(e.data);
          },
          onError: e => errCb.current?.(e.data as unknown as number)
        }
      });
    });
    return () => { dead = true; try { ref.current?.destroy(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

export function ccOff(p: YT.Player | null) {
  if (!p) return;
  try { (p as any).setOption('captions', 'track', {}); } catch { /* ignore */ }
  try { ['captions', 'cc'].forEach(m => (p as any).unloadModule(m)); } catch { /* ignore */ }
}

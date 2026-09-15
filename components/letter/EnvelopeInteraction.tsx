'use client';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { envelopeFrame, ENVELOPE_SECONDS } from '@/lib/envelope-motion';
import './envelope-interaction.css';
import {
  EnvelopeBack,
  EnvelopeFront,
  EnvelopeFlap,
  ENVELOPE_ART,
} from './EnvelopeArt';

export function EnvelopeInteraction({
  phase,
  ready,
  onComplete,
  children,
}: {
  phase: 'opening' | 'closing' | null;
  ready: boolean;
  onComplete: () => void;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(phase === 'opening' ? 0 : 1);
  const [previousPhase, setPreviousPhase] = useState(phase);
  if (previousPhase !== phase) {
    setPreviousPhase(phase);
    setProgress(phase === 'opening' ? 0 : 1);
  }
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    if (!phase || !ready) return;
    let request = 0,
      settled: ReturnType<typeof setTimeout> | undefined,
      elapsed = 0,
      last = performance.now();
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 0.5
      : ENVELOPE_SECONDS;
    const tick = (now: number) => {
      if (!document.hidden) elapsed += Math.min((now - last) / 1000, 0.05);
      last = now;
      const amount = Math.min(1, elapsed / duration);
      // A shared stepped timeline makes inward and outward travel exact reverses.
      const step = Math.floor(amount * 84) / 84;
      setProgress(phase === 'opening' ? step : 1 - step);
      if (amount === 1) {
        if (phase === 'closing')
          settled = setTimeout(() => done.current(), 250);
        else done.current();
        return;
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(request);
      clearTimeout(settled);
    };
  }, [phase, ready]);
  const frame = envelopeFrame(phase ? progress : 1);
  const style = {
    '--sheet-scale': frame.scale,
    '--sheet-x': `${Math.round(frame.x * 6) / 6}%`,
    '--sheet-y': `${Math.round(frame.y * 7.6) / 7.6}%`,
    '--envelope-y': `${Math.round(frame.envelopeY * 7.6) / 7.6}%`,
    '--paper-clip': `${frame.clipBottom}%`,
  } as CSSProperties;
  return (
    <div
      className={`letter-stage ${phase ? 'envelope-in-motion' : ''}`}
      style={style}
      data-envelope-direction={phase ?? 'rest'}
      data-envelope-progress={progress.toFixed(3)}
      data-envelope-stage={frame.stage}
    >
      {phase && (
        <svg
          className="physical-envelope envelope-back"
          viewBox={ENVELOPE_ART.viewBox}
          aria-hidden="true"
          shapeRendering="crispEdges"
        >
          <EnvelopeBack />
        </svg>
      )}
      <div className="envelope-paper-window">
        <div className="physical-sheet">{children}</div>
      </div>
      {phase && (
        <>
          <svg
            className="physical-envelope envelope-front"
            viewBox={ENVELOPE_ART.viewBox}
            aria-hidden="true"
            shapeRendering="crispEdges"
          >
            <EnvelopeFront />
          </svg>
          <svg
            className={`physical-envelope physical-flap ${frame.flapBehind ? 'flap-behind' : ''}`}
            viewBox={ENVELOPE_ART.viewBox}
            aria-hidden="true"
            shapeRendering="crispEdges"
          >
            <g transform={`scale(1 ${frame.flapScale})`}>
              <EnvelopeFlap />
            </g>
          </svg>
        </>
      )}
    </div>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { LetterPreview } from './LetterPreview';
import { PaperBackground } from './LetterPreview';
import type { LetterDocument } from '@/lib/letter-document';
export function PageTurn({
  doc,
  from,
  to,
  onComplete,
}: {
  doc: LetterDocument;
  from: number;
  to: number;
  onComplete: () => void;
}) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(
      onComplete,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 560,
    );
    return () => clearTimeout(t);
  }, [ready, onComplete]);
  return (
    <div
      className={`page-turn ${to > from ? 'turn-forward' : 'turn-backward'} ${ready ? 'turn-ready' : ''}`}
      aria-hidden="true"
    >
      <div className="turning-leaf">
        <div className="turn-front">
          <LetterPreview
            doc={doc}
            page={from}
            onPages={ignore}
            onReady={markReady}
          />
        </div>
        <div className="turn-back">
          <PaperBackground />
        </div>
      </div>
    </div>
  );
}
const ignore = () => {};

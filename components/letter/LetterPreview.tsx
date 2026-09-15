'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The canonical letter is drawn on canvas with an adjacent text equivalent. */
import { useEffect, useRef, useState } from 'react';
import { paintPaper, renderLetterCanvas } from '@/lib/letter-renderer';
import type { LetterDocument } from '@/lib/letter-document';
export function PaperBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) paintPaper(canvas.current.getContext('2d')!);
  }, []);
  return (
    <canvas
      className="paper-background"
      ref={canvas}
      width={600}
      height={760}
      aria-hidden="true"
    />
  );
}
export function LetterPreview({
  doc,
  page,
  onPages,
  onReady,
}: {
  doc: LetterDocument;
  page: number;
  onPages: (count: number) => void;
  onReady?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [pageText, setPageText] = useState({
    greeting: '',
    body: '',
    signature: '',
  });
  useEffect(() => {
    let cancelled = false;
    void renderLetterCanvas(doc, page)
      .then((result) => {
        if (cancelled || !canvas.current) return;
        canvas.current.getContext('2d')!.drawImage(result.canvas, 0, 0);
        setError('');
        setPageText(result.text);
        onPages(result.pages);
        onReady?.();
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'The letter could not be rendered. Close and reopen it to try again.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [doc, page, onPages, onReady]);
  return (
    <>
      {/* Canvas is the canonical visual letter; its text equivalent follows. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <canvas
        ref={canvas}
        className="letter-preview"
        width={1200}
        height={1520}
        role="img"
        aria-label={`Letter, page ${page + 1}`}
      />
      <div className="sr-only">
        {pageText.greeting && <p>{pageText.greeting}</p>}
        <p>{pageText.body}</p>
        {pageText.signature && <p>{pageText.signature}</p>}
        <p>
          {doc.objects.filter((o) => (o.page ?? 0) === page).length}{' '}
          decorations;{' '}
          {doc.strokes.filter((s) => (s.page ?? 0) === page).length} ink
          strokes.
        </p>
      </div>
      {error && (
        <p className="render-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

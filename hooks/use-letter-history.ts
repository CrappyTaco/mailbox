'use client';
import { useCallback, useRef, useState } from 'react';
import {
  DocumentHistory,
  newLetterDocument,
  type LetterDocument,
} from '@/lib/letter-document';
export function useLetterHistory(recipient: string) {
  const [initial] = useState(() => newLetterDocument(recipient));
  const history = useRef(new DocumentHistory(initial));
  const [state, render] = useState({
    artwork: initial,
    canUndo: false,
    canRedo: false,
  });
  const sync = useCallback(() => {
    const h = history.current;
    render({
      artwork: h.current,
      canUndo: !!h.past.length,
      canRedo: !!h.future.length,
    });
  }, []);
  const setArtwork = useCallback(
    (next: LetterDocument) => {
      history.current!.change(next);
      sync();
    },
    [sync],
  );
  const beginEdit = useCallback(() => {
    history.current!.begin();
  }, []);
  const endEdit = useCallback(() => {
    history.current!.end();
    sync();
  }, [sync]);
  const undo = useCallback(() => {
    history.current!.undo();
    sync();
  }, [sync]);
  const redo = useCallback(() => {
    history.current!.redo();
    sync();
  }, [sync]);
  const resetArt = useCallback(() => {
    history.current!.reset(newLetterDocument(recipient));
    sync();
  }, [recipient, sync]);
  return { ...state, setArtwork, beginEdit, endEdit, undo, redo, resetArt };
}

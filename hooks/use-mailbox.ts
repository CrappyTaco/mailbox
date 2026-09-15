'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Letter, MailboxSnapshot, Owner } from '@/lib/mailbox-state';
import { receivedLetter, displayName, otherOwner } from '@/lib/mailbox-state';
import {
  isSigned,
  hasPlacedStamp,
  type LetterDocument,
} from '@/lib/letter-document';
import { useLetterHistory } from './use-letter-history';
export type Phase =
  | 'loading'
  | 'idle'
  | 'opening'
  | 'closing'
  | 'stowing'
  | 'reading'
  | 'writing'
  | 'saving'
  | 'sealing'
  | 'sending'
  | 'delivered';
const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request<T>(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const options: RequestInit = {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  };
  if (method !== 'GET' && body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error ?? 'Our worlds are having trouble connecting.',
    );
  return data;
}
export function useMailbox(owner: Owner) {
  const base = '/api/' + owner;
  const [phase, setPhase] = useState<Phase>('loading');
  const [snapshot, setSnapshot] = useState<MailboxSnapshot | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);
  const editor = useLetterHistory(displayName(otherOwner(owner)));
  const { artwork, setArtwork } = editor;
  const draft = artwork.text.body.text;
  const setDraft = (text: string) =>
    setArtwork({
      ...artwork,
      text: { ...artwork.text, body: { ...artwork.text.body, text } },
    });
  const [error, setError] = useState('');
  const [connectionLost, setConnectionLost] = useState(false);
  const [connectionRetrying, setConnectionRetrying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [arrival, setArrival] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const deliveryDone = useRef<(() => void) | null>(null);
  const sealDone = useRef<(() => void) | null>(null);
  const composeAfterClosing = useRef(false);
  const finishDelivery = useCallback(() => deliveryDone.current?.(), []);
  const phaseRef = useRef<Phase>('loading');
  const snapshotRef = useRef<MailboxSnapshot | null>(null);
  const epoch = useRef(0);
  const fetching = useRef(false);
  const connectionFailures = useRef(0);
  const retryAt = useRef(0);
  const alive = useRef(true);
  const replyTo = useRef<string | null>(null);
  const pending = useRef<{
    body: string;
    reply_to: string | null;
    client_id: string;
    artwork: LetterDocument;
  } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const update = useCallback(
    (next: MailboxSnapshot) => {
      if (
        next.latest?.recipient === owner &&
        !next.latest.read_at &&
        next.latest.id !== snapshotRef.current?.latest?.id
      ) {
        setArrival(true);
        timers.current.push(setTimeout(() => setArrival(false), 2200));
      }
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [owner],
  );
  const refresh = useCallback(
    async (automatic = false) => {
      if (
        fetching.current ||
        (automatic && Date.now() < retryAt.current) ||
        [
          'saving',
          'sealing',
          'sending',
          'opening',
          'closing',
          'stowing',
        ].includes(phaseRef.current)
      )
        return;
      fetching.current = true;
      setConnectionRetrying(true);
      const version = epoch.current;
      try {
        const data = await request<MailboxSnapshot>(base + '/letters');
        if (!alive.current || version !== epoch.current) return;
        update(data);
        connectionFailures.current = 0;
        retryAt.current = 0;
        setConnectionLost(false);
        if (phaseRef.current === 'loading') changePhase('idle');
      } catch {
        if (!alive.current || version !== epoch.current) return;
        connectionFailures.current++;
        // Give a brief interruption one retry before showing a failure. Keep the
        // last valid snapshot and back off during outages; manual retries bypass it.
        retryAt.current =
          Date.now() +
          Math.min(
            60000,
            4000 * 2 ** Math.min(connectionFailures.current - 1, 4),
          );
        setConnectionLost(connectionFailures.current >= 2);
      } finally {
        fetching.current = false;
        if (alive.current) setConnectionRetrying(false);
      }
    },
    [base, changePhase, update],
  );
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => void refresh());
    const pendingTimers = timers.current;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        void refresh(true);
    }, 4000);
    const resume = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      alive.current = false;
      clearInterval(tick);
      pendingTimers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [refresh]);
  useEffect(() => {
    if (
      !draft.trim() &&
      !artwork.strokes.length &&
      !artwork.objects.length &&
      !artwork.text.signature.text &&
      artwork.text.greeting.text ===
        `Dear ${displayName(otherOwner(owner))},` &&
      phase !== 'sending'
    )
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, artwork, phase, owner]);
  const markRead = async (target: Letter) => {
    setBusy(true);
    setError('');
    try {
      epoch.current++;
      const read = await request<Letter>(base + '/letters/read', 'POST', {
        id: target.id,
      });
      if (!alive.current) return;
      setLetter(read);
      const current = snapshotRef.current;
      if (current)
        update({
          ...current,
          latest: current.latest?.id === read.id ? read : current.latest,
          received: read,
        });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not mark your letter opened. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  const open = () => {
    const target = receivedLetter(owner, snapshotRef.current);
    if (!target || target.recipient !== owner || phaseRef.current !== 'idle')
      return;
    setLetter(target);
    setError('');
    changePhase('opening');
  };
  const compose = () => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'reading') return;
    const current = snapshotRef.current?.latest;
    if (current && (current.sender === owner || !current.read_at)) return;
    replyTo.current = current?.id ?? null;
    setError('');
    if (phaseRef.current === 'reading') {
      composeAfterClosing.current = true;
      changePhase('closing');
      return;
    }
    changePhase('writing');
  };
  const close = () => {
    if (!['writing', 'reading'].includes(phaseRef.current)) return;
    editor.endEdit();
    setError('');
    changePhase(phaseRef.current === 'writing' ? 'stowing' : 'closing');
  };
  const finishPaper = () => {
    if (phaseRef.current === 'sealing') {
      sealDone.current?.();
      return;
    }
    if (phaseRef.current === 'opening') {
      changePhase('reading');
      if (letter && !letter.read_at) void markRead(letter);
      return;
    }
    if (phaseRef.current === 'closing' || phaseRef.current === 'stowing') {
      const composeNext = composeAfterClosing.current;
      composeAfterClosing.current = false;
      changePhase(composeNext ? 'writing' : 'idle');
      if (!composeNext) void refresh();
    }
  };
  const send = async () => {
    const body = draft.trim();
    if (!body || phaseRef.current !== 'writing' || busy) return;
    if (!isSigned(artwork)) {
      setError('Type or draw your signature near the bottom of the paper.');
      return;
    }
    if (!hasPlacedStamp(artwork)) {
      setError('Place a postage stamp on your letter before sending.');
      return;
    }
    if (body.length > 20000) {
      setError('Please keep your letter under 20,000 characters.');
      return;
    }
    const target = replyTo.current;
    if (
      !pending.current ||
      pending.current.body !== body ||
      pending.current.reply_to !== target ||
      JSON.stringify(pending.current.artwork) !== JSON.stringify(artwork)
    )
      pending.current = {
        body,
        reply_to: target,
        client_id: crypto.randomUUID(),
        artwork,
      };
    const payload = pending.current;
    setError('');
    setBusy(true);
    setDeliveryConfirmed(false);
    changePhase('saving');
    epoch.current++;
    try {
      const sent = await request<Letter>(base + '/letters', 'POST', payload);
      if (!alive.current) return;
      setDeliveryConfirmed(true);
      const sealed = new Promise<void>((resolve) => {
        sealDone.current = resolve;
      });
      changePhase('sealing');
      await sealed;
      if (!alive.current) return;
      const animationDone = new Promise<void>((resolve) => {
        deliveryDone.current = resolve;
      });
      changePhase('sending');
      await animationDone;
      if (!alive.current) return;
      const current = snapshotRef.current;
      update({
        latest: sent,
        last_incoming_at: current?.last_incoming_at ?? null,
        established_at: current?.established_at ?? sent.created_at,
        received: receivedLetter(owner, current),
      });
      editor.resetArt();
      pending.current = null;
      changePhase('delivered');
      await pause(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 600
          : 700,
      );
      if (alive.current) {
        changePhase('idle');
        void refresh();
      }
    } catch (cause) {
      if (!alive.current) return;
      changePhase('writing');
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'The letter got a little lost… your words are safe here. Try sending again.',
      );
    } finally {
      deliveryDone.current = null;
      sealDone.current = null;
      setBusy(false);
    }
  };
  return {
    phase,
    snapshot,
    letter,
    draft,
    setDraft,
    artwork,
    setArtwork,
    beginEdit: editor.beginEdit,
    endEdit: editor.endEdit,
    undo: editor.undo,
    redo: editor.redo,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    error,
    connectionLost,
    connectionRetrying,
    busy,
    arrival,
    deliveryConfirmed,
    finishDelivery,
    finishPaper,
    open,
    compose,
    close,
    send,
    retryRead: () => letter && markRead(letter),
    refresh,
  };
}

'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { HoldRepeat } from '@/lib/hold-repeat';
export function HoldButton({
  label,
  disabled,
  selection,
  onStep,
  onBegin,
  onEnd,
  children,
}: {
  label: string;
  disabled: boolean;
  selection: string;
  onStep: () => void;
  onBegin: () => void;
  onEnd: () => void;
  children: ReactNode;
}) {
  const handled = useRef(false);
  const [repeat] = useState(
    () =>
      new HoldRepeat(
        () => {},
        () => {},
        () => {},
      ),
  );
  useEffect(
    () => repeat.configure(onStep, onBegin, onEnd),
    [repeat, onStep, onBegin, onEnd],
  );
  const stop = useCallback(() => repeat.stop(), [repeat]);
  useEffect(() => {
    const end = () => stop();
    window.addEventListener('blur', end);
    document.addEventListener('visibilitychange', end);
    return () => {
      stop();
      window.removeEventListener('blur', end);
      document.removeEventListener('visibilitychange', end);
    };
  }, [selection, disabled, stop]);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (e.button !== 0 || !e.isPrimary || disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        handled.current = true;
        repeat.start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onPointerLeave={stop}
      onBlur={stop}
      onClick={(event) => {
        if (handled.current && event.detail > 0) {
          handled.current = false;
          return;
        }
        repeat.start();
        repeat.stop();
      }}
      onKeyDown={(e) => {
        if (e.repeat && (e.key === ' ' || e.key === 'Enter'))
          e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

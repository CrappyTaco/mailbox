'use client';
import { useEffect, useRef, useState } from 'react';

// Visit every authored sprite frame in order, including when reversing midway.
export function useSpriteMotion(target: boolean, duration = 560) {
  const [value, setValue] = useState(Number(target));
  const current = useRef(value);
  useEffect(() => {
    const from = current.current,
      to = Number(target);
    if (from === to) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let request = 0,
      start: number | undefined,
      last = -1;
    const frame = (now: number) => {
      start ??= now;
      const t = reduced ? 1 : Math.min(1, (now - start) / duration);
      const step = Math.floor(t * 8) / 8;
      if (step !== last) {
        last = step;
        current.current = from + (to - from) * step;
        setValue(current.current);
      }
      if (t < 1) request = requestAnimationFrame(frame);
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [target, duration]);
  return value;
}

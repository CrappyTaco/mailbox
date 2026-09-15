'use client';
import './delivery.css';
import { useEffect, useRef, useState } from 'react';
import type { Owner } from '../../lib/mailbox-state';
import { deliveryFrame } from '../../lib/delivery';
import { DeliveryScene } from './DeliveryScene';
export function DeliveryAnimation({
  recipient,
  confirmed,
  hour,
  onComplete,
}: {
  recipient: Owner;
  confirmed: boolean;
  hour: number;
  onComplete: () => void;
}) {
  const [frame, setFrame] = useState(() => deliveryFrame(0, null));
  const confirmedRef = useRef(confirmed),
    completeRef = useRef(onComplete);
  useEffect(() => {
    confirmedRef.current = confirmed;
    completeRef.current = onComplete;
  }, [confirmed, onComplete]);
  useEffect(() => {
    let request = 0,
      elapsed = 0,
      last = performance.now(),
      confirmedAt: number | null = null,
      finished = false;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const tick = (now: number) => {
      // Pause while hidden. A restored page continues the journey, never skips it.
      if (!document.hidden)
        elapsed += Math.min((now - last) / 1000, 0.08) * (reduced ? 6 : 1);
      last = now;
      if (confirmedRef.current && confirmedAt === null) confirmedAt = elapsed;
      const next = deliveryFrame(elapsed, confirmedAt);
      setFrame(next);
      if (next.phase === 'complete') {
        if (!finished) {
          finished = true;
          completeRef.current();
        }
        return;
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, []);
  return <DeliveryScene frame={frame} recipient={recipient} hour={hour} />;
}

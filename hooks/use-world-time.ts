'use client';
import { useEffect, useState } from 'react';
export function useWorldTime(initialTime: number, previewTime?: number) {
  const [instant, setInstant] = useState(previewTime ?? initialTime);
  useEffect(() => {
    if (previewTime !== undefined) return;
    const update = () => {
      if (!document.hidden) setInstant(Date.now());
    };
    // Refresh immediately after hydration, then once every ten seconds. CSS bridges samples.
    queueMicrotask(update);
    const timer = setInterval(update, 10000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [previewTime]);
  return instant;
}

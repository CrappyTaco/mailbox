// Local review only. Uses the production Mailbox and motion hook without APIs.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Mailbox } from '../components/mailbox/Mailbox';
import { DeliveryScene } from '../components/letter/DeliveryScene';
import { deliveryFrame } from '../lib/delivery';

function JourneyReview() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recipient, setRecipient] = useState<'indi' | 'auggie'>('indi');
  const [night, setNight] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setTime((previous) => (previous + 0.05) % 10),
      100,
    );
    return () => clearInterval(timer);
  }, [playing]);
  return (
    <>
      <section className="controls">
        <button onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause journey' : 'Play slowly'}
        </button>
        <label>
          Delivery time{' '}
          <input
            type="range"
            min="0"
            max="10"
            step="0.05"
            value={time}
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
          />
        </label>
        <output>
          {time.toFixed(2)}s · {deliveryFrame(time, 0).phase}
        </output>
        <label>
          Recipient{' '}
          <select
            value={recipient}
            onChange={(event) =>
              setRecipient(event.target.value as 'indi' | 'auggie')
            }
          >
            <option value="indi">Bangkok</option>
            <option value="auggie">Seattle</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={night}
            onChange={(event) => setNight(event.target.checked)}
          />
          Night
        </label>
      </section>
      <div
        className="journey-review"
        style={{ '--reference-night': Number(night) } as React.CSSProperties}
      >
        <DeliveryScene
          frame={deliveryFrame(time, 0)}
          recipient={recipient}
          hour={night ? 0 : 12}
        />
      </div>
    </>
  );
}

function Review() {
  const [open, setOpen] = useState(false);
  const [flag, setFlag] = useState(true);
  const [flagVisible, setFlagVisible] = useState(true);
  const [letter, setLetter] = useState(true);
  const [pose, setPose] = useState<number>();
  const [scale, setScale] = useState(1);
  const [seen, setSeen] = useState<number[]>([0]);
  const [loop, setLoop] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const reversal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const element = art.current!;
    const observer = new MutationObserver(() => {
      const value = element
        .querySelector('.mailbox-hinged-door')
        ?.getAttribute('data-door-frame');
      if (value === undefined || value === null) return;
      setSeen((previous) =>
        previous.at(-1) === Number(value)
          ? previous
          : [...previous.slice(-23), Number(value)],
      );
    });
    observer.observe(element, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-door-frame'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(reversal.current);
    };
  }, []);
  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(() => setOpen((previous) => !previous), 1200);
    return () => clearInterval(timer);
  }, [loop]);
  function animate(next: boolean) {
    clearTimeout(reversal.current);
    setLoop(false);
    setPose(undefined);
    setSeen([
      Number(
        art.current
          ?.querySelector('.mailbox-hinged-door')
          ?.getAttribute('data-door-frame'),
      ),
    ]);
    setOpen(next);
  }
  return (
    <>
      <section className="controls">
        <button onClick={() => animate(true)}>Open door</button>
        <button onClick={() => animate(false)}>Close door</button>
        <button
          onClick={() => {
            setPose(undefined);
            setLoop((previous) => !previous);
          }}
        >
          {loop ? 'Stop loop' : 'Loop motion'}
        </button>
        <button
          onClick={() => {
            animate(true);
            reversal.current = setTimeout(() => setOpen(false), 225);
          }}
        >
          Reverse after 225 ms
        </button>
        <label>
          <input
            type="checkbox"
            checked={flag}
            onChange={(event) => setFlag(event.target.checked)}
          />{' '}
          Flag raised
        </label>
        <label>
          <input
            type="checkbox"
            checked={flagVisible}
            onChange={(event) => setFlagVisible(event.target.checked)}
          />{' '}
          Flag visible
        </label>
        <label>
          <input
            type="checkbox"
            checked={letter}
            onChange={(event) => setLetter(event.target.checked)}
          />{' '}
          Stored letter
        </label>
        <label>
          Display scale{' '}
          <select
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
          >
            <option value={1}>Native (224 × 308)</option>
            <option value={720 / 880}>Desktop (720 px world height)</option>
            <option value={0.625}>Smaller (140 × 192.5)</option>
          </select>
        </label>
      </section>
      <section className="controls" aria-label="Static door positions">
        {[0, 0.1, 0.25, 0.375, 0.5, 0.625, 0.75, 0.9, 1].map((value) => (
          <button
            key={value}
            onClick={() => {
              setLoop(false);
              setPose(value);
            }}
          >
            {value * 100}%
          </button>
        ))}
      </section>
      <p>
        Presented door frames: <output>{seen.join(' → ')}</output>
      </p>
      <div
        className="motion-art"
        ref={art}
        style={{
          width: 224 * scale,
          height: 308 * scale,
          marginLeft: 64 * scale,
        }}
      >
        <Mailbox
          mail={flag}
          door={open ? 'open' : 'closed'}
          doorProgress={pose}
          flagVisible={flagVisible}
          showLetter={letter}
        />
      </div>
    </>
  );
}

const root = document.getElementById('motion-review')!;
createRoot(root).render(root.dataset.journey ? <JourneyReview /> : <Review />);

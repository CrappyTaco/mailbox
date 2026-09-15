'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AmbientDirector, type ActorSample } from '@/lib/animals/director';
import {
  animals,
  frameFor,
  reactionSymbol,
  type AnimalDevOptions,
  type AnimalId,
} from '@/lib/animals/config';
import type { Phase } from '@/hooks/use-mailbox';

interface Props {
  phase: Phase;
  arrival: boolean;
  dev?: AnimalDevOptions;
}
interface Dimensions {
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
}
interface AnimalScene {
  event: string;
  samples: (ActorSample & { time: number; target: number; symbol: string })[];
}
function snapshot(engine: AmbientDirector, reduced: boolean): AnimalScene {
  return {
    event: engine.visit?.event ?? 'quiet',
    samples: engine.samples(reduced).map((s) => ({
      ...s,
      time: engine.reaction[s.id]?.elapsed ?? engine.visit?.elapsed ?? 0,
      target: engine.visit?.cast.find((c) => c.id === s.id)?.target ?? 0.5,
      symbol: engine.reaction[s.id]
        ? reactionSymbol(s.id, s.pose)
        : s.id === 'noddle' && s.pose === 'puff'
          ? '⌁'
          : '',
    })),
  };
}
const initialDimensions: Dimensions = {
  width: 1000,
  height: 800,
  boxWidth: 330,
  boxHeight: 395,
};
export function AnimalWorld({ phase, arrival, dev = {} }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const director = useRef<AmbientDirector | null>(null);
  const current = useRef({ phase, arrival });
  const [dimensions, setDimensions] = useState(initialDimensions);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [animalScene, setAnimalScene] = useState<AnimalScene>({
    event: 'quiet',
    samples: [],
  });
  // Props are consumed by the single director timer rather than spawning per-animal timers.
  useEffect(() => {
    current.current = { phase, arrival };
  }, [phase, arrival]);
  useEffect(() => {
    const scene = root.current?.parentElement;
    if (!scene) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const rect = scene.getBoundingClientRect();
      const box = scene.querySelector('.mailbox-hit')?.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
        boxWidth: box?.width ?? 330,
        boxHeight: box?.height ?? 395,
      });
    };
    const measure = new ResizeObserver(resize);
    measure.observe(scene);
    resize();
    const setMotion = () => setReduced(motion.matches || !!dev.reduced);
    setMotion();
    motion.addEventListener('change', setMotion);
    const engine = new AmbientDirector(Math.random, scene.clientWidth < 500);
    director.current = engine;
    let forced = false,
      lastArrival = false,
      lastPhase: Phase = 'loading',
      previous = performance.now();
    const visible = () => {
      previous = performance.now();
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(() => {
      const now = performance.now(),
        delta = Math.min(250, now - previous);
      previous = now;
      if (document.hidden) return;
      const hadVisit = !!engine.visit;
      const props = current.current;
      if (props.arrival && !lastArrival) engine.arrival();
      lastArrival = props.arrival;
      if (props.phase !== 'idle') {
        if (lastPhase === 'idle') engine.dismiss();
        if (engine.dismissed) engine.advance(delta);
        // Loading, auth and stationery never host an animal interaction.
        if (['locked', 'loading', 'reading', 'writing'].includes(props.phase))
          engine.clear();
      } else {
        if (dev.event && !forced) {
          engine.force(dev.event);
          forced = true;
        }
        engine.advance(delta * (dev.speed ?? 1));
      }
      lastPhase = props.phase;
      if (hadVisit || engine.visit)
        setAnimalScene(snapshot(engine, motion.matches || !!dev.reduced));
    }, 125);
    return () => {
      clearInterval(timer);
      measure.disconnect();
      motion.removeEventListener('change', setMotion);
      document.removeEventListener('visibilitychange', visible);
      director.current = null;
    };
  }, [dev.event, dev.reduced, dev.speed]);
  const samples = animalScene.samples;
  const enabled = phase === 'idle' && !hidden;
  const react = (id: AnimalId) => {
    const engine = director.current;
    if (engine) {
      engine.react(id, dev.reaction);
      setAnimalScene(snapshot(engine, reduced));
    }
  };
  const { width, height, boxWidth, boxHeight } = dimensions;
  const base = height * 0.77 - (boxHeight * 7) / 134;
  const roofY = height * 0.77 - boxHeight * (1 - 19 / 134);
  return (
    <div
      ref={root}
      className={`animal-world ${hidden ? 'animals-paused' : ''}`}
      data-animal-event={animalScene.event}
    >
      {samples.map((sample) => {
        const character = animals[sample.id],
          size = 80;
        let x = sample.x * width;
        if (sample.roof) {
          const target =
            width / 2 + boxWidth * (sample.id === 'nibbler' ? -0.035 : 0.15);
          x +=
            (target - sample.target * width) *
            (1 - Math.min(1, sample.height / 100));
        }
        const ground =
          base +
          14 +
          Math.pow((x - width / 2) / (width / 2), 2) *
            Math.min(75, height * 0.085) +
          sample.lane * 10;
        const flightBase =
          animalScene.event === 'bird-flyby' ? roofY + 100 : ground;
        const y = (sample.roof ? roofY : flightBase) - sample.height;
        const time = sample.time;
        const frame = frameFor(sample.pose, time, sample.id, reduced);
        const birdHop =
          !reduced && character.bird && sample.pose === 'surprise'
            ? [0, 4, 0, 4, 0][Math.floor(time / 180) % 5]
            : 0;
        const hop =
          birdHop ||
          (!reduced &&
          !character.bird &&
          ['hop', 'surprise'].includes(sample.pose) &&
          frame === 6
            ? 5
            : 0);
        const symbol = sample.symbol;
        // Birds on the roof stay above the flag. Ground visitors can cross behind the post.
        const nearPost = Math.abs(x - (width / 2 + boxWidth * 0.015)) < 35;
        // The mailbox button also includes transparent space beside its post.
        // Visitors in that space must remain tappable; only the post occludes them.
        const z = sample.roof ? 4 : nearPost || sample.elevated ? 1 : 3;
        const opacity = [
          'locked',
          'loading',
          'reading',
          'writing',
          'delivered',
        ].includes(phase)
          ? 0
          : sample.opacity;
        return (
          <div
            key={sample.id}
            className={`animal-actor ${character.bird ? 'bird-actor' : 'rabbit-actor'}`}
            data-animal={sample.id}
            data-pose={sample.pose}
            style={
              {
                left: Math.round(x - size / 2),
                top: Math.round(y - 72 - hop),
                width: size,
                height: size,
                zIndex: z,
                opacity,
              } as CSSProperties
            }
          >
            <i
              aria-hidden="true"
              className="animal-shadow"
              style={{
                opacity: sample.elevated ? 0 : 0.3,
                scale: hop ? '.7' : '1',
              }}
            />
            <button
              type="button"
              className="animal-touch"
              aria-label={`Greet ${character.name}`}
              disabled={
                !enabled ||
                opacity === 0 ||
                sample.elevated ||
                (nearPost && !sample.roof)
              }
              onClick={(event) => {
                event.stopPropagation();
                react(sample.id);
              }}
            >
              <span
                aria-hidden="true"
                className="animal-sprite"
                style={{
                  backgroundImage: `url('/animals/${sample.id}.png')`,
                  backgroundPosition: `${-frame * size}px 0`,
                  transform: `scaleX(${sample.facing})`,
                }}
              />
            </button>
            {symbol && (
              <span className="animal-symbol" aria-hidden="true">
                {symbol}
              </span>
            )}
            {!character.bird && !sample.roof && (
              <i className="animal-grass" aria-hidden="true" />
            )}
            {character.bird && sample.pose === 'peck' && (
              <i className="animal-seed" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

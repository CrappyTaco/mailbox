'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import './world-time.css';
import './world-style.css';
import './world-redesign.css';
import { worldMaterials } from '@/lib/world-materials';
import { ReferenceLandscape, ReferenceWordmark } from './ReferenceArt';
import { useWorldTime } from '@/hooks/use-world-time';
import {
  ENABLE_WORLD_CHARACTERS,
  CLOCK_INK,
  clockPaper,
  gradeColor,
  mixColor,
  localTime,
  skyPalette,
} from '@/lib/world-time';
import { WORLD_INKS } from '@/lib/world-inks';
import { WorldClock, WorldSky } from './WorldSky';
import {
  displayName,
  getMailboxState,
  mailboxPresentation,
  receivedLetter,
  otherOwner,
  type Owner,
} from '@/lib/mailbox-state';
import { AnimalWorld } from '../animals/AnimalWorld';
import type { AnimalDevOptions } from '@/lib/animals/config';
import { useMailbox } from '@/hooks/use-mailbox';
import { PixelHeart } from './PixelArt';
import { Mailbox } from '../mailbox/Mailbox';
import { Stationery, type StationeryMode } from '../letter/Stationery';
import { DeliveryAnimation } from '../letter/DeliveryAnimation';
export function MailboxWorld({
  owner,
  animalDev = {},
  initialTime,
  previewTime,
  mailboxPose,
}: {
  owner: Owner;
  animalDev?: AnimalDevOptions;
  initialTime: number;
  previewTime?: number;
  /** Local visual review only; never changes letters or mailbox state. */
  mailboxPose?: 'open' | 'closed';
}) {
  const [emptyNotice, setEmptyNotice] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const retrievalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (retrievalTimer.current) clearTimeout(retrievalTimer.current);
    },
    [],
  );
  const box = useMailbox(owner);
  const instant = useWorldTime(initialTime, previewTime);
  const hour = localTime(owner, instant).hour;
  const lighting = useMemo(() => {
    const palette = skyPalette(hour);
    const paint = (brightness: number) =>
      Object.fromEntries(
        WORLD_INKS.map((ink) => [
          `--paint-${ink.slice(1)}`,
          gradeColor(ink, brightness, palette.warm, palette.night),
        ]),
      ) as CSSProperties;
    return {
      palette,
      ground: paint(palette.ground),
      mailbox: paint(palette.mailbox),
      style: {
        ...worldMaterials(palette.night, palette.warm),
        '--reference-night': Math.min(1, palette.night / 0.7),
        '--reference-day-brightness':
          1 + (1 - Math.min(1, palette.night / 0.7)) * 0.48,
        '--reference-cloud-brightness':
          1 + (1 - Math.min(1, palette.night / 0.7)) * 0.8,
        '--reference-cloud-sepia': (1 - Math.min(1, palette.night / 0.7)) * 0.3,
        '--sky-top': mixColor(
          palette.sky,
          '#20395a',
          Math.min(1, palette.night / 0.7),
        ),
        '--sky-horizon': mixColor(
          palette.horizon,
          '#254368',
          Math.min(1, palette.night / 0.7),
        ),
        '--cloud': palette.cloud,
        '--cloud-light': mixColor('#f7efd9', '#64768a', palette.night),
        '--cloud-shade': mixColor('#c5dce0', '#425c76', palette.night),
        '--cloud-outline': mixColor('#475169', '#1c2a3e', palette.night),
        '--distant': palette.distant,
        '--world-ui': palette.ui,
        '--sprite-light': palette.mailbox,
        '--ground-light': palette.ground,
        '--sprite-saturation': 1 - palette.night * 0.24,
        '--plaque-paper': gradeColor(
          '#ffefd7',
          palette.mailbox,
          palette.warm,
          palette.night,
        ),
        '--plaque-edge': gradeColor(
          '#cfaa86',
          palette.mailbox,
          palette.warm,
          palette.night,
        ),
        '--plaque-ink': gradeColor('#684b50', 1, palette.warm, palette.night),
        '--clock-paper': clockPaper(palette.night),
        '--clock-ink': CLOCK_INK,
        '--clock-ground': gradeColor(
          '#6f7e60',
          palette.ground,
          palette.warm,
          palette.night,
        ),
      } as CSSProperties,
    };
  }, [hour]);
  const loading = box.phase === 'loading';
  const state = box.snapshot
    ? getMailboxState(owner, box.snapshot)
    : { state: 'empty-fresh' as const, age: 0 as const };
  const incoming = !!receivedLetter(owner, box.snapshot);
  const presentation = mailboxPresentation(state.state);
  const stationeryMode: StationeryMode = [
    'opening',
    'reading',
    'writing',
    'saving',
    'closing',
    'stowing',
    'sealing',
  ].includes(box.phase)
    ? (box.phase as StationeryMode)
    : null;
  const delivering = box.phase === 'sending' || box.phase === 'delivered';
  const activate = () => {
    if (loading) return;
    if (incoming && !retrieving) {
      setRetrieving(true);
      retrievalTimer.current = setTimeout(
        () => {
          box.open();
          setRetrieving(false);
          retrievalTimer.current = null;
        },
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 1050,
      );
    } else if (state.state !== 'waiting') box.compose();
    else setEmptyNotice(true);
  };
  return (
    <main
      className={`our-world ${owner} ${box.arrival ? 'mail-arriving' : ''} ${box.connectionLost ? 'connection-lost' : ''}`}
      style={lighting.style}
    >
      <header className="world-header">
        <div className="wordmark reference-wordmark">
          <span className="sr-only">Our Mailbox</span>
          <ReferenceWordmark />
        </div>
      </header>
      <section
        className="world-surface"
        aria-label={`${displayName(owner)}’s little world`}
      >
        <div
          className={`world-scene ${delivering ? 'world-delivering' : ''} ${box.phase === 'delivered' ? 'world-delivered' : ''}`}
        >
          <div className="reference-stage">
            <ReferenceLandscape />
            <WorldSky hour={hour} night={lighting.palette.night} />
            {ENABLE_WORLD_CHARACTERS && (
              <AnimalWorld
                phase={box.phase}
                arrival={box.arrival}
                dev={animalDev}
              />
            )}
            <div
              className="ambient-pixels reference-ambient"
              aria-hidden="true"
            >
              {Array.from({ length: 3 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      left: `${12 + ((i * 19) % 77)}%`,
                      top: `${72 + i * 2}%`,
                      '--delay': `${-i * 1.7}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <button
              className="mailbox-hit"
              style={lighting.mailbox}
              aria-label={
                loading
                  ? `Loading ${displayName(owner)}’s mailbox`
                  : incoming
                    ? 'Open your letter'
                    : state.state === 'waiting'
                      ? 'Your mailbox is waiting for a reply'
                      : 'Write the first letter'
              }
              onClick={activate}
              disabled={loading || !!stationeryMode || delivering || retrieving}
            >
              <Mailbox
                doorProgress={
                  mailboxPose ? (mailboxPose === 'open' ? 1 : 0) : undefined
                }
                mail={!delivering && presentation.flag && !loading}
                door={
                  mailboxPose ??
                  (delivering || loading ? 'closed' : presentation.door)
                }
                showLetter={
                  !delivering &&
                  (presentation.envelope ||
                    retrieving ||
                    box.phase === 'opening') &&
                  !loading
                }
                open={retrieving || box.phase === 'opening'}
                retrieving={retrieving || box.phase === 'opening'}
                age={state.age}
              />
            </button>
          </div>
          {emptyNotice &&
            state.state === 'waiting' &&
            !loading &&
            !delivering && (
              <output className="mailbox-status">No mail right now.</output>
            )}
          {!loading && !incoming && state.state !== 'waiting' && (
            <div className="mailbox-status" aria-live="polite">
              <button
                type="button"
                className="text-action"
                onClick={box.compose}
                disabled={box.phase !== 'idle'}
              >
                {box.draft
                  ? 'keep writing your letter'
                  : 'write the first letter'}{' '}
                <PixelHeart />
              </button>
            </div>
          )}
          {box.connectionLost && (
            <output className="connection-message">
              Our worlds are having trouble connecting.{' '}
              <button onClick={() => void box.refresh()}>try again</button>
            </output>
          )}
          {!loading && box.error && box.phase === 'idle' && (
            <p className="connection-message" role="alert">
              {box.error}
            </p>
          )}
          {box.arrival && !loading && (
            <div className="arrival-burst" aria-hidden="true">
              {Array.from({ length: 3 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
          )}
          {delivering && (
            <DeliveryAnimation
              recipient={otherOwner(owner)}
              confirmed={box.deliveryConfirmed}
              onComplete={box.finishDelivery}
              hour={hour}
            />
          )}
        </div>
      </section>
      <WorldClock instant={instant} />
      <Stationery
        owner={owner}
        mode={stationeryMode}
        letter={box.letter}
        artwork={box.artwork}
        setArtwork={box.setArtwork}
        beginEdit={box.beginEdit}
        endEdit={box.endEdit}
        undo={box.undo}
        redo={box.redo}
        canUndo={box.canUndo}
        canRedo={box.canRedo}
        canReply={state.state !== 'waiting'}
        error={box.error}
        busy={box.busy}
        onClose={box.close}
        onReply={box.compose}
        onSend={() => void box.send()}
        onRetryRead={() => void box.retryRead()}
        onPaperComplete={box.finishPaper}
      />
    </main>
  );
}

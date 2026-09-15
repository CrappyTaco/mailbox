import { useId, type CSSProperties } from 'react';
import { MAILBOX_ART, mailboxPassagePath } from '../../lib/world-style';
import { MAILBOX_SPRITES } from '../../lib/mailbox-sprites';
import {
  MailboxShell,
  MailboxInterior,
  MailboxDoor,
  MailboxFlag,
} from './MailboxParts';
import { useSpriteMotion } from '../../hooks/use-sprite-motion';

function MailboxPassageClip({ id }: { id: string }) {
  return (
    <clipPath id={id} clipPathUnits="userSpaceOnUse">
      <path d={mailboxPassagePath()} />
    </clipPath>
  );
}

// One untrimmed raster and one aspect ratio in the cavity and in flight.
export function MailboxEnvelope({
  x,
  y,
  width,
  height,
  className = '',
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <image
      className={`mailbox-paint ${className}`}
      href={MAILBOX_SPRITES.letter}
      x={x}
      y={y}
      width={width}
      height={height}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function Mailbox({
  mail = false,
  open = false,
  age = 0,
  ajar = false,
  door,
  showLetter = mail,
  doorProgress,
  flagProgress,
  retrieving = false,
  flagVisible = true,
  letterX = MAILBOX_ART.stored.x,
  letterClassName = '',
}: {
  mail?: boolean;
  open?: boolean;
  age?: number;
  ajar?: boolean;
  door?: 'open' | 'closed';
  showLetter?: boolean;
  doorProgress?: number;
  flagProgress?: number;
  retrieving?: boolean;
  flagVisible?: boolean;
  /** Envelope left edge in the mailbox's own viewBox, including extraction. */
  letterX?: number;
  letterClassName?: string;
}) {
  const passage = useId();
  const doorOpen = open || (door ? door === 'open' : ajar || !mail);
  const animatedDoor = useSpriteMotion(doorOpen);
  const animatedFlag = useSpriteMotion(mail, 480);
  return (
    <svg
      overflow="visible"
      className={`mailbox-art reference-mailbox ${mail ? 'has-mail flag-up' : ''} ${open ? 'is-opening letter-reading' : ''} ${retrieving ? 'is-retrieving' : ''} ${doorOpen ? 'door-open' : 'door-closed'}`}
      viewBox={`0 0 ${MAILBOX_ART.width} ${MAILBOX_ART.height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-mailbox-state={`${doorOpen ? 'open' : 'closed'}-${mail ? 'up' : 'down'}`}
      data-age={age}
      style={
        {
          '--mailbox-exit-x': `${MAILBOX_ART.exitX - MAILBOX_ART.stored.x}px`,
        } as CSSProperties
      }
    >
      <defs>
        <MailboxPassageClip id={passage} />
      </defs>
      <MailboxInterior />
      {showLetter && (
        <g clipPath={`url(#${passage})`}>
          <g className={`mailbox-letter ${letterClassName}`}>
            <MailboxEnvelope {...MAILBOX_ART.stored} x={letterX} />
          </g>
        </g>
      )}
      <MailboxShell foreground />
      <MailboxDoor progress={doorProgress ?? animatedDoor} />
      {flagVisible && <MailboxFlag progress={flagProgress ?? animatedFlag} />}
    </svg>
  );
}

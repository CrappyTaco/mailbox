import {
  MAILBOX_SHELL,
  MAILBOX_SPRITES,
  mailboxSpriteFrame,
} from '../../lib/mailbox-sprites';

function Sprite({
  source,
  frame,
  master = false,
}: {
  source: string;
  frame?: number;
  master?: boolean;
}) {
  const { x, y, width, height, scale } = master
    ? MAILBOX_SHELL
    : MAILBOX_SPRITES;
  const { frames } = MAILBOX_SPRITES;
  return (
    <svg
      x={x}
      y={y}
      width={width * scale}
      height={height * scale}
      viewBox={`${(frame ?? 0) * width} 0 ${width} ${height}`}
      overflow="hidden"
      preserveAspectRatio="xMinYMin meet"
    >
      <image
        href={source}
        width={frame === undefined ? width : width * frames}
        height={height}
        style={{ imageRendering: 'pixelated' }}
      />
    </svg>
  );
}

export function MailboxInterior() {
  return (
    <g className="mailbox-interior mailbox-paint">
      <Sprite source={MAILBOX_SPRITES.interior} master />
    </g>
  );
}

export function MailboxShell({ foreground = false }: { foreground?: boolean }) {
  return (
    <g className="mailbox-shell mailbox-paint">
      <Sprite
        source={foreground ? MAILBOX_SPRITES.exterior : MAILBOX_SPRITES.shell}
        master
      />
    </g>
  );
}

export function MailboxDoor({ progress }: { progress: number }) {
  const frame = mailboxSpriteFrame(progress);
  return (
    <g
      className="mailbox-hinged-door mailbox-paint"
      data-door-progress={progress.toFixed(3)}
      data-door-frame={frame}
    >
      <Sprite source={MAILBOX_SPRITES.doors} frame={frame} master />
    </g>
  );
}

export function MailboxFlag({ progress }: { progress: number }) {
  const frame = mailboxSpriteFrame(progress);
  return (
    <g
      className="mailbox-pivot-flag mailbox-paint"
      data-flag-progress={progress.toFixed(3)}
      data-flag-frame={frame}
    >
      <Sprite source={MAILBOX_SPRITES.flags} frame={frame} />
    </g>
  );
}

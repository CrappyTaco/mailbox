import {
  EnvelopeBack,
  EnvelopeFront,
  EnvelopeFlap,
  ENVELOPE_ART,
} from '../letter/EnvelopeArt';
import type { CSSProperties } from 'react';
export function PixelHeart({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 12 11"
      shapeRendering="crispEdges"
    >
      <path
        fill="var(--paint-b9656e, #b9656e)"
        d="M1 1h4v1h2V1h4v1h1v4h-1v1h-1v1H9v1H8v1H7v1H5v-1H4V9H3V8H2V7H1V6H0V2h1Z"
      />
      <path fill="var(--paint-df9697, #df9697)" d="M2 2h2v1h1v2H2Z" />
    </svg>
  );
}
export function Envelope({
  className = '',
  x,
  y,
  width,
  height,
}: {
  className?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={ENVELOPE_ART.viewBox}
      x={x}
      y={y}
      width={width}
      height={height}
      shapeRendering="crispEdges"
    >
      <EnvelopeBack />
      <EnvelopeFront />
      <g className="envelope-flap">
        <EnvelopeFlap />
      </g>
    </svg>
  );
}
export function Flower({
  x = 0,
  y = 0,
  color = '#df8b96',
  delay = 0,
  size = 1,
}: {
  x?: number;
  y?: number;
  color?: string;
  delay?: number;
  size?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <g
        className="flower-sway"
        style={{ '--delay': `${delay}s` } as CSSProperties}
      >
        <path
          fill="var(--paint-536d47, #536d47)"
          d="M5 5h2v15H5ZM1 11h2v2h3v3H3v-2H1Zm6 4h3v-2h3v3h-2v2H7Z"
        />
        <path
          fill="var(--paint-6e8460, #6e8460)"
          d="M3 1h6v2h3v6H9v3H3V9H0V3h3Z"
        />
        <path
          fill={`var(--paint-${color.slice(1)}, ${color})`}
          d="M4 0h4v4h4v4H8v4H4V8H0V4h4Z"
        />
        <path
          fill="var(--paint-fff2d6, #fff2d6)"
          d="M4 3h4v1h1v4H8v1H4V8H3V4h1Z"
        />
        <path fill="var(--paint-d1a55f, #d1a55f)" d="M5 4h2v3H4V5h1Z" />
      </g>
    </g>
  );
}
export function Landscape({
  compact = false,
  style,
}: {
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`landscape ${compact ? 'landscape-mobile' : 'landscape-desktop'}`}
      style={style}
      aria-hidden="true"
      viewBox={compact ? '140 -330 360 800' : '0 0 640 360'}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
    >
      <image
        className="world-ground-art"
        href="/world/landscape.png"
        x={0}
        y={0}
        width={640}
        height={360}
      />
      {compact && (
        <rect
          className="ground-extension"
          x={0}
          y={359}
          width={640}
          height={230}
          fill="#526449"
        />
      )}
      {[
        [225, 260],
        [382, 268],
      ].map(([x, y]) => (
        <image
          key={x}
          className="world-ground-art"
          href="/world/flowers.png"
          x={x}
          y={y}
          width={32}
          height={34}
        />
      ))}
    </svg>
  );
}

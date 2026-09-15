import { useId, type CSSProperties } from 'react';
import { ReferenceCrop, WORLD_CAMERA } from './ReferenceArt';
import { TARGET_MASKS } from '../../lib/target-masks';
import { celestialPosition, localTime, WORLD_CONFIG } from '@/lib/world-time';

export function WorldSky({ hour }: { hour: number; night: number }) {
  const glow = useId();
  return (
    <svg
      className="world-sky reference-sky"
      viewBox={WORLD_CAMERA.viewBox}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <defs>
        <radialGradient id={glow}>
          <stop stopColor="#fae6bd" stopOpacity=".12" />
          <stop offset="1" stopColor="#fae6bd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g
        data-sky-layer="stars"
        opacity="var(--reference-night, 0)"
        className="reference-star"
      >
        <ReferenceCrop path={TARGET_MASKS.stars} />
      </g>
      <g data-sky-layer="clouds">
        {TARGET_MASKS.clouds.map((path, i) => (
          <g
            key={i}
            className="reference-cloud"
            style={
              {
                '--cloud-duration': `${75 + i * 13}s`,
                '--cloud-distance': `${i % 2 ? -10 : 12}px`,
              } as CSSProperties
            }
          >
            <g className="reference-cloud-paint">
              <ReferenceCrop path={path} />
            </g>
          </g>
        ))}
      </g>
      {/* Both celestial bodies paint AFTER the entire cloud group. The separate
        landscape SVG sits above this whole sky, including during transitions. */}
      <g data-sky-layer="celestials">
        {(['sun', 'moon'] as const).map((kind) => {
          const p = celestialPosition(hour, kind);
          const x = 893 - (p.x - 50) * 7.37;
          const y = 154 + (p.y - 12) * 2.054;
          return (
            <g
              key={kind}
              className="reference-celestial"
              data-celestial={kind}
              opacity={p.opacity}
              style={{
                transform: `translate(${Math.round(x) - 606}px, ${Math.round(y) - 257}px)`,
              }}
            >
              <circle cx={606} cy={257} r={87} fill={`url(#${glow})`} />
              {kind === 'moon' ? (
                <ReferenceCrop path={TARGET_MASKS.moon} />
              ) : (
                <image
                  className="sun-radiance"
                  href="/world/sun.png"
                  x={556}
                  y={207}
                  width={100}
                  height={100}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
export function WorldClock({ instant }: { instant: number }) {
  return (
    <aside
      className="world-clock"
      aria-label="Current time in Bangkok and Seattle"
    >
      {(['indi', 'auggie'] as const).map((id) => (
        <div key={id}>
          <span>{WORLD_CONFIG[id].locationLabel}</span>
          <time
            dateTime={new Date(instant).toISOString()}
            aria-label={`${WORLD_CONFIG[id].locationLabel} ${localTime(id, instant).label}`}
          >
            {localTime(id, instant).label}
          </time>
        </div>
      ))}
    </aside>
  );
}

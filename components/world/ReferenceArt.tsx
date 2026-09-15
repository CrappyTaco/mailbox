import { useId, type ReactNode } from 'react';
import { TARGET_MASKS } from '../../lib/target-masks';
export const WORLD_CAMERA = { viewBox: '0 0 1786 880' } as const;
export const REFERENCE = {
  width: 1786,
  height: 880,
  mailboxX: 796,
  mailboxY: 425,
  scale: 2,
};
export type ReferenceTone = 'day' | 'night';
// Compatibility for the older standalone parts renderer.
export const DOOR_CROP =
  'M805 567H820V569H848V572H875V579L819 615H805V618H771V615H761V612H755V599Z';

export function ReferenceImage({
  tone = 'night',
  clean = false,
}: {
  tone?: ReferenceTone;
  clean?: boolean;
}) {
  return (
    <image
      className={tone === 'day' ? 'reference-day-paint' : undefined}
      href={`/world/reference/${clean ? 'target-clean' : 'target'}.png`}
      width={1786}
      height={clean ? 881 : 880}
      preserveAspectRatio="xMinYMin meet"
    />
  );
}
export function ReferenceCrop({
  path,
  tone = 'night',
  clean = false,
}: {
  path: string;
  tone?: ReferenceTone;
  clean?: boolean;
}) {
  const id = useId();
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={path} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <ReferenceImage tone={tone} clean={clean} />
      </g>
    </g>
  );
}
export function ReferenceLighting({
  children,
  separate = false,
}: {
  children: (tone: ReferenceTone) => ReactNode;
  separate?: boolean;
}) {
  return (
    <>
      <g opacity={separate ? 'calc(1 - var(--reference-night, 0))' : undefined}>
        {children('day')}
      </g>
      <g className="reference-night" opacity="var(--reference-night, 0)">
        {children('night')}
      </g>
    </>
  );
}
export function ReferenceWordmark() {
  return (
    <svg viewBox="47 37 246 33" aria-hidden="true">
      <ReferenceCrop path={TARGET_MASKS.title} />
    </svg>
  );
}
// Original pixels cover the plate everywhere except scenery exposed by moving
// parts and the replaced clock. Sky and moving objects never live in this layer.
export function ReferenceLandscape() {
  const terrain = useId(),
    original = useId();
  return (
    <svg
      className="world-landscape reference-landscape"
      shapeRendering="crispEdges"
      viewBox={WORLD_CAMERA.viewBox}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={terrain}>
          <path d={TARGET_MASKS.terrain} />
        </clipPath>
        <clipPath id={original}>
          <path
            clipRule="evenodd"
            d={`M0 0H1786V880H0Z M752 596L804 566L879 571L880 582L819 618H771L752 609Z M1518 752H1762V848H1518Z M803 475L848 470L946 463L981 492V560L914 575V716H871V580H803Z ${TARGET_MASKS.clouds.join(' ')}`}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${terrain})`}>
        <ReferenceLighting>
          {(tone) => (
            <g>
              <ReferenceImage tone={tone} clean />
              <g clipPath={`url(#${original})`}>
                <ReferenceImage tone={tone} />
              </g>
            </g>
          )}
        </ReferenceLighting>
      </g>
    </svg>
  );
}
